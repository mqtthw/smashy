// A character's playstyle and properties, at the top of their page (round 917, Matthew: "every character
// should have a short explanation of a character's playstyle and properties … Do not guess or make up
// advice").
//
// THE RULE: nothing here comes from Smashy's own judgement or from memory. Every overview is a short
// summary, in plain words, of ONE named source written by that character's own community, and the page
// says so and links to it. If a character has no such source, they get no overview (their page points to
// the character's Discord instead). When adding one: read the source itself, keep only what it says,
// keep it much shorter than the source, and credit the people who wrote it.
//
// Text is per language; a language that's missing falls back to English.
import type { GameKey } from "./games";

type Text = { en: string; es?: string; fr?: string; ja?: string };

export type CharacterOverview = {
  source: { title: string; url: string; by: string };
  /** Plain numbers the source gives (shown as small tags). */
  stats?: { weight?: number; fallSpeed?: number };
  playstyle: Text;
  /** What makes the character different: their own mechanics. The names stay as players say them. */
  traits: { name: string; text: Text }[];
  strengths: Text[];
  weaknesses: Text[];
};

export const CHARACTER_OVERVIEWS: Partial<Record<GameKey, Record<string, CharacterOverview>>> = {
  ultimate: {
    "king-k-rool": {
      source: {
        title: "Kremkroc Industries: the King K. Rool Katalog",
        url: "https://sites.google.com/view/catalog-kingkrool/basic-information",
        by: "Plague von Karma, Raphy and jreiss1923",
      },
      stats: { weight: 133, fallSpeed: 1.7 },
      playstyle: {
        en: "A defensive heavyweight. He waits in neutral, lets opponents run into the armor on his attacks, and uses a sudden burst of range (dash attack, dash grab) to force his way in. His community calls him a tank or juggernaut, not a zoner: his projectiles are too committal to keep people out, but they work well against other projectiles. Top K. Rool players have made defensive, rushdown and big-punish styles all work.",
        es: "Un peso pesado defensivo. Espera en neutral, deja que el rival choque contra la armadura de sus ataques y usa un alcance repentino (ataque en carrera, agarre en carrera) para abrirse paso. Su comunidad lo llama tanque o juggernaut, no zoner: sus proyectiles comprometen demasiado para mantener lejos al rival, pero funcionan bien contra otros proyectiles. Los mejores jugadores de K. Rool han hecho funcionar estilos defensivos, de presión y de grandes castigos.",
        fr: "Un poids lourd défensif. Il attend en neutral, laisse l’adversaire se heurter à l’armure de ses attaques et utilise une portée soudaine (attaque en course, attrape en course) pour s’imposer. Sa communauté le décrit comme un tank ou un juggernaut, pas un zoner : ses projectiles engagent trop pour tenir l’adversaire à distance, mais marchent bien contre d’autres projectiles. Les meilleurs joueurs de K. Rool ont fait fonctionner des styles défensif, rushdown et à gros punish.",
        ja: "守りの重量級。ニュートラルで待ち、攻撃についているアーマーに相手を突っ込ませ、ダッシュ攻撃やダッシュつかみの急なリーチで一気に差し込みます。コミュニティでは「タンク」「ジャガーノート」と呼ばれ、ゾーナーではないとされています。飛び道具はスキが大きく相手を遠ざけるには向きませんが、他の飛び道具には強く出られます。上位のK.ルールド使いは、守り、ラッシュ、大きな火力のどのスタイルでも結果を出しています。",
      },
      traits: [
        {
          name: "Belly Super Armor",
          text: {
            en: "Armor on his belly absorbs hits during certain frames of many of his attacks. It can take about 36% before breaking, shows cracks as it weakens, and refills over about 25 seconds.",
            es: "La armadura de su barriga absorbe golpes durante ciertos frames de muchos de sus ataques. Aguanta alrededor de un 36 % antes de romperse, muestra grietas al debilitarse y se recupera en unos 25 segundos.",
            fr: "L’armure de son ventre absorbe les coups pendant certaines frames de beaucoup de ses attaques. Elle encaisse environ 36 % avant de se briser, se fissure en s’affaiblissant et se recharge en 25 secondes environ.",
            ja: "多くの攻撃の特定のフレームで、お腹のアーマーが攻撃を受け止めます。約36％まで耐えられ、弱るとひびが見え、約25秒で回復します。",
          },
        },
        {
          name: "Crownerang",
          text: {
            en: "A thrown crown that comes back to him. He has armor while throwing it (it breaks at about 14%), and the returning crown is a separate hit that can combo or even KO.",
            es: "Una corona lanzada que vuelve a él. Tiene armadura mientras la lanza (se rompe con un 14 % aproximadamente), y la corona al volver es un golpe aparte que puede hacer combo o incluso noquear.",
            fr: "Une couronne lancée qui lui revient. Il a de l’armure pendant le lancer (elle cède vers 14 %), et la couronne qui revient est un coup à part qui peut enchaîner, voire mettre K.O.",
            ja: "投げると戻ってくる王冠。投げている間はアーマーがあり（約14％で壊れます）、戻ってくる王冠は別の攻撃としてコンボや撃墜につながります。",
          },
        },
        {
          name: "Bury (down throw, down tilt)",
          text: {
            en: "Both moves put the opponent in the ground, and they have to mash to get out. From about 80% the down throw sets up a guess between up smash and forward smash for the KO.",
            es: "Ambos movimientos entierran al rival, que tiene que machacar botones para salir. Desde un 80 % aproximadamente, el lanzamiento hacia abajo plantea una adivinanza entre smash hacia arriba y smash lateral para noquear.",
            fr: "Les deux coups enterrent l’adversaire, qui doit marteler les boutons pour sortir. À partir de 80 % environ, la projection vers le bas crée un choix entre smash haut et smash côté pour le K.O.",
            ja: "どちらも相手を地面に埋め、相手はレバガチャで抜けなければなりません。約80％からは、下投げの後に上スマッシュか横スマッシュかの読み合いで撃墜を狙えます。",
          },
        },
      ],
      strengths: [
        {
          en: "Builds damage fast: very few of his moves deal under 10%.",
          es: "Acumula daño rápido: muy pocos de sus movimientos hacen menos de un 10 %.",
          fr: "Monte vite les dégâts : très peu de ses coups font moins de 10 %.",
          ja: "ダメージを素早く稼げます。10％未満のワザはほとんどありません。",
        },
        {
          en: "Survives a very long time: weight 133, and he's almost immune to stage spikes.",
          es: "Sobrevive muchísimo: peso 133 y casi inmune a los stage spikes.",
          fr: "Survit très longtemps : poids 133, et il est presque insensible aux stage spikes.",
          ja: "非常に長く生き残れます。重さ133で、ステージメテオもほぼ効きません。",
        },
        {
          en: "Strong edgeguarding and ledgetrapping, with armored neutral air and two meteor smashes (down air, back air).",
          es: "Buen edgeguard y ledgetrap, con aéreo neutral con armadura y dos meteoros (aéreo abajo y aéreo atrás).",
          fr: "Edgeguard et ledgetrap solides, avec un aérien neutre armuré et deux meteor smashes (aérien bas, aérien arrière).",
          ja: "アーマー付きの空中ニュートラル攻撃と2つのメテオ（空下、空後）で、復帰阻止と崖狩りが強力です。",
        },
        {
          en: "Catches landings well; the armored dash attack beats landing aerials.",
          es: "Castiga bien los aterrizajes; el ataque en carrera con armadura gana a los aéreos de aterrizaje.",
          fr: "Punit bien les atterrissages ; l’attaque en course armurée bat les aériens à l’atterrissage.",
          ja: "着地狩りが得意。アーマー付きのダッシュ攻撃は着地際の空中攻撃に勝てます。",
        },
      ],
      weaknesses: [
        {
          en: "The largest body in the game and slow ways out of combos: one of the easiest characters to combo.",
          es: "El cuerpo más grande del juego y formas lentas de salir de combos: uno de los personajes más fáciles de combear.",
          fr: "Le plus gros corps du jeu et des sorties de combo lentes : l’un des personnages les plus faciles à comboter.",
          ja: "ゲーム中で最も体が大きく、コンボから抜ける手段も遅いため、最もコンボを受けやすいキャラクターの一人です。",
        },
        {
          en: "Some of the slowest walk, run and air speed in the game.",
          es: "De las velocidades de caminar, correr y en el aire más lentas del juego.",
          fr: "Parmi les vitesses de marche, de course et aérienne les plus lentes du jeu.",
          ja: "歩行、走行、空中の速度はいずれもゲーム中で最も遅い部類です。",
        },
        {
          en: "Long end lag on most moves, so almost every attack is a commitment.",
          es: "Mucho retraso final en la mayoría de sus movimientos, así que casi cada ataque es un compromiso.",
          fr: "Beaucoup de lag de fin sur la plupart de ses coups : presque chaque attaque est un engagement.",
          ja: "ほとんどのワザは後隙が長く、どの攻撃もリスクを伴います。",
        },
        {
          en: "Poor out of shield: his fastest reliable option comes out around frame 10.",
          es: "Flojo desde el escudo: su opción fiable más rápida sale hacia el frame 10.",
          fr: "Faible en sortie de bouclier : son option fiable la plus rapide sort vers la frame 10.",
          ja: "ガードからの反撃が弱く、信頼できる最速の行動でも約10フレーム目です。",
        },
        {
          en: "His recovery can be hit from the side and struggles against projectiles.",
          es: "Su recuperación se puede golpear desde el lado y sufre contra proyectiles.",
          fr: "Son retour peut être frappé par le côté et souffre face aux projectiles.",
          ja: "復帰は横からの攻撃に弱く、飛び道具にも苦労します。",
        },
      ],
    },
  },
};

export function characterOverview(game: GameKey, character: string): CharacterOverview | null {
  return CHARACTER_OVERVIEWS[game]?.[character] ?? null;
}

/** The text in the reader's language, or in English when that language isn't written yet. */
export function inLang(text: Text, lang: string): string {
  return (text as Record<string, string | undefined>)[lang] ?? text.en;
}
