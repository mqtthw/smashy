"use server";

import { refresh } from "next/cache";
import { ADULT_AGE, ageFromBirthdate } from "@/lib/age";
import { SOCIALS, parseSocial, type SocialColumn } from "@/lib/socials";
import { redirect } from "next/navigation";
import { removeAvatar, setAvatar } from "@/lib/avatars";
import { parseMains } from "@/lib/characters";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { contactInfoReason } from "@/lib/guardrails";
import { isRegion } from "@/lib/regions";
import { cleanTag, handleProblem, tagProblem } from "@/lib/handles";
import { overLimit } from "@/lib/limits";
import { isSiteAdmin } from "@/lib/scenes";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export type EditState = { error?: string };

/** Upload a new profile picture (checked for safety first). */
export async function uploadAvatar(formData: FormData): Promise<{ error?: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { error: (await getT())("people.err.pickPicture") };
  // Each upload runs a paid safety check: at most 10 an hour.
  const tooMany = await overLimit("avatar_upload");
  if (tooMany) return { error: tooMany };
  const problem = await setAvatar(userId, file);
  if (problem) return { error: problem };
  refresh();
  return {};
}

export async function deleteAvatar() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  await removeAvatar(userId);
  refresh();
}

export async function updateProfile(_prev: EditState, formData: FormData): Promise<EditState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");

  const tag = cleanTag(String(formData.get("tag") ?? ""));
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const homeCity = String(formData.get("home_city") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const crew = String(formData.get("crew") ?? "").replace(/\s+/g, " ").trim() || null;
  const lfgDoubles = formData.get("lfg_doubles") === "on";
  const regionRaw = String(formData.get("region") ?? "");
  const region = isRegion(regionRaw) ? regionRaw : null;
  const games = formData.getAll("games").map(String).filter((g): g is GameKey => GAME_KEYS.includes(g as GameKey));

  const t = await getT();
  // Names that look like Smashy staff are only for site admins (the official account keeps its own).
  const staff = await isSiteAdmin(userId);
  const badTag = tagProblem(tag, { staff });
  if (badTag) return { error: badTag };
  const badHandle = handleProblem(handle, { staff });
  if (badHandle) return { error: badHandle };
  if (homeCity && homeCity.length > 60) return { error: t("people.err.cityLong") };
  // Everything on a profile is public: no links, phone numbers or other contact info anywhere on it.
  if (contactInfoReason(tag)) return { error: t("people.err.tagContact") };
  if (homeCity && contactInfoReason(homeCity)) return { error: t("people.err.cityContact") };
  if (bio && bio.length > 160) return { error: t("people.err.bioLong") };
  if (crew && crew.length > 40) return { error: t("people.err.crewLong") };
  // Profiles are public: keep phone numbers, emails, and other contact info out of bios.
  const blocked = bio ? contactInfoReason(bio) : null;
  if (blocked) return { error: blocked.replace("in chat", "in bios").replace("here", "in bios") };
  const crewBlocked = crew ? contactInfoReason(crew) : null;
  if (crewBlocked) return { error: t("people.err.crewContact") };

  const supabase = await createClient();
  // Socials (adults only; the database checks too). A box left empty clears that social.
  const { data: priv } = await supabase.from("private_profile_data").select("date_of_birth").eq("user_id", userId).maybeSingle();
  const adult = !!priv && ageFromBirthdate(priv.date_of_birth) >= ADULT_AGE;
  const socials: Partial<Record<SocialColumn, string | null>> = {};
  if (adult) {
    for (const s of SOCIALS) {
      const v = parseSocial(s, String(formData.get(s.column) ?? "").slice(0, 200));
      if (v === "bad") return { error: t("people.err.socialBad", { site: s.label }) };
      socials[s.column] = v;
    }
  }
  // Under-18 accounts are always protected (the database enforces this too).
  const isProtected = formData.get("protected") === "on";
  const mains = parseMains(formData.get("mains")).filter((m) => games.includes(m.game));
  const { error } = await supabase.from("profiles").update({ tag, handle, home_city: homeCity, bio, crew, lfg_doubles: lfgDoubles, games, protected: isProtected, mains, ...socials, ...(region ? { region } : {}) }).eq("id", userId);
  // The database's own rule messages (e.g. no contact info on profiles) are written for people.
  if (error) return { error: error.code === "23505" ? t("people.err.handleTaken") : error.code === "P0001" ? error.message : t("people.err.couldntSave") };
  redirect(`/u/${handle}`);
}
