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
    // Round 918 batch (English first; other languages fall back to it until a translation pass).
    "zero-suit-samus": {
      source: {
        title: "The Zero Suit Samus Compendium",
        url: "https://docs.google.com/document/d/1LnIrS0Ei_OkZ5HQqcPcwLLaLOwG0pIkwnqFz6WhuePA/edit",
        by: "Kapsyl, with Mabemo and Doorstop",
      },
      playstyle: {
        en: "Aggressive, high-risk and high-reward. She is one of the most agile characters in the game: she holds center stage, pressures from the air, and conditions the opponent's reactions so she can punish them. Most of her strength is in her aerials, with shield-poking options that lead into big combos.",
      },
      traits: [
        {
          name: "Recovery",
          text: { en: "Very versatile: Boost Kick from below the ledge, Flip Jump back to the stage or to the ledge, and a tether with her air grab or Plasma Whip (slow, so used with care). Flip Jump is only invincible briefly, so repeating it gets called out; she has to mix up angles, height and ledge options." },
        },
      ],
      strengths: [
        { en: "Incredible movement, with very versatile ways to get around." },
        { en: "Aerials and shield pokes that lead into devastating combos." },
        { en: "Can take control of the stage quickly and pressure from the air." },
      ],
      weaknesses: [
        { en: "Tall, light and fast-falling, which makes her vulnerable to setups." },
        { en: "Her grounded moves are lackluster, so she often has to commit to jumping." },
        { en: "Limited defensive options: she relies on movement to get out of bad spots." },
      ],
    },
    "king-dedede": {
      source: {
        title: "The Ultimate King Dedede Guide",
        url: "https://docs.google.com/document/d/1Qzf9EhuehVjASSN8JXPQGUU3G_wF_YeRhSl-FeD-6OA/edit?usp=sharing",
        by: "Soul Train",
      },
      playstyle: {
        en: "A defensive heavyweight who excels at trapping and surviving. He uses his long hammer and Gordo to push opponents to the edge and take their stock early from there; the guide calls the opponent being offstage his one true advantage state. A patient Dedede always has a chance.",
      },
      traits: [
        {
          name: "Gordo",
          text: { en: "A spiked ball he throws with side special. It can be thrown softly or hard and angled up, forward or down for exact spacing, and it's the center of his ledge traps and edgeguards: throw it at a recovering opponent and punish how they avoid it." },
        },
        {
          name: "Survival",
          text: { en: "An armored recovery, high gravity and heavy weight mean he regularly lives past 150%." },
        },
      ],
      strengths: [
        { en: "Lives a very long time." },
        { en: "Ledge traps and edgeguards that can end stocks very early." },
        { en: "Big damage from few hits: the guide lists combos doing 63% off two moves." },
      ],
      weaknesses: [
        { en: "Large and fast-falling with high end lag on most moves: a lackluster neutral, and he can't approach easily, so patient keepaway is hard for him." },
        { en: "No good out-of-shield options or safe close-range attacks, so smart rushdown is hard for him too." },
        { en: "The worst air speed in the game: easily juggled, with a rough time in disadvantage." },
      ],
    },
    "piranha-plant": {
      source: {
        title: "Piranha Plant Guide",
        url: "https://docs.google.com/document/d/1MXjF4991FD7DApDSxKzlBjEX2t0KxaLJpKpW5RZ_LkA/edit",
        by: "the Piranha Plant Discord (the guide's author isn't named)",
      },
      playstyle: {
        en: "A keepaway character built around anti-airs. Plant pokes, zones with Ptooie, closes off space with Poison Breath, and catches people as they come down; the guide says most of its damage comes from anti-airs and ledge trapping, and that it isn't built to approach.",
      },
      traits: [
        {
          name: "Ptooie",
          text: { en: "The spiked ball. Used to zone and to lock down an opponent's shield; the guide warns that spamming it is a common beginner mistake." },
        },
        {
          name: "Poison Breath",
          text: { en: "A cloud that denies an area of the stage. Turning it around in the air (a B-reverse) is also Plant's main movement trick." },
        },
      ],
      strengths: [
        { en: "Can rack up large damage from stray hits." },
        { en: "Some of the better anti-airs in the cast." },
        { en: "Very strong ledge trapping." },
        { en: "Sets up areas the opponent can't safely enter." },
      ],
      weaknesses: [
        { en: "A poor neutral that leans on laggy, short-ranged pokes." },
        { en: "Very little movement to speak of." },
        { en: "A dreadful disadvantage state." },
      ],
    },
    // Round 919 batch (English first).
    robin: {
      source: {
        title: "Robin in Smash Ultimate",
        url: "https://docs.google.com/document/d/1IGgIUrPu0G3xiiN1TUszJATxcuS_Tx-XuEJR8KvJD-w/",
        by: "Issun, with thanks to the Robin Discord",
      },
      playstyle: {
        en: "Versatile, adaptive and territorial. Robin controls space with ranged spells and with the long, hard-hitting Levin Sword, and changes the game plan by matchup and by which resources are left. The guide says Robin excels when in control, and can be frustratingly complicated for beginners.",
      },
      traits: [
        {
          name: "Limited resources",
          text: { en: "The Levin Sword and each spell tome run out and come back after a while, so Robin regularly loses some of the best options and has to adapt. With the Levin Sword gone (about 10 seconds), the guide advises playing more passively." },
        },
        {
          name: "Levin Sword",
          text: { en: "A disjointed sword with overwhelming reach and heavy knockback: the base of Robin's spacing." },
        },
        {
          name: "Thunder, Arcfire, Elwind, Nosferatu",
          text: { en: "Thunder is the main zoning spell (the neutral is much weaker without it), Arcfire sets traps and combos, Elwind is the recovery (losing it at the wrong moment costs a stock), and Nosferatu can help with landing." },
        },
      ],
      strengths: [
        { en: "Controls space with both projectiles and a long disjointed sword." },
        { en: "Does well at mid-close range against projectile zoners, while close-combat characters struggle to break through the zone." },
        { en: "Lower landing lag and better movement than in Smash 4 make Robin feel more fluid." },
      ],
      weaknesses: [
        { en: "Tends to lose trades up close because the attacks start slowly, so keeping a safe distance matters." },
        { en: "Regularly loses access to key tools as resources run out." },
        { en: "Complicated to learn." },
      ],
    },
    "ice-climbers": {
      source: {
        title: "Ice Climbers Discord Mega-Guide",
        url: "https://docs.google.com/document/d/1fs1J6xsBlsRGqCxJsfyANRR8W8ZA87oZ8kS9ppGeNi4/edit?usp=sharing",
        by: "Spectrum, Natedawg, Marshi, Danilio8 and CptRemex",
      },
      playstyle: {
        en: "Bait and punish. The guide recommends neither pure rushdown nor camping: make the opponent miss, then counterattack with a high-damage punish. That can lean aggressive (pressing the opponent into hasty choices) or defensive (giving up a little space and punishing the approach).",
      },
      traits: [
        {
          name: "Two climbers",
          text: { en: "Nana, the second climber, adds a lot of coverage to their moves. Playing with both together (“synced”) is not the same as playing Popo alone." },
        },
        {
          name: "Desync",
          text: { en: "Making the two climbers act separately. The guide says it essentially doubles their coverage and opens up a huge range of combos, punishes and early KO setups, and it teaches the desync techniques in order." },
        },
        {
          name: "Grab, Blizzard, up air",
          text: { en: "Their strongest KO confirms and combos come from grabbing, from freezing the opponent with Blizzard, or from up air while synced, so the guide suggests asking how each combo leads to one of those." },
        },
      ],
      strengths: [
        { en: "Huge damage or a KO from a single opening." },
        { en: "Fairly good frame data." },
        { en: "A lot of coverage on their moves thanks to Nana, and more again when desynced." },
      ],
      weaknesses: [
        { en: "Slow: the 14th slowest run speed in the game." },
        { en: "Fairly small hammers, and a weak projectile in Ice Block." },
        { en: "Light, so opponents close out their stocks more easily." },
      ],
    },
    ridley: {
      source: {
        title: "An In-Depth Guide to Ridley",
        url: "https://docs.google.com/document/d/1GTCGcJzEWrv4REbv3PfwiWmceZU8NbZhoJCgmb-JAs8/edit?usp=sharing",
        by: "Plague von Karma, with 2x Jump and the Ridley Discord",
      },
      stats: { weight: 107 },
      playstyle: {
        en: "A big character with a sword-like tail and tools for defensive, balanced or offensive play. The guide describes a patient neutral built on being unpredictable: wait, threaten with position and huge hitboxes, punish the opponent's mistake, then keep the advantage for as long as possible.",
      },
      traits: [
        {
          name: "Neutral air",
          text: { en: "The centerpiece of his moves: disjointed, long-lasting, and the usual way into advantage. The guide warns it is easy to lean on too much and become predictable." },
        },
        {
          name: "The tail",
          text: { en: "The metal part of his tail is a disjoint, like a sword, which is why his range is so large that he outranges characters like Marth and Ike." },
        },
        {
          name: "Multiple midair jumps",
          text: { en: "Used to fake a landing, bait a miss and punish, and to get out of juggles." },
        },
        {
          name: "Plasma Breath",
          text: { en: "Fireballs for when the opponent is far away or won't approach, charged about half to three quarters." },
        },
      ],
      strengths: [
        { en: "Builds a formidable advantage from stray hits, and can keep it for a long time." },
        { en: "Huge hitboxes and range, which also make punishing a miss easy." },
        { en: "A stronger combo game than expected: usually at least three hits from his regular starters." },
      ],
      weaknesses: [
        { en: "Gigantic, so he gets juggled as soon as he's launched; landing is a chore." },
        { en: "His moves vary a lot in quality: some have blind spots, and some are too strict to use." },
        { en: "A horrendous disadvantage, with very few defensive options." },
      ],
    },
    "pokemon-trainer": {
      source: {
        title: "The Pokemon Trainer Field Guide",
        url: "https://docs.google.com/document/d/1nJqRZ79uBtwuD_YcupDm7Y9ZLIAToP4mrIxdgnnAh2s/edit?usp=sharing",
        by: "Contrary and the Pokemon Trainer community",
      },
      playstyle: {
        en: "Three Pokémon with three movesets and three playstyles that cover for each other. The guide calls Pokémon Trainer one of the most complicated characters in the game, and the one with the most tools for the rest of the roster: Squirtle for low percents, then a switch to Ivysaur or Charizard, who take stocks more easily.",
      },
      traits: [
        {
          name: "Squirtle",
          text: { en: "The smallest and most evasive: bait-and-punish and rushdown, with great frame data and solid speed. He is KO'd fairly early and has trouble taking stocks without a hard read." },
        },
        {
          name: "Ivysaur",
          text: { en: "The most versatile, and the guide's leader of the trio: zoning, mid-percent confirms and edgeguarding, with a low body and very disjointed hitboxes. Her mobility and frame data are mediocre." },
        },
        {
          name: "Charizard",
          text: { en: "Recovery and high-percent KOs: huge hitboxes, great kill power, strong ledge trapping and edgeguarding. His attacks aren't safe and his body is huge." },
        },
        {
          name: "Pokémon Change",
          text: { en: "Down special switches Pokémon. It also works as a way out of combos, and the guide suggests switching after winning an exchange, so the next Pokémon comes in from a good position." },
        },
      ],
      strengths: [
        { en: "The most tools of any character for dealing with the roster." },
        { en: "Each Pokémon covers what the others lack." },
      ],
      weaknesses: [
        { en: "One of the most complicated characters to play: three movesets to learn." },
        { en: "Each Pokémon has a clear flaw on its own." },
      ],
    },
  },
  melee: {
    // Round 918 batch (English first).
    pikachu: {
      source: {
        title: "Basic Pikachu Guide",
        url: "https://docs.google.com/document/d/1k-ejRDbQU_N7CucdpwW5RmCxKttthJKFIHUvyr9xMu4/edit",
        by: "Cornycows",
      },
      playstyle: {
        en: "A small, quick character whose neutral is centered on running in with a short-hop neutral air, then mixing in grab, down smash and down tilt once the opponent starts dealing with it. He dodges well with dash dancing and platform movement. He isn't a very defensive character, though his tilts, up smash and up air all work defensively.",
      },
      traits: [
        {
          name: "Speed and jump",
          text: { en: "Near the top in most speed attributes, with a 3-frame jumpsquat (tied for fastest in the game), and he keeps much of his momentum in the air after jumping." },
        },
        {
          name: "Neutral air",
          text: { en: "His main approach tool. It comes out on frame 3 and is used to deal damage, combo and edgeguard." },
        },
        {
          name: "Up air",
          text: { en: "Three timings that do different things: the first hit sends straight up (out of shield, combo starter), the middle hit, the “tailspike”, sends down and away (edgeguarding), and the last, the “tailflip”, flips the opponent over his head (extending combos)." },
        },
        {
          name: "Up smash",
          text: { en: "One of his best moves: its close and middle hits are the strongest up smash in the game. Used to tech chase, combo, KO, anti-air and out of shield; it has high end lag if it misses." },
        },
        {
          name: "Thunder Jolt",
          text: { en: "A projectile that bounces along the ground and around platforms, useful for approaching, defending and starting combos." },
        },
      ],
      strengths: [
        { en: "An incredibly strong out-of-shield game: a fast jumpsquat and three fast aerials." },
        { en: "Small and quick, so he's good at avoiding hits with movement." },
        { en: "Edgeguards Fox and Falco with down-angled forward tilt, down air and the tailspike." },
      ],
      weaknesses: [
        { en: "The shortest grab range in the game, which also makes him less of a tech-chase character." },
        { en: "Not a very defensive character." },
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
