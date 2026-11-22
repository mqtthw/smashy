import "server-only";
// A welcome message from Smashy's own account (@smashyhq) to every new account (round 705): thanks for joining,
// and where to send feedback. Adults get the Discord invite as a link. Teens and accounts without a birthday
// (which count as teens) get the same message pointing to the Discord link on their Profile page instead: chats
// in the teen group can't hold links (the database refuses them), and Smashy's own staff account stays out of
// teen chats after this one message.
import { ADULT_AGE, ageFromBirthdate } from "./age";
import { DISCORD_INVITE } from "./contact";
import type { MessageKey, Values } from "./i18n/core";
import { OFFICIAL_HANDLE } from "./officialHost";
import { createAdminClient } from "./supabase/admin";

type Tr = (key: MessageKey, values?: Values) => string;

/** The message's text for an adult or a teen (plain logic, for tests). */
export function welcomeMessageBody(t: Tr, adult: boolean, tag: string): string {
  return adult ? t("people.welcomeDm.adult", { tag, link: DISCORD_INVITE }) : t("people.welcomeDm.teen", { tag });
}

/** Sends it once (one chat per pair of accounts: an existing chat means it was already sent). Never throws. */
export async function sendWelcomeMessage(userId: string, tag: string, birthdate: string | null, t: Tr): Promise<void> {
  try {
    const db = createAdminClient();
    const { data: official } = await db.from("profiles").select("id").eq("handle", OFFICIAL_HANDLE).maybeSingle();
    if (!official || official.id === userId) return;
    const adult = !!birthdate && ageFromBirthdate(birthdate) >= ADULT_AGE;
    const key = [official.id, userId].sort().join(":");
    const { data: conv, error } = await db
      .from("conversations")
      .insert({ kind: "direct", age_band: adult ? "adult" : "teen", direct_key: key, created_by: official.id })
      .select("id")
      .single();
    if (error) {
      if (error.code !== "23505") console.error("welcome message: chat not made", error.code, error.message);
      return;
    }
    const { error: membersError } = await db.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: official.id, status: "active" },
      { conversation_id: conv.id, user_id: userId, status: "active" },
    ]);
    if (membersError) throw membersError;
    const { error: messageError } = await db.from("messages").insert({ conversation_id: conv.id, sender_id: official.id, body: welcomeMessageBody(t, adult, tag) });
    if (messageError) throw messageError;
  } catch (e) {
    console.error("welcome message failed", e instanceof Error ? e.message : e);
  }
}
