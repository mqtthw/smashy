import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ChatRoom from "@/components/play/ChatRoom";
import HostLobbyForm from "@/components/play/HostLobbyForm";
import LobbyList from "@/components/play/LobbyList";
import OnlineLadders from "@/components/play/OnlineLadders";
import PlayNow from "@/components/play/PlayNow";
import { getMyPlaySettings, getPlayFriends, getPlayRequests } from "@/lib/playNow";
import { isPlayGame } from "@/lib/playGames";
import { unixNow } from "@/lib/format";
import type { GameKey } from "@/lib/games";
import { CHAT_ROOMS, type ChatRoom as Room } from "@/lib/guardrails";
import { getOpenLobbies, getRecentChat } from "@/lib/play";
import { regionName } from "@/lib/regions";
import { createClient, getUserId } from "@/lib/supabase/server";
import { hasBirthday } from "@/lib/viewer";
import AddBirthday from "@/components/AddBirthday";
import TabBar from "@/components/ui/TabBar";
import { GAMES, gamesFor } from "@/lib/games";
import { getMyGames } from "@/lib/viewer";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";

export const metadata: Metadata = { title: "Play Smash online: netplay lobbies and ladders", description: "Find Super Smash Bros. netplay lobbies, ranked online ladders and chat with the smash community." };

/** Rooms to show as tabs: main games, older games this player plays (or is viewing), and General. */
function roomTabs(myGames: string[], current: Room, general: string): { key: Room; label: string }[] {
  const games = gamesFor(current === "general" ? myGames : [...myGames, current]);
  return [...games.map((g) => ({ key: g as Room, label: GAMES[g].short })), { key: "general" as Room, label: general }];
}

async function PlayContent({ searchParams }: { searchParams: PageProps<"/play">["searchParams"] }) {
  const { room: roomParam } = await searchParams;
  const userId = await getUserId();
  const myGames = await getMyGames(userId);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  // With no room picked, open the room for the player's first game (Ultimate players land in Ultimate).
  const first = myGames.find((g) => CHAT_ROOMS.includes(g as Room)) as Room | undefined;
  const room: Room = CHAT_ROOMS.includes(roomParam as Room) ? (roomParam as Room) : first ?? "melee";
  const game: GameKey | undefined = room === "general" ? undefined : room;
  const TABS = roomTabs(myGames, room, t("play.general"));

  const tabs = (
    <TabBar sticky scroll label={t("play.chooseGame")} active={room} tabs={TABS.map((tab) => ({ key: tab.key, label: tab.label, href: `/play?room=${tab.key}` }))} />
  );

  if (!userId) {
    return (
      <LangProvider lang={lang}>
        {tabs}
        <div className="card mx-3 mt-3 p-5">
          <p className="font-semibold">{t("play.guestTitle")}</p>
          <p className="mt-1 text-sm text-muted">
            {t("play.guestBody")}
          </p>
          <Link href={signInPath("/play")} className="mt-3 inline-block btn btn-md btn-primary">{t("play.join")}</Link>
        </div>
        <OnlineLadders game={game} />
      </LangProvider>
    );
  }

  const supabase = await createClient();
  const [lobbies, chat, { data: profile }, requests, friends, settings, birthday] = await Promise.all([
    getOpenLobbies(game),
    getRecentChat(room),
    supabase.from("profiles").select("home_city, region").eq("id", userId).maybeSingle(),
    getPlayRequests(userId),
    getPlayFriends(),
    getMyPlaySettings(userId),
    hasBirthday(userId),
  ]);
  const playGame = isPlayGame(room) ? room : null;

  return (
    <LangProvider lang={lang}>
      {tabs}
      {!birthday && (
        <div className="mx-3 mt-3">
          <AddBirthday currentYear={new Date().getFullYear()} next={`/play?room=${room}`} title={t("people.birthday.toMessageTitle")} body={t("people.birthday.toMessageBody")} />
        </div>
      )}
      <PlayNow game={playGame} myGames={myGames.filter(isPlayGame)} requests={requests} friends={friends} settings={settings} viewerId={userId} serverNow={unixNow() * 1000} />
      {/* Each part of Play is its own glass panel (round 502). Matthew tried another order (round 507) and
          went back to this one (round 509). */}
      <section className="card mx-3 mt-3 pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="font-bold">{t("play.openLobbies")}</h2>
          <HostLobbyForm key={room} defaultGame={game ?? "melee"} defaultRegion={profile?.home_city ?? regionName(profile?.region)} />
        </div>
        <LobbyList lobbies={lobbies} viewerId={userId} serverNow={unixNow() * 1000} />
      </section>
      <OnlineLadders game={game} />
      <section className="card mx-3 my-3">
        <h2 className="px-4 pt-4 font-bold">{t("play.roomChat", { room: TABS.find((tab) => tab.key === room)!.label })}</h2>
        {/* key={room}: a fresh chat (and live connection) per room */}
        <ChatRoom key={room} room={room} initial={chat} viewerId={userId} pingOn={!!playGame && settings.pingGames.includes(playGame)} />
      </section>
    </LangProvider>
  );
}

export default function PlayPage(props: PageProps<"/play">) {
  return (
    <section>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold"><T k="nav.play" /></h1>
      </header>
      <Suspense fallback={<CardListSkeleton count={3} className="p-4" />}>
        <PlayContent searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
