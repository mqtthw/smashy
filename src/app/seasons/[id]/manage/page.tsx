// Running a season (its admins only): settings and points, the events that count, players' names and
// merges, co-admins, and deleting it. Plain forms: each change saves and comes back here with a note.
import { getSavedRecentTournaments } from "@/lib/events";
import { regionName } from "@/lib/regions";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAMES } from "@/lib/games";
import type { MessageKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";
import { canManageSeason, getSeason, getSeasonAdmins, getSeasonEvents, getSeasonOverrides, getStandings, myFinishedBrackets } from "@/lib/seasons";
import { writePointsTable } from "@/lib/seasonsMath";
import { getUserId } from "@/lib/supabase/server";
import { addSeasonAdmin, addSeasonEvent, deleteSeason, removeSeasonAdmin, saveSeasonPlayer, saveSeasonSettings, updateSeasonEvent } from "../../actions";
import { dayLabel, RegionField } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.manageSeason"), robots: { index: false } };
}

const ERRORS: Record<string, MessageKey> = {
  name: "season.err.name", dates: "season.err.dates", points: "season.err.points", bestOf: "season.err.bestOf", minEvents: "season.err.minEvents",
  save: "season.err.save", tooManyEvents: "season.err.tooManyEvents", badLink: "season.err.badLink", pickEvent: "season.err.pickEvent",
  notFinished: "season.err.notFinished", wrongGame: "season.err.wrongGame", teams: "season.err.teams", notFound: "season.err.notFound",
  startggDown: "season.err.startggDown", tooBig: "season.err.tooBig", empty: "season.err.empty", already: "season.err.already", weight: "season.err.weight",
  playerName: "season.err.playerName", noMember: "season.err.noMember", tooManyAdmins: "season.err.tooManyAdmins", ownerOnly: "season.err.ownerOnly",
  confirmDelete: "season.err.confirmDelete",
};
const NOTES: Record<string, MessageKey> = {
  created: "season.msg.created", saved: "season.msg.saved", eventAdded: "season.msg.eventAdded", eventRemoved: "season.msg.eventRemoved", adminAdded: "season.msg.adminAdded", adminInvited: "season.msg.adminInvited", inviteAccepted: "season.msg.inviteAccepted",
};

const h2 = "text-lg font-bold scroll-mt-4";
// Doubles can't count toward a season yet, so they aren't suggested.
const DOUBLES = /doubles|dubs|2v2|teams/i;

async function Manage({ params, searchParams }: { params: PageProps<"/seasons/[id]/manage">["params"]; searchParams: PageProps<"/seasons/[id]/manage">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const season = await getSeason(id);
  if (!season || season.removed) notFound();
  const userId = await getUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/seasons/${id}/manage`)}`);
  if (!(await canManageSeason(season, userId))) redirect(`/seasons/${id}`);
  const [t, lang, admins, events, overrides, mine] = await Promise.all([
    getT(), getLang(), getSeasonAdmins(season, true), getSeasonEvents(season.id), getSeasonOverrides(season.id), myFinishedBrackets(userId, season.game),
  ]);
  const rows = await getStandings(season, events, userId);
  const nameOf = new Map(rows.map((r) => [r.key, r.name]));
  for (const e of events) for (const r of e.results) if (!nameOf.has(r.key)) nameOf.set(r.key, r.name);
  const added = new Set(events.filter((e) => e.source === "smashy").map((e) => e.ref));
  const pickable = mine.filter((b) => !added.has(b.id));
  // Finished start.gg events in the season's region and game, during the season, not added yet (from the saved list).
  const addedSgg = new Set(events.filter((e) => e.source === "startgg").map((e) => e.ref));
  const from = Date.parse(`${season.startsOn}T00:00:00Z`) / 1000;
  const to = Date.parse(`${season.endsOn}T23:59:59Z`) / 1000;
  const recent = season.region
    ? (await getSavedRecentTournaments(season.region).catch(() => []))
        .flatMap((tour) => tour.events.filter((e) => e.game === season.game && (e.numEntrants ?? 0) > 1 && !DOUBLES.test(e.name)).map((e) => ({ id: String(e.id), name: `${tour.name}: ${e.name}`, at: e.startAt ?? tour.startAt, players: e.numEntrants ?? 0 })))
        .filter((e) => e.at >= from && e.at <= to && !addedSgg.has(e.id))
        .sort((a, b) => b.at - a.at)
        .slice(0, 8)
    : [];
  const offered = typeof sp.add === "string" && pickable.some((b) => b.id === sp.add) ? sp.add : "";
  const merged = overrides.filter((o) => o.mergedInto);
  const leftOut = overrides.filter((o) => o.leftOut && !o.mergedInto);
  const isOwner = season.ownerId === userId;
  const err = typeof sp.err === "string" ? ERRORS[sp.err] : undefined;
  const msg = typeof sp.msg === "string" ? NOTES[sp.msg] : undefined;
  const hidden = <input type="hidden" name="id" value={season.id} />;

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link href={`/seasons/${season.id}`} className="text-sm text-muted hover:underline">← {season.name}</Link>
        <h1 className="text-2xl font-bold">{t("season.manage")}</h1>
        <p className="text-sm text-muted">{GAMES[season.game].name}</p>
      </header>
      {err && <p role="alert" className="rounded-lg bg-surface p-3 text-sm text-danger">{t(err)}</p>}
      {msg && <p role="status" className="rounded-lg bg-surface p-3 text-sm">{t(msg)}</p>}

      {/* ---------- Events ---------- */}
      <section id="events" aria-labelledby="events-h" className="flex flex-col gap-3">
        <h2 id="events-h" className={h2}>{t("season.events", { n: events.length })}</h2>
        <form action={addSeasonEvent} className="card flex flex-col gap-3 p-4">
          {hidden}
          <p className="font-semibold">{t("season.add.title")}</p>
          {offered && <p className="text-sm text-brand">{t("season.add.offered")}</p>}
          {pickable.length > 0 && (
            <label className="flex flex-col gap-1 text-sm">
              <span>{t("season.add.mine")}</span>
              <select name="hosted" defaultValue={offered} className="field">
                <option value="">{t("season.add.none")}</option>
                {pickable.map((b) => <option key={b.id} value={b.id}>{b.name} · {dayLabel(b.startsAt.slice(0, 10), lang)}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("season.add.link")}</span>
            <input name="link" inputMode="url" autoComplete="off" placeholder="https://start.gg/tournament/…/event/…" className="field" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span>{t("season.add.weight")}</span>
            <input name="weight" type="number" min={0.25} max={5} step={0.25} defaultValue={1} className="field w-24" />
          </label>
          <p className="text-meta text-muted">{t("season.add.help")}</p>
          <button className="btn btn-md btn-primary self-start">{t("season.add.button")}</button>
        </form>
        {recent.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t("season.add.recent", { region: regionName(season.region!) })}</p>
            <ul className="card divide-y divide-line text-sm">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{e.name}</span>
                    <span className="text-meta text-muted">{dayLabel(new Date(e.at * 1000).toISOString().slice(0, 10), lang)} · {t("season.entrants", { n: e.players })}</span>
                  </span>
                  <form action={addSeasonEvent}>
                    {hidden}
                    <input type="hidden" name="sgg_event" value={e.id} />
                    <button className="btn btn-sm btn-outline">{t("season.add.one")}</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
        {events.length > 0 && (
          <ul className="card divide-y divide-line text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{e.name}</span>
                  <span className="text-meta text-muted">{dayLabel(e.heldOn, lang)} · {t("season.entrants", { n: e.entrants ?? e.results.length })} · {e.source === "smashy" ? "Smashy" : "start.gg"}</span>
                </span>
                <form action={updateSeasonEvent} className="flex flex-wrap items-center gap-2">
                  {hidden}
                  <input type="hidden" name="event" value={e.id} />
                  <label className="flex items-center gap-1">
                    <span className="text-muted">{t("season.add.weight")}</span>
                    <input name="weight" type="number" min={0.25} max={5} step={0.25} defaultValue={e.weight} className="field w-20 py-1" />
                  </label>
                  <button className="btn btn-sm btn-outline">{t("season.save")}</button>
                  <button name="remove" value="1" className="btn btn-sm btn-outline text-danger">{t("season.remove")}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Players ---------- */}
      <section id="players" aria-labelledby="players-h" className="flex flex-col gap-3">
        <h2 id="players-h" className={h2}>{t("season.players.title")}</h2>
        <p className="text-sm text-muted">{t("season.players.help")}</p>
        {rows.length > 1 && (
          <form action={saveSeasonPlayer} className="card flex flex-col gap-2 p-4 text-sm">
            {hidden}
            <p className="font-semibold">{t("season.players.merge")}</p>
            <select name="key" required defaultValue="" className="field" aria-label={t("season.players.this")}>
              <option value="" disabled>{t("season.players.this")}</option>
              {rows.map((r) => <option key={r.key} value={r.key}>{r.name} ({r.events})</option>)}
            </select>
            <select name="merged_into" required defaultValue="" className="field" aria-label={t("season.players.into")}>
              <option value="" disabled>{t("season.players.into")}</option>
              {rows.map((r) => <option key={r.key} value={r.key}>{r.name} ({r.events})</option>)}
            </select>
            <button className="btn btn-sm btn-outline self-start">{t("season.players.mergeButton")}</button>
          </form>
        )}
        {rows.length > 0 && (
          <ul className="card divide-y divide-line text-sm">
            {rows.map((r) => {
              const o = overrides.find((x) => x.key === r.key);
              return (
                <li key={r.key}>
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-surface">
                      <span className="min-w-0 truncate font-semibold">{r.name}</span>
                      <span className="shrink-0 text-meta text-muted">{t("season.table.eventsShort", { n: r.events })} · {r.key.startsWith("u:") ? "Smashy" : r.key.startsWith("s:") ? "start.gg" : t("season.players.walkIn")}</span>
                    </summary>
                    <form action={saveSeasonPlayer} className="flex flex-col gap-2 px-3 pb-3">
                      {hidden}
                      <input type="hidden" name="key" value={r.key} />
                      <label className="flex flex-col gap-1">
                        <span className="text-muted">{t("season.players.name")}</span>
                        <input name="display_name" maxLength={60} defaultValue={o?.displayName ?? ""} placeholder={r.name} className="field py-1" />
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="left_out" value="1" defaultChecked={!!o?.leftOut} />
                        <span>{t("season.players.leaveOut")}</span>
                      </label>
                      <button className="btn btn-sm btn-outline self-start">{t("season.save")}</button>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        {(merged.length > 0 || leftOut.length > 0) && (
          <ul className="flex flex-col gap-1 text-sm">
            {merged.map((o) => (
              <li key={o.key}>
                <form action={saveSeasonPlayer} className="flex flex-wrap items-center gap-2">
                  {hidden}
                  <input type="hidden" name="key" value={o.key} />
                  <input type="hidden" name="display_name" value={o.displayName ?? ""} />
                  {o.leftOut && <input type="hidden" name="left_out" value="1" />}
                  <span>{t("season.players.mergedLine", { a: nameOf.get(o.key) ?? o.key, b: nameOf.get(o.mergedInto!) ?? o.mergedInto! })}</span>
                  <button className="link">{t("season.players.undo")}</button>
                </form>
              </li>
            ))}
            {leftOut.map((o) => (
              <li key={o.key}>
                <form action={saveSeasonPlayer} className="flex flex-wrap items-center gap-2">
                  {hidden}
                  <input type="hidden" name="key" value={o.key} />
                  <input type="hidden" name="display_name" value={o.displayName ?? ""} />
                  <span>{t("season.players.leftOutLine", { a: nameOf.get(o.key) ?? o.key })}</span>
                  <button className="link">{t("season.players.putBack")}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Settings ---------- */}
      <section id="settings" aria-labelledby="settings-h" className="flex flex-col gap-3">
        <h2 id="settings-h" className={h2}>{t("season.settings")}</h2>
        <form action={saveSeasonSettings} className="card flex flex-col gap-3 p-4 text-sm">
          {hidden}
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t("season.field.name")}</span>
            <input name="name" required minLength={3} maxLength={80} defaultValue={season.name} className="field" />
          </label>
          <RegionField defaultValue={season.region} label={t("season.field.region")} noneLabel={t("season.field.noRegion")} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-semibold">{t("season.field.starts")}</span>
              <input type="date" name="starts_on" required defaultValue={season.startsOn} className="field" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">{t("season.field.ends")}</span>
              <input type="date" name="ends_on" required defaultValue={season.endsOn} className="field" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t("season.field.points")}</span>
            <span className="text-meta text-muted">{t("season.field.pointsHelp")}</span>
            <textarea name="points" rows={8} defaultValue={writePointsTable(season.points)} className="field font-mono" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-semibold">{t("season.field.bestOf")}</span>
              <input name="best_of" type="number" min={1} max={200} defaultValue={season.bestOf ?? ""} placeholder={t("season.field.all")} className="field" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">{t("season.field.minEvents")}</span>
              <input name="min_events" type="number" min={1} max={50} defaultValue={season.minEvents} className="field" />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="visibility" value="unlisted" defaultChecked={season.visibility === "unlisted"} />
            <span>{t("season.field.unlisted")}</span>
          </label>
          <button className="btn btn-md btn-primary self-start">{t("season.save")}</button>
        </form>
      </section>

      {/* ---------- Admins ---------- */}
      <section id="admins" aria-labelledby="admins-h" className="flex flex-col gap-3">
        <h2 id="admins-h" className={h2}>{t("season.admins.title")}</h2>
        <ul className="card divide-y divide-line text-sm">
          {admins.map((a) => (
            <li key={a.userId} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>{a.tag} <span className="text-muted">@{a.handle}</span>{a.owner ? <span className="text-meta text-muted"> · {t("season.admins.creator")}</span> : null}{a.invited ? <span className="text-meta text-muted"> · {t("season.admins.invited")}</span> : null}</span>
              {!a.owner && (isOwner || a.userId === userId) && (
                <form action={removeSeasonAdmin}>
                  {hidden}
                  <input type="hidden" name="user" value={a.userId} />
                  <button className="btn btn-sm btn-outline">{a.userId === userId ? t("season.admins.leave") : a.invited ? t("season.admins.cancelInvite") : t("season.remove")}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={addSeasonAdmin} className="flex gap-2">
          {hidden}
          <input name="handle" required maxLength={40} placeholder={t("season.admins.handle")} aria-label={t("season.admins.handle")} autoComplete="off" className="field min-w-0 flex-1" />
          <button className="btn btn-md btn-outline">{t("season.admins.invite")}</button>
        </form>
      </section>

      {isOwner && (
        <section id="danger" aria-labelledby="danger-h" className="flex flex-col gap-2">
          <h2 id="danger-h" className={h2}>{t("season.delete.title")}</h2>
          <form action={deleteSeason} className="flex flex-col gap-2 text-sm">
            {hidden}
            <label className="flex items-center gap-2">
              <input type="checkbox" name="confirm" value="1" required />
              <span>{t("season.delete.confirm")}</span>
            </label>
            <button className="btn btn-sm btn-outline self-start text-danger">{t("season.delete.button")}</button>
          </form>
        </section>
      )}
    </>
  );
}

export default function ManageSeasonPage(props: PageProps<"/seasons/[id]/manage">) {
  return (
    <section className="flex flex-col gap-6 p-4">
      <Suspense fallback={<CardListSkeleton count={4} />}>
        <Manage params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
