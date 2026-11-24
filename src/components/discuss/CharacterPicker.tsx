"use client";
// Discuss: pick a character to see their board (round 807), like Smashboards' character boards. Picking one
// opens the same page with ?character=…, keeping the game, sort and other filters.
import { useRouter } from "next/navigation";
import type { Character } from "@/lib/characters";
import { useT } from "@/lib/i18n/client";

export default function CharacterPicker({ characters, value, hrefFor }: { characters: Character[]; value: string | undefined; hrefFor: Record<string, string> }) {
  const t = useT();
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{t("feed.discuss.character")}</span>
      <select
        value={value ?? ""}
        onChange={(e) => router.push(hrefFor[e.target.value] ?? hrefFor[""])}
        className="field py-1"
      >
        <option value="">{t("feed.discuss.allCharacters")}</option>
        {characters.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
      </select>
    </label>
  );
}
