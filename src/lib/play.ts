// Lobbies and chat (server-side loading, as the signed-in user so privacy rules apply).
import type { GameKey } from "./games";
import type { ChatRoom } from "./guardrails";
import { createClient } from "./supabase/server";

export type Lobby = {
  id: string;
  hostId: string;
  hostTag: string;
  game: GameKey;
  title: string;
  mode: "friendlies" | "practice" | "warmup" | "doubles";
  connectInfo: string;
  region: string;
  skill: "any" | "beginner" | "intermediate" | "advanced";
  notes: string | null;
  closesAt: string;
  createdAt: string;
};

export type ChatMessage = { id: string; room: ChatRoom; authorId: string; authorTag: string; body: string; createdAt: string };

export async function getOpenLobbies(game?: GameKey): Promise<Lobby[]> {
  const supabase = await createClient();
  let q = supabase
    .from("lobbies")
    .select("id, host_id, game, title, mode, connect_info, region, skill, notes, closes_at, created_at, host:profiles(tag)")
    .is("closed_at", null)
    .gt("closes_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(100);
  if (game) q = q.eq("game", game);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((l) => ({
    id: l.id,
    hostId: l.host_id,
    hostTag: (l.host as unknown as { tag: string } | null)?.tag ?? "Unknown",
    game: l.game as GameKey,
    title: l.title,
    mode: l.mode as Lobby["mode"],
    connectInfo: l.connect_info,
    region: l.region,
    skill: l.skill as Lobby["skill"],
    notes: l.notes,
    closesAt: l.closes_at,
    createdAt: l.created_at,
  }));
}

/** The last 100 messages in a room (oldest first, for display). */
export async function getRecentChat(room: ChatRoom): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, room, author_id, author_tag, body, created_at")
    .eq("room", room)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? [])
    .reverse()
    .map((m) => ({ id: m.id, room: m.room as ChatRoom, authorId: m.author_id, authorTag: m.author_tag, body: m.body, createdAt: m.created_at }));
}
