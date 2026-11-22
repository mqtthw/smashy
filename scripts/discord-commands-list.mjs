// The Smashy bot's slash commands, as registered with Discord by scripts/discord-commands.mjs.
// Kept in step with the commands src/lib/discordBot.ts answers. Each description is also given in
// Spanish, Japanese and French: Discord shows the one for the person's own Discord language.

/** A description in English plus Discord's per-language versions (Spanish for Spain and Latin America). */
const d = (en, es, ja, fr) => ({
  description: en,
  description_localizations: { "es-ES": es, "es-419": es, ja, fr },
});

const MANAGE_GUILD = String(1 << 5);

export const COMMANDS = [
  {
    name: "smashy",
    ...d("Link this server to Smashy, or unlink it", "Vincula este servidor a Smashy o desvincúlalo", "このサーバーをSmashyに連携、または解除", "Lier ce serveur à Smashy, ou le délier"),
    default_member_permissions: MANAGE_GUILD,
    dm_permission: false,
    options: [
      {
        type: 1,
        name: "connect",
        ...d("Link this server to a TO's Smashy events", "Vincula este servidor a los eventos de un TO en Smashy", "このサーバーをTOのSmashyイベントに連携", "Lier ce serveur aux tournois Smashy d'un TO"),
        options: [
          {
            type: 3,
            name: "code",
            ...d("The code from smashy.gg/host/discord", "El código de smashy.gg/host/discord", "smashy.gg/host/discord のコード", "Le code de smashy.gg/host/discord"),
            required: true,
          },
        ],
      },
      { type: 1, name: "disconnect", ...d("Unlink this server from Smashy", "Desvincula este servidor de Smashy", "このサーバーとSmashyの連携を解除", "Délier ce serveur de Smashy") },
    ],
  },
  {
    name: "bracket",
    ...d("The live bracket, the next sign-up, or the last results", "El bracket en vivo, la próxima inscripción o los últimos resultados", "進行中のブラケット、次のエントリー、または前回の結果", "Le bracket en cours, la prochaine inscription ou les derniers résultats"),
    dm_permission: false,
  },
  { name: "upcoming", ...d("This scene's next events on Smashy", "Los próximos eventos de esta escena en Smashy", "このシーンのSmashyでの次のイベント", "Les prochains tournois de cette scène sur Smashy"), dm_permission: false },
  { name: "results", ...d("The top 8 of the last event", "El top 8 del último evento", "前回のイベントのトップ8", "Le top 8 du dernier tournoi"), dm_permission: false },
  {
    name: "player",
    ...d("Look up a Smashy player by tag", "Busca a un jugador de Smashy por su tag", "タグでSmashyプレイヤーを検索", "Chercher un joueur Smashy par son pseudo"),
    options: [{ type: 3, name: "tag", ...d("Their tag or @handle", "Su tag o @usuario", "タグまたは@ハンドル", "Son pseudo ou @identifiant"), required: true }],
  },
  {
    name: "season",
    ...d(
      "This scene's season standings (top 10), or one player's rank",
      "La clasificación de la temporada de esta escena (top 10), o el puesto de un jugador",
      "このシーンのシーズン順位表（トップ10）、または1人の順位",
      "Le classement de la saison de cette scène (top 10), ou le rang d'un joueur",
    ),
    dm_permission: false,
    options: [
      {
        type: 3,
        name: "player",
        ...d("A player's tag, to see just their rank", "El tag de un jugador, para ver solo su puesto", "プレイヤーのタグ（その人の順位だけ表示）", "Le pseudo d'un joueur, pour voir juste son rang"),
        required: false,
      },
    ],
  },
  { name: "next", ...d("Your next set (only you see the answer)", "Tu próximo set (solo tú ves la respuesta)", "あなたの次の試合（あなたにだけ表示）", "Ton prochain set (toi seul vois la réponse)") },
];
