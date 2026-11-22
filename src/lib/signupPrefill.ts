// The welcome step's starting tag (round 659): someone who joined with Discord already has a gamer name
// there, so it's filled in for them to keep or change. Google and Apple give a real name, which isn't a
// tag, and email gives nothing, so those start empty. Shared by server and browser (pure).
import { cleanTag, tagProblem } from "./handles";

type Meta = Record<string, unknown> | null | undefined;

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** A tag to start with, or "" when the sign-in gave none worth using. */
export function tagFromSignIn(provider: string | null | undefined, meta: Meta): string {
  if (provider !== "discord" || !meta) return "";
  const claims = (meta.custom_claims ?? {}) as Record<string, unknown>;
  // Discord's display name first, then the username ("name" can carry an old "#0" discriminator).
  const raw = str(claims.global_name) || str(meta.full_name) || str(meta.name).replace(/#\d+$/, "") || str(meta.preferred_username);
  const tag = cleanTag(raw).slice(0, 30).trim();
  return tag && !tagProblem(tag) ? tag : "";
}
