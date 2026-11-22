// Link preview for a profile: tag, @handle, city, games and bio.
// Read as a guest: teen profiles (hidden from guests) get the generic card, same as a missing one.
import { GAMES, isGameKey } from "@/lib/games";
import { avatarForCard } from "@/lib/avatars";
import { clip, GAME_COLOR, LetterAvatar, MUTED, OG_SIZE, OG_TYPE, Pill, NO_STORE, renderOg, SHORT_CARD, siteCard } from "@/lib/ogCard";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";

export const alt = "A player on Smashy";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

type Row = { tag: string; handle: string; home_city: string | null; games: string[] | null; bio: string | null; avatar_path: string | null };

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const handle = (await params).handle.toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(handle) || !hasSupabase()) return siteCard();
  const { data, error } = await createGuestClient().from("profiles").select("tag, handle, home_city, games, bio, avatar_path").eq("handle", handle).maybeSingle();
  if (error) return siteCard(NO_STORE); // round 634
  const p = data as Row | null;
  if (!p) return siteCard(SHORT_CARD);
  // Read as a guest above, so a teen's profile never gets here; adults' pictures are public anyway.
  const picture = p.avatar_path ? await avatarForCard(p.avatar_path) : null;

  const games = (p.games ?? []).filter(isGameKey);
  const sub = [`@${p.handle}`, p.home_city].filter(Boolean).join(" · ");

  return renderOg({
    cacheControl: SHORT_CARD,
    label: "Player",
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt="" width={150} height={150} style={{ width: 150, height: 150, borderRadius: 150, objectFit: "cover" }} />
          ) : (
            <LetterAvatar name={p.tag} size={150} />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: p.tag.length > 16 ? 60 : 76, color: "#ffffff", letterSpacing: -1 }}>{clip(p.tag, 30)}</div>
            <div style={{ display: "flex", fontSize: 32, color: MUTED }}>{sub}</div>
          </div>
        </div>
        {games.length > 0 && (
          <div style={{ display: "flex", gap: 14 }}>
            {games.map((g) => (
              <Pill key={g} color={GAME_COLOR[g]}>{GAMES[g].short}</Pill>
            ))}
          </div>
        )}
        {p.bio && <div style={{ display: "flex", fontSize: 32, lineHeight: 1.35, color: "#d6d9dc" }}>{clip(p.bio, 150)}</div>}
      </div>
    ),
  });
}
