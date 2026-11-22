// Admin-only: runs each start.gg lookup behind My sets and "I signed up" for the signed-in admin's
// linked account and shows what start.gg answers, to find which one misses an event. Optional
// ?event=tournament/<slug>/event/<slug> also asks start.gg about that event directly. Read-only.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isSiteAdmin } from "@/lib/scenes";
import { SUPPORTED_GAME_IDS, startggQuery } from "@/lib/startgg";
import { createClient, getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "start.gg check", robots: { index: false } };

type Named = { name?: string; slug?: string; startAt?: number; state?: string | null; tournament?: { slug?: string } | null; events?: Named[] | null; userEntrant?: { id: string } | null };

async function attempt<T>(label: string, run: () => Promise<T>): Promise<{ label: string; ok: boolean; out: unknown }> {
  try {
    return { label, ok: true, out: await run() };
  } catch (e) {
    return { label, ok: false, out: e instanceof Error ? e.message : String(e) };
  }
}

const day = (t?: number) => (t ? new Date(t * 1000).toISOString().slice(0, 10) : "?");

async function Check({ searchParams }: { searchParams: PageProps<"/admin/startgg-check">["searchParams"] }) {
  const userId = await getUserId();
  if (!(await isSiteAdmin(userId))) notFound();
  const supabase = await createClient();
  const { data: link } = await supabase.from("startgg_links").select("startgg_user_id, startgg_player_id, gamer_tag").eq("user_id", userId!).maybeSingle();
  if (!link) return <p className="p-6">This account isn&apos;t linked to start.gg.</p>;
  const u = Number(link.startgg_user_id);
  const p = String(link.startgg_player_id);
  const { event } = await searchParams;
  const eventSlug = typeof event === "string" && /^tournament\/[\w-]+\/event\/[\w-]+$/.test(event) ? event : "tournament/texas-arcadian-league-season-2/event/division-3";

  const EV = "id name startAt state tournament { slug } userEntrant(userId: $u) { id }";
  const T = (filter: string, extra = "") => `tournaments(query: { page: 1, perPage: 8${extra}${filter ? `, filter: { ${filter} }` : ""} }) { nodes { name slug startAt events { ${EV} } } }`;
  const checks = await Promise.all([
    attempt("user.events (My sets, first 12)", async () => {
      const d = await startggQuery<{ user: { events: { nodes: Named[] } } }>(`query($u: ID!, $g: [ID]) { user(id: $u) { events(query: { page: 1, perPage: 12, filter: { videogameId: $g } }) { nodes { ${EV} } } } }`, { u, g: SUPPORTED_GAME_IDS });
      return d.user.events.nodes.map((e) => `${day(e.startAt)} ${e.state} ${e.tournament?.slug} · ${e.name}${e.userEntrant ? " ✓" : ""}`);
    }),
    ...([
      ["user.tournaments upcoming", "upcoming: true, past: false", ""],
      ["user.tournaments past", "past: true", ""],
      ["user.tournaments sortBy startAt desc", "", ', sortBy: "startAt desc"'],
      ["user.tournaments no filter", "", ""],
    ] as const).map(([label, filter, extra]) =>
      attempt(label, async () => {
        const d = await startggQuery<{ user: { tournaments: { nodes: Named[] } } }>(`query($u: ID!) { user(id: $u) { ${T(filter, extra)} } }`, { u });
        return d.user.tournaments.nodes.map((t) => `${day(t.startAt)} ${t.slug} · entered: ${(t.events ?? []).filter((e) => e.userEntrant).map((e) => e.name).join(", ") || "none"}`);
      }),
    ),
    attempt("player.sets (25)", async () => {
      const d = await startggQuery<{ player: { sets: { nodes: { state: number | null; event: Named | null }[] } | null } | null }>(
        `query($p: ID!) { player(id: $p) { sets(page: 1, perPage: 25) { nodes { state event { name startAt tournament { slug } } } } } }`,
        { p },
      );
      return (d.player?.sets?.nodes ?? []).map((s) => `${day(s.event?.startAt)} state ${s.state} ${s.event?.tournament?.slug} · ${s.event?.name}`);
    }),
    attempt(`event ${eventSlug}`, async () => {
      const d = await startggQuery<{ event: Named | null }>(`query($s: String!, $u: ID!) { event(slug: $s) { ${EV} } }`, { s: eventSlug, u });
      return d.event ? `${d.event.name} · ${day(d.event.startAt)} · state ${d.event.state} · userEntrant ${d.event.userEntrant ? d.event.userEntrant.id : "none"}` : "not found";
    }),
  ]);

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      <h1 className="text-xl font-bold">start.gg check</h1>
      <p className="text-muted">{link.gamer_tag} · user {u} · player {p}</p>
      {checks.map((c) => (
        <section key={c.label} className="card flex flex-col gap-1 p-3">
          <h2 className={`font-semibold ${c.ok ? "" : "text-danger"}`}>{c.label}{c.ok ? "" : " (failed)"}</h2>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs">{Array.isArray(c.out) ? (c.out.length ? c.out.join("\n") : "(nothing)") : String(c.out)}</pre>
        </section>
      ))}
    </div>
  );
}

export default function StartggCheck(props: PageProps<"/admin/startgg-check">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Asking start.gg…</p>}>
      <Check searchParams={props.searchParams} />
    </Suspense>
  );
}
