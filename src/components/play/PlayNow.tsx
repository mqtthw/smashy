"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { answerPlayRequest, cancelPlayRequest, playRequestCodes, savePlayCode, setLooking } from "@/app/play/actions";
import Avatar from "@/components/ui/Avatar";
import CopyButton from "@/components/ui/CopyButton";
import LocalTime from "@/components/ui/LocalTime";
import { GAMES } from "@/lib/games";
import { LOOKING_MINUTES, type MyPlaySettings, type PlayFriend, type PlayGame, type PlayRequest } from "@/lib/playGames";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import { useT } from "@/lib/i18n/client";
import AskToPlayButton from "./AskToPlayButton";
import OpenSlippi from "./OpenSlippi";
import { useNow } from "./useNow";

/**
 * The top of the Play tab for "I want to play now": play requests (live), your "Looking to play"
 * switch, your saved code for this game, and friends (people you follow who follow you back).
 */
export default function PlayNow({
  game, myGames, requests, friends, settings, viewerId, serverNow,
}: {
  game: PlayGame | null; // null in General
  myGames: PlayGame[];
  requests: PlayRequest[];
  friends: PlayFriend[];
  settings: MyPlaySettings;
  viewerId: string;
  serverNow: number;
}) {
  const t = useT();
  const router = useRouter();
  const now = useNow(serverNow, 15000);

  // A request to you, or an answer to yours, shows up without reloading.
  useEffect(
    () =>
      subscribeAsUser((supabase) =>
        supabase.channel(`play-requests-${viewerId}`).on("postgres_changes", { event: "*", schema: "public", table: "play_requests" }, () => router.refresh()),
      ),
    [router, viewerId],
  );

  const live = requests.filter((r) => r.status === "accepted" || Date.parse(r.expiresAt) > now);
  const looking = friends.filter((f) => f.lookingGame && f.lookingUntil && Date.parse(f.lookingUntil) > now);
  const others = friends.filter((f) => !looking.includes(f));
  const askGames = (f: PlayFriend): PlayGame[] => {
    const first = f.lookingGame ?? game;
    const rest = myGames.filter((g) => g !== first);
    return first ? [first, ...rest] : rest;
  };

  return (
    <section id="requests" className="card mx-3 mt-3 flex scroll-mt-16 flex-col gap-4 px-4 py-4">
      <h2 className="font-bold">{t("playnow.title")}</h2>

      {live.length > 0 && (
        <ul className="flex flex-col gap-2">
          {live.map((r) => <RequestRow key={r.id} r={r} now={now} />)}
        </ul>
      )}

      <LookingSwitch game={game ?? myGames[0] ?? "melee"} settings={settings} />
      {game && <MyCode game={game} saved={settings.codes[game] ?? ""} />}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("playnow.friends.title")}</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-muted">{t("playnow.friends.none")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {[...looking, ...others].slice(0, 30).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link href={`/u/${f.handle}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar name={f.tag} src={f.avatarUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{f.tag}</span>
                    {looking.includes(f) && f.lookingGame && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-success" />
                        {t("playnow.friends.looking", { game: GAMES[f.lookingGame].short })}
                      </span>
                    )}
                  </span>
                </Link>
                {askGames(f).length > 0 && <AskToPlayButton to={f.id} games={askGames(f)} className={looking.includes(f) ? "btn btn-sm btn-primary" : "btn btn-sm btn-outline"} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function RequestRow({ r, now }: { r: PlayRequest; now: number }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const game = GAMES[r.game].short;
  const minsLeft = Math.min(15, Math.max(1, Math.round((Date.parse(r.expiresAt) - now) / 60000)));
  const answer = (accept: boolean) =>
    startTransition(async () => {
      const res = await answerPlayRequest(r.id, accept);
      if (res.error) setError(res.error);
    });

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <p className="flex items-center gap-2 text-sm">
        <Avatar name={r.other.tag} src={r.other.avatarUrl} size="sm" />
        <span className="min-w-0 flex-1">
          {r.status === "accepted"
            ? t("playnow.req.ready", { who: r.other.tag, game })
            : r.incoming
              ? t("playnow.req.incoming", { who: r.other.tag, game })
              : t("playnow.req.outgoing", { who: r.other.tag, game })}
          {r.status === "pending" && <span className="text-muted"> · {t("playnow.req.minsLeft", { n: minsLeft })}</span>}
        </span>
      </p>
      {r.status === "pending" && r.incoming && (
        <span className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => answer(true)} className="btn btn-sm btn-primary">{t("playnow.req.accept")}</button>
          <button type="button" disabled={pending} onClick={() => answer(false)} className="btn btn-sm btn-outline">{t("playnow.req.decline")}</button>
        </span>
      )}
      {r.status === "pending" && !r.incoming && (
        <button type="button" disabled={pending} onClick={() => startTransition(() => cancelPlayRequest(r.id))} className="self-start text-xs text-muted underline">
          {t("playnow.req.cancel")}
        </button>
      )}
      {r.status === "accepted" && <Codes r={r} />}
      {error && <p className="text-sm text-danger">{error}</p>}
    </li>
  );
}

/** After a yes: their code (to type in) and yours (so you can check they have the right one). */
function Codes({ r }: { r: PlayRequest }) {
  const t = useT();
  const [codes, setCodes] = useState<{ theirs: string | null; mine: string | null } | null>(null);
  useEffect(() => {
    playRequestCodes(r.id).then((c) => setCodes(c ? { theirs: r.incoming ? c.from : c.to, mine: r.incoming ? c.to : c.from } : { theirs: null, mine: null }), () => setCodes({ theirs: null, mine: null }));
  }, [r.id, r.incoming]);
  if (!codes) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {codes.theirs ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-muted">{t("playnow.req.theirCode", { who: r.other.tag })}</span>
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-base">{codes.theirs}</code>
          <CopyButton text={codes.theirs} />
          {r.game === "melee" && <OpenSlippi code={codes.theirs} />}
        </span>
      ) : (
        <span className="text-muted">
          {t("playnow.req.noCode", { who: r.other.tag })} <Link href={`/u/${r.other.handle}`} className="link">{t("playnow.req.messageThem")}</Link>
        </span>
      )}
      {!codes.mine && <span className="text-xs text-muted">{t("playnow.req.saveYours")}</span>}
      {r.game === "melee" && codes.theirs && <span className="text-xs text-muted [@media(hover:none)]:hidden">{t("playnow.slippi.how")}</span>}
    </div>
  );
}

function LookingSwitch({ game, settings }: { game: PlayGame; settings: MyPlaySettings }) {
  const t = useT();
  const [minutes, setMinutes] = useState<number>(60);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (g: string, m: number) =>
    startTransition(async () => {
      const res = await setLooking(g, m);
      setError(res.error ?? null);
    });

  if (settings.lookingGame && settings.lookingUntil) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-xl bg-success/10 p-3 text-sm">
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-success" />
        <span className="flex-1">
          {t("playnow.looking.on", { game: GAMES[settings.lookingGame].short })} <LocalTime iso={settings.lookingUntil} style="time" />
        </span>
        <button type="button" disabled={pending} onClick={() => run("", 0)} className="btn btn-sm btn-outline">{t("playnow.looking.stop")}</button>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" disabled={pending} onClick={() => run(game, minutes)} className="btn btn-sm btn-primary">
          {t("playnow.looking.start", { game: GAMES[game].short })}
        </button>
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label={t("playnow.looking.for")} className="rounded-full border border-line bg-field px-2 py-1 text-sm">
          {LOOKING_MINUTES.map((m) => <option key={m} value={m}>{m < 60 ? t("playnow.looking.mins", { n: m }) : t("playnow.looking.hours", { n: m / 60 })}</option>)}
        </select>
      </p>
      <p className="text-xs text-muted">{error ? <span className="text-danger">{error}</span> : t("playnow.looking.note")}</p>
    </div>
  );
}

function MyCode({ game, saved }: { game: PlayGame; saved: string }) {
  const t = useT();
  const [code, setCode] = useState(saved);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await savePlayCode(game, code);
          setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: t("playnow.code.saved") });
        });
      }}
      className="flex flex-col gap-1"
    >
      <label className="text-sm font-semibold" htmlFor={`play-code-${game}`}>{t(`play.code.${game}`)}</label>
      <span className="flex gap-2">
        <input
          id={`play-code-${game}`}
          value={code}
          onChange={(e) => { setCode(e.target.value); setMsg(null); }}
          maxLength={40}
          placeholder={t("playnow.code.placeholder")}
          className="min-w-0 flex-1 rounded-full border border-line bg-field px-4 py-1.5 font-mono text-sm"
        />
        <button disabled={pending || code.trim() === saved} className="btn btn-sm btn-outline">{t("playnow.code.save")}</button>
      </span>
      <p className="text-xs text-muted">{msg ? <span className={msg.ok ? "" : "text-danger"}>{msg.text}</span> : t("playnow.code.note")}</p>
    </form>
  );
}
