// Very big and very old start.gg events (round 244). Evo 2019 Ultimate has 256 pools in its first
// round, and asked for every pool's start time at once, start.gg failed on all of them (after 13
// seconds) while still sending the rest.
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const reply = (body: unknown) => ({ ok: true, status: 200, statusText: "OK", json: async () => body });
const startAtError = (path: (string | number)[]) => ({ message: "An unknown error has occurred", path });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("startggQuery with fields that are allowed to fail", () => {
  const data = { event: { pools: [{ id: 1, startAt: null }] } };
  const errors = [startAtError(["event", "pools", 0, "startAt"])];
  const onlyStartAt = { ignoreErrorAt: (path: readonly (string | number)[]) => path.at(-1) === "startAt" };

  it("uses the reply when every error is at an allowed field", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ data, errors })));
    const { startggQuery } = await import("@/lib/startgg");
    await expect(startggQuery("{ event }", {}, onlyStartAt)).resolves.toEqual(data);
  });

  it("still fails without that permission", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ data, errors })));
    const { startggQuery } = await import("@/lib/startgg");
    await expect(startggQuery("{ event }", {})).rejects.toThrow(/start\.gg request failed/);
  });

  it("still fails when another field failed too, when an error has no place, or when nothing came back", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const { startggQuery } = await import("@/lib/startgg");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ data, errors: [...errors, startAtError(["event", "pools", 0, "state"])] })));
    await expect(startggQuery("{ event }", {}, onlyStartAt)).rejects.toThrow(/start\.gg request failed/);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ data, errors: [{ message: "Query complexity is too high" }] })));
    await expect(startggQuery("{ event }", {}, onlyStartAt)).rejects.toThrow(/complexity/);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ data: null, errors })));
    await expect(startggQuery("{ event }", {}, onlyStartAt)).rejects.toThrow(/start\.gg request failed/);
  });
});

describe("a start.gg bracket with more pools than one reply holds", () => {
  const pool = (id: number, name: string) => ({ id, displayIdentifier: name, state: 3 });
  const event = {
    id: 328730,
    name: "Ultimate Singles",
    slug: "tournament/big/event/ultimate-singles",
    state: "COMPLETED",
    startAt: 1_564_000_000,
    videogame: { id: 1386 },
    tournament: { name: "Big", slug: "tournament/big", timezone: "America/Los_Angeles", startAt: 1_564_000_000, endAt: 1_564_300_000 },
    phases: [
      { id: 10, name: "Round 1", bracketType: "DOUBLE_ELIMINATION", phaseOrder: 1, phaseGroups: { pageInfo: { totalPages: 2 }, nodes: [pool(101, "A1"), pool(102, "A2")] } },
      { id: 20, name: "Finals", bracketType: "DOUBLE_ELIMINATION", phaseOrder: 2, phaseGroups: { pageInfo: { totalPages: 1 }, nodes: [pool(201, "F1")] } },
    ],
  };
  const eventReply = reply({ data: { event } });
  const page2 = reply({ data: { phase: { phaseGroups: { nodes: [pool(103, "B1")] } } } });
  const noSets = reply({ data: { phaseGroup: { startAt: 1_564_100_000, sets: { pageInfo: { totalPages: 1 }, nodes: [] } } } });
  const sent = (fetchMock: ReturnType<typeof vi.fn>, call: number) => JSON.parse(fetchMock.mock.calls[call][1].body) as { query: string; variables: Record<string, unknown> };

  it("lists every pool, and opens a pool from a later page when the link names it", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(eventReply).mockResolvedValueOnce(page2).mockResolvedValueOnce(noSets);
    vi.stubGlobal("fetch", fetchMock);
    const { getStartggBracket } = await import("@/lib/brackets/startgg");

    const bracket = await getStartggBracket("328730", "103");
    expect(bracket?.event.groups.map((g) => g.id)).toEqual(["101", "102", "103", "201"]);
    expect(bracket?.event.groups[2].label).toBe("Round 1 · Pool B1");
    expect(bracket?.groupId).toBe("103"); // before: not in the list, so the page fell back to the default pool
    expect(bracket?.finished).toBe(true);

    expect(bracket?.poolStartAt).toBe(1_564_100_000);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sent(fetchMock, 0).query).toContain("perPage: 512");
    // Start times are slow and can fail for a whole event's pools at once: only the shown pool's is asked for.
    expect(sent(fetchMock, 0).query).not.toMatch(/nodes \{[^}]*startAt/);
    expect(sent(fetchMock, 1).variables).toEqual({ id: 10, page: 2 }); // only the phase that has a second page
    expect(sent(fetchMock, 2).variables).toEqual({ id: "103", page: 1 });
    expect(sent(fetchMock, 2).query).toMatch(/phaseGroup\(id: \$id\) \{ startAt/);
  });

  it("still shows the bracket when start.gg fails on the shown pool's start time", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const failedTime = reply({ data: { phaseGroup: { startAt: null, sets: { pageInfo: { totalPages: 1 }, nodes: [] } } }, errors: [startAtError(["phaseGroup", "startAt"])] });
    const small = { ...event, phases: event.phases.map((ph) => ({ ...ph, phaseGroups: { ...ph.phaseGroups, pageInfo: { totalPages: 1 } } })) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({ data: { event: small } })).mockResolvedValueOnce(failedTime));
    const { getStartggBracket } = await import("@/lib/brackets/startgg");

    const bracket = await getStartggBracket("328730", "201");
    expect(bracket?.groupId).toBe("201");
    expect(bracket?.poolStartAt).toBeNull(); // a later phase without its own time has none
  });

  it("opens the final bracket of a finished event when no pool is named, with no extra request for single-page phases", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const small = { ...event, phases: event.phases.map((ph) => ({ ...ph, phaseGroups: { ...ph.phaseGroups, pageInfo: { totalPages: 1 } } })) };
    const fetchMock = vi.fn().mockResolvedValueOnce(reply({ data: { event: small } })).mockResolvedValueOnce(noSets);
    vi.stubGlobal("fetch", fetchMock);
    const { getStartggBracket } = await import("@/lib/brackets/startgg");

    const bracket = await getStartggBracket("328730");
    expect(bracket?.groupId).toBe("201");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
