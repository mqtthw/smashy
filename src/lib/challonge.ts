// Challonge API (v2.1) for copying finished hosted brackets there, so ranking sites like Braacket can
// import them (Braacket imports start.gg and Challonge links only). Tournaments belong to Smashy's
// Challonge app. Free plan: 500 requests a month, so each copy is counted and kept small (one
// request per set plus one per round to see which matches opened).
import "server-only";
import type { EngineSet } from "./bracketEngine";
import { matchReport, pickSet } from "./challongeMirror";
import { siteUrl } from "./siteMeta";

const BASE = "https://api.challonge.com/v2.1";
const SCOPES = "me tournaments:read tournaments:write matches:read matches:write participants:read participants:write";

export function challongeConfigured(): boolean {
  return !!process.env.CHALLONGE_CLIENT_ID && !!process.env.CHALLONGE_CLIENT_SECRET;
}

let cached: { token: string; until: number } | null = null;
async function token(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  const res = await fetch("https://api.challonge.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.CHALLONGE_CLIENT_ID ?? "", client_secret: process.env.CHALLONGE_CLIENT_SECRET ?? "", scope: SCOPES }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Challonge sign-in failed (${res.status}).`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: Date.now() + Math.max(60, j.expires_in - 3600) * 1000 };
  return j.access_token;
}

type Json = Record<string, unknown>;
async function api<T = Json>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/vnd.api+json", Accept: "application/json", "Authorization-Type": "v2", Authorization: `Bearer ${await token()}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 429) throw new Error("Smashy's Challonge allowance for this month is used up. Try again next month.");
  const text = await res.text();
  if (!res.ok) {
    console.error("Challonge", method, path.replace(/\d{5,}/g, ":id"), res.status, text.slice(0, 300));
    throw new Error(`Challonge said no (${res.status}).`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

type Match = { id: string; attributes: { state: string; points_by_participant: { participant_id: number }[] } };

export type CopyInput = {
  name: string;
  gameName: string;
  format: "double_elim" | "single_elim" | "round_robin"; // round robin: one pool only (everyone plays everyone once)
  startsAt: string;
  players: { id: string; tag: string; seed: number }[]; // seed order the bracket was built from
  sets: EngineSet[];
};

const TOURNAMENT_TYPE = { double_elim: "double elimination", single_elim: "single elimination", round_robin: "round robin" } as const;

/** Copy a finished bracket (elimination, or a one-pool round robin) to Challonge. Returns the public Challonge link. */
export async function copyToChallonge(input: CopyInput): Promise<string> {
  const created = await api<{ data: { id: string; attributes: { full_challonge_url: string } } }>("POST", "/tournaments.json", {
    data: {
      type: "tournament",
      attributes: {
        name: input.name.slice(0, 60),
        url: `smashy_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        tournament_type: TOURNAMENT_TYPE[input.format],
        game_name: input.gameName,
        private: false,
        starts_at: input.startsAt,
        description: `Played on Smashy (${siteUrl().host}). Results copied from Smashy.`,
        notifications: { upon_matches_open: false, upon_tournament_ends: false },
        // No grand_finals_modifier: Challonge's default plays the reset when the losers side wins, like Smashy.
        // Challonge refuses a round robin without these: everyone meets once, ranked by sets won.
        ...(input.format === "round_robin"
          ? { round_robin_options: { iterations: 1, ranking: "match wins", pts_for_game_win: 1, pts_for_game_tie: 0, pts_for_match_win: 1, pts_for_match_tie: 0.5 } }
          : {}),
      },
    },
  });
  const tid = created.data.id;
  try {
    // Players, 20 per request (Challonge's limit), in seed order.
    const toChallonge = new Map<string, string>();
    const toSmashy = new Map<string, string>();
    for (let i = 0; i < input.players.length; i += 20) {
      const batch = input.players.slice(i, i + 20);
      const res = await api<{ data: { id: string; attributes: { misc: string } }[] }>("POST", `/tournaments/${tid}/participants/bulk_add.json`, {
        data: { type: "Participants", attributes: { participants: batch.map((p) => ({ name: p.tag.slice(0, 60), seed: p.seed, misc: p.id })) } },
      });
      for (const p of res.data) {
        toChallonge.set(p.attributes.misc, p.id);
        toSmashy.set(String(p.id), p.attributes.misc);
      }
    }
    await api("PUT", `/tournaments/${tid}/change_state.json`, { data: { type: "TournamentState", attributes: { state: "start" } } });

    // Round by round: report every open match with its Smashy result, then see what opened next.
    const copied = new Set<string>();
    const dqd = new Set<string>();
    const total = input.sets.filter((s) => s.state === "done" && s.p[0].id && s.p[1].id).length;
    for (let wave = 0; wave < 64 && copied.size < total; wave++) {
      const list = await api<{ data: Match[] }>("GET", `/tournaments/${tid}/matches.json?per_page=100&state=open`);
      const open = list.data.filter((m) => m.attributes.state === "open");
      if (!open.length) break;
      for (const m of open) {
        const [a, b] = m.attributes.points_by_participant.map((p) => toSmashy.get(String(p.participant_id)) ?? "");
        const set = pickSet(input.sets, copied, a, b);
        if (!set) throw new Error("Challonge's bracket didn't match Smashy's, so the copy was stopped.");
        copied.add(set.key);
        await api("PUT", `/tournaments/${tid}/matches/${m.id}.json`, {
          data: { type: "match", attributes: { match: matchReport(set, (id) => toChallonge.get(id)!) } },
        });
        // A DQ'd player is out of the event on Smashy (no losers run). On Challonge they'd drop to
        // losers, so remove them there too: Challonge then forfeits their remaining matches.
        // (Not in a round robin: there a DQ only decides that one set, on Smashy and on Challonge.)
        const dq = input.format === "round_robin" ? undefined : ([0, 1] as const).find((i) => set.score[i] === -1);
        if (dq !== undefined && !dqd.has(set.p[dq].id!)) {
          dqd.add(set.p[dq].id!);
          await api("DELETE", `/tournaments/${tid}/participants/${toChallonge.get(set.p[dq].id!)}.json`);
        }
      }
    }
    await api("PUT", `/tournaments/${tid}/change_state.json`, { data: { type: "TournamentState", attributes: { state: "finalize" } } });
    return created.data.attributes.full_challonge_url;
  } catch (e) {
    // Don't leave a half-copied bracket on Challonge: back to pending, then delete.
    await api("PUT", `/tournaments/${tid}/change_state.json`, { data: { type: "TournamentState", attributes: { state: "reset" } } }).catch(() => {});
    await api("DELETE", `/tournaments/${tid}.json`).catch(() => {});
    throw e;
  }
}
