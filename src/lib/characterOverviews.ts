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
// Text is per language. King K. Rool's is written beside the English; the others' translations are in
// overviewText.<lang>.ts, looked up by the English line. A line with no translation shows in English.
import type { GameKey } from "./games";
import { OVERVIEW_TEXT as OVERVIEW_ES } from "./overviewText.es";
import { OVERVIEW_TEXT as OVERVIEW_FR } from "./overviewText.fr";
import { OVERVIEW_TEXT as OVERVIEW_JA } from "./overviewText.ja";

type Text = { en: string; es?: string; fr?: string; ja?: string };

export type CharacterOverview = {
  /** `written`: when the source was written or last updated, as it says itself ("December 2018"). Shown beside
   *  the credit, because games get patched and an old guide's details may no longer hold (Matthew, round 922:
   *  "do not treat these as gospel because some may be outdated"). */
  source: { title: string; url: string; by: string; written?: string };
  /** True when Matthew has changed or added to the summary himself: the page then says so beside the credit. */
  edited?: boolean;
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
        written: "April 2020",
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
    // Round 921 batch (English first).
    roy: {
      source: {
        title: "Roy F.A.Q./Guide",
        url: "https://docs.google.com/document/d/1Amg18hCm9V_k9YR_rJ7ArMP-oF2ww8MPAxg05hjJm8s/",
        by: "BBaller",
      },
      playstyle: {
        en: "A fast, hard-hitting swordfighter that the guide calls a fundamentals-based character. He finds openings through calculated aggression rather than throwing moves out, and generally does well against characters that lack the disjoints, frame data or speed to keep up with him. The guide finds him easier at low and mid level and harder at high level, where patience and knowing why his tools work matter.",
      },
      traits: [
        {
          name: "Sourspots",
          text: { en: "Hits toward the end of his sword deal less damage and knockback, which can be an advantage or a disadvantage depending on the move and the situation. (Chrom, his echo fighter, has even damage along the whole sword.)" },
        },
        {
          name: "Blazer",
          text: { en: "His up special can be angled to recover more horizontally, and there are several ways to mix up his recovery. (Chrom's travels mainly straight up.)" },
        },
      ],
      strengths: [
        { en: "High kill power." },
        { en: "Moves that are safe on shield." },
        { en: "Speed that many opponents don't know how to deal with." },
      ],
      weaknesses: [
        { en: "A somewhat poor disadvantage state when he's being comboed." },
        { en: "Can be gimped, especially by characters with easy ways to do it." },
        { en: "No projectiles to camp with, or easy answers to someone camping him with projectiles." },
        { en: "Short characters make it hard to space his short-hop and landing aerials." },
      ],
    },
    // Round 922 batch: guides from Smashboards that Matthew copied out by hand (the site blocks automated
    // readers). They date from the game's first months, so each shows when it was written.
    samus: {
      source: { title: "Samus/Dark Samus Competitive Guide", url: "https://smashboards.com/guides/samus-dark-samus-competitive-guide.1175/", by: "Dr. Jay (Smashboards)", written: "December 2018" },
      playstyle: {
        en: "Patient and defensive: the guide calls her “the chess player's character”. She waits across the stage charging her Charge Shot and stopping bad approaches with missiles, then punishes a single mistake hard. She is slow, so her game is about clean, precise moves, reads and reactions rather than fast inputs.",
      },
      traits: [
        {
          name: "Charge Shot",
          text: { en: "The guide says Samus “lives and dies” by it: charge it after every KO and whenever there's a spare second, because the threat of a full charge matters far more than an uncharged shot. It also does heavy damage to shields." },
        },
        {
          name: "Missiles",
          text: { en: "A tilted (homing) missile moves slowly, stays out a while and covers jumping opponents; a smash missile pauses in front of her, then flies fast with more knockback. Both can be followed in behind, and they're also used to cover get-ups, to edgeguard and to stall while charging." },
        },
        {
          name: "Samus or Dark Samus",
          text: { en: "They play the same. The main difference the guide gives is that Dark Samus's projectiles travel lower to the ground, which helps against short characters, while Samus's forward smash reaches slightly further." },
        },
      ],
      strengths: [
        { en: "Heavy, with a good recovery: she can afford trades and survives to high percent." },
        { en: "Hits very hard, so one caught mistake is punished heavily." },
        { en: "Strong projectiles, and several ways to break a shield." },
      ],
      weaknesses: [
        { en: "Lacks mobility and speed." },
        { en: "Floaty, and can't easily get out of being juggled." },
      ],
    },
    yoshi: {
      source: { title: "Competitive Guide to Playing as and Against Yoshi", url: "https://smashboards.com/guides/competitive-guide-to-playing-as-and-against-yoshi-in-smash-ultimate.1168/", by: "Dr. Jay (Smashboards)", written: "December 2018" },
      playstyle: {
        en: "A mobile, rushdown-style character. With the best air speed in the game and a solid dash, Yoshi weaves in and out of range (the guide's phrase is a “guerrilla warfare dinosaur”) and fights mostly with fast aerials that lead into combos and KO confirms. His eggs are a good projectile, but he is more of a rushdown character than a zoner.",
      },
      traits: [
        {
          name: "Double jump armor",
          text: { en: "His midair jump (and Egg Lay and the standing Ground Pound) has armor: he takes the damage but not the knockback. It wins trades and makes recovering much easier. The guide's advice against Yoshi is to watch for the double jump and punish it; one heavy hit goes through the armor." },
        },
        {
          name: "Recovery",
          text: { en: "His up special barely lifts him, so he recovers with his high double jump, air speed and armor instead: throw eggs to get closer, come back above the ledge where possible, and vary it every time." },
        },
        {
          name: "Egg Toss and Ground Pound",
          text: { en: "Eggs can be angled to cover many directions and bounce. Ground Pound is used to recover, edgeguard and KO, and helps him avoid being juggled. The guide says his side special is best avoided." },
        },
      ],
      strengths: [
        { en: "Mobility: the best air speed in the game." },
        { en: "Fast aerials that combo and KO, with a simple, fast-paced combo game." },
        { en: "Strong tech chasing." },
      ],
      weaknesses: [
        { en: "His double jump can be watched for and punished." },
        { en: "Can be outranged while he's in the air doing short-hop aerials." },
      ],
    },
    jigglypuff: {
      source: { title: "Jigglypuff Beginner's Guide", url: "https://smashboards.com/guides/jigglypuff-beginners-guide.1215/", by: "Zarxrax (Smashboards)", written: "March 2019" },
      playstyle: {
        en: "An air fighter through and through. Jigglypuff floats just outside the opponent's range throwing out long-lasting aerials, then weaves in when there's an opening. She is fast in the air and slow on the ground, so the guide says to spend little time grounded and to avoid shielding where possible.",
      },
      traits: [
        {
          name: "Rest",
          text: { en: "Her signature move and one of the strongest in the game, usually landed from a combo. If it misses, she is completely vulnerable for several seconds." },
        },
        {
          name: "Six jumps",
          text: { en: "One from the ground and five in the air. The guide suggests counting them so she never ends up offstage without enough to get back." },
        },
        {
          name: "Shield break",
          text: { en: "If her shield breaks, she loses the stock immediately." },
        },
      ],
      strengths: [
        { en: "Fast air speed and powerful aerials with long-lasting hits." },
        { en: "One of the best edgeguarders in the game." },
        { en: "Rest can end a stock from a combo at mid percent." },
      ],
      weaknesses: [
        { en: "The lightest character in the game, so she is KO'd very easily." },
        { en: "Slow on the ground." },
        { en: "Can struggle against sword characters' large disjointed hits, and against projectiles that travel up into the air." },
      ],
    },
    ganondorf: {
      source: { title: "Hail to the Demon King: A Ganondorf Guide", url: "https://smashboards.com/guides/hail-to-the-demon-king-a-ganondorf-guide-ver-1-7-0.1178/", by: "King9999 (Smashboards)", written: "January 2019, updated through patch 11.0.0" },
      playstyle: {
        en: "Slow and enormously powerful. He hits harder than almost anyone and his sword smash attacks reach a long way, but he moves slowly and his recovery is poor, so opponents who can keep him out have the advantage. Against them the guide advises patience and picking moves carefully.",
      },
      traits: [
        {
          name: "Sword smash attacks",
          text: { en: "All three smash attacks use a greatsword in Ultimate, giving them more range and making them disjointed. His up smash and forward smash reach through platforms." },
        },
        {
          name: "Flame Choke and Dark Dive",
          text: { en: "The guide calls Flame Choke one of his best moves: it grabs the opponent and sets up tech chases. Dark Dive can't be blocked, so it catches opponents who shield expecting a smash attack." },
        },
        {
          name: "Wizard's Foot",
          text: { en: "Can go through some projectiles, but not all." },
        },
      ],
      strengths: [
        { en: "Huge power: few of his moves do under 10% damage." },
        { en: "Much less end lag on his moves than in earlier games." },
        { en: "Long, disjointed smash attacks." },
        { en: "Stages with platforms suit him." },
      ],
      weaknesses: [
        { en: "Low movement speed." },
        { en: "A poor recovery." },
        { en: "Characters who can keep him away have the advantage." },
      ],
    },
    // Round 923 batch: more Smashboards guides from Matthew's document (see the round 922 note above).
    "dr-mario": {
      source: { title: "The Complete Ultimate Dr. Mario Guide", url: "https://smashboards.com/guides/the-complete-ultimate-dr-mario-guide.1207/", by: "ASAP_Smash (Smashboards)", written: "February 2019" },
      playstyle: {
        en: "A slow, hard-hitting version of Mario that the guide calls a high-risk, high-reward glass cannon and a “methodical set-up” character. Because approaching and recovering are bad for him, he stays on the ground, zones with pills to make people jump, and punishes from shield. The guide's word for what he needs is patience.",
      },
      traits: [
        {
          name: "Pills",
          text: { en: "Better suited to zoning than Mario's fireballs: his neutral is about forcing people to jump over them. Some of his bread-and-butter combos start with a pill." },
        },
        {
          name: "Up special out of shield",
          text: { en: "His up special is a strong punish from shield, and his jab and down tilt combo into it for a KO." },
        },
        {
          name: "Neutral air",
          text: { en: "The reverse of most neutral airs: it gets stronger the longer it's out, so he can space it for a stronger hit." },
        },
      ],
      strengths: [
        { en: "A high damage multiplier: he hits harder than Mario." },
        { en: "Better stage control and KO options than Mario." },
      ],
      weaknesses: [
        { en: "A terrible run speed." },
        { en: "A terrible recovery, so he has to play safe near the edge." },
        { en: "Bad at approaching." },
      ],
    },
    mewtwo: {
      source: { title: "Mewtwo Guide", url: "https://smashboards.com/guides/mewtwo-guide.1179/", by: "Macchus (Smashboards)", written: "January 2019" },
      playstyle: {
        en: "A glass cannon. Mewtwo puts out high damage and strong combo strings and has smash attacks that KO at low percent, but his body is huge and he is light and floaty, so he gets comboed and KO'd just as easily. For neutral the guide points to Shadow Ball, down tilt, forward tilt, neutral air, forward air and jab as his reliable tools.",
      },
      traits: [
        {
          name: "Shadow Ball",
          text: { en: "His projectile and a main pressure tool. It can be turned around in the air (B-reversed) and jump-cancelled, and he can follow it in." },
        },
        {
          name: "Teleport",
          text: { en: "His recovery, which the guide rates as strong, and a movement tool on stage." },
        },
        {
          name: "Confusion",
          text: { en: "His side special reflects projectiles, but with a delay, so it has to be used on prediction rather than on reaction." },
        },
      ],
      strengths: [
        { en: "Strong damage and fast movement." },
        { en: "Smash attacks that KO at low percents." },
        { en: "A strong recovery." },
        { en: "Strong combo potential." },
      ],
      weaknesses: [
        { en: "A large body that is juggled easily." },
        { en: "Light and floaty, so he is KO'd early." },
        { en: "All his smash attacks hit on one side only." },
        { en: "No combos from any throw." },
      ],
    },
    chrom: {
      source: { title: "A Comprehensive Competitive Guide to Chrom", url: "https://smashboards.com/guides/a-comprehensive-competitive-guide-to-chrom-ultimates-melee-character.1191/", by: "TheDMatch (Smashboards)", written: "January 2019" },
      playstyle: {
        en: "A fast sword character who rushes down, hits with several low-lag aerials and finishes with plenty of kill confirms. The guide compares him to Melee's Marth for his quick movement, combos and flow. His neutral and his best moves revolve around his aerials, and he is a threat on the ground too.",
      },
      traits: [
        {
          name: "Compared with Roy",
          text: { en: "His sword does the same damage along its whole length, where Roy's is strongest at the hilt. That makes spacing with it easier and his KOs more consistent; Roy can KO earlier and has the better recovery." },
        },
        {
          name: "Soaring Slash (up special)",
          text: { en: "The guide calls it probably his best move as an attack: a big first hit, super armor at the start, about 23% if every hit connects, and one of his fastest options out of shield. As a recovery it goes mostly straight up." },
        },
        {
          name: "Aerials",
          text: { en: "Neutral air, forward air and up air are rated among the best aerials in the game; falling up air starts combos and juggles, and up air is his fastest out-of-shield option." },
        },
      ],
      strengths: [
        { en: "Speed: the 11th best initial dash and 4th best air speed, on a comfortably heavy character." },
        { en: "Consistent KO power with many kill confirms." },
        { en: "Excellent juggling." },
      ],
      weaknesses: [
        { en: "A recovery on the bad side: it can be exploited, especially by characters with good edgeguards." },
        { en: "A situational neutral special." },
      ],
    },
    sonic: {
      source: { title: "Art of Sonic Guide for Ultimate", url: "https://smashboards.com/guides/art-of-sonic-guide-for-ultimate-completed-more-updates-in-the-future.1192/", by: "Sonic Meaper (Smashboards)", written: "January 2019" },
      playstyle: {
        en: "The guide describes Smash 4's Sonic as a heavy bait-and-punish character built around Spin Dash, and Ultimate's Sonic as one who uses many tools instead, because Spin Dash was weakened (an uncharged one stops at a shield). It says he does better than before in both advantage and disadvantage.",
      },
      traits: [
        {
          name: "Spin Dash",
          text: { en: "No longer the center of his game: it stops at shields unless charged." },
        },
        {
          name: "Homing Attack",
          text: { en: "Starts much faster than in Smash 4, which the guide says makes it almost impossible to react to, and it helps him get out of disadvantage as long as it isn't overused." },
        },
        {
          name: "Spring Jump",
          text: { en: "His up special, part of a recovery the guide lists among his strengths." },
        },
      ],
      strengths: [
        { en: "Combo game." },
        { en: "Recovery." },
        { en: "Edgeguarding." },
        { en: "Higher damage output than in Smash 4." },
      ],
      weaknesses: [
        { en: "Finds it harder to take stocks." },
        { en: "Weaker defensive options." },
        { en: "Lighter than before." },
      ],
    },
    rob: {
      source: { title: "Robotic Operating Basics", url: "https://smashboards.com/guides/robotic-operating-basics.1185/", by: "Jams. (Smashboards)", written: "January 2019" },
      playstyle: {
        en: "R.O.B. generally wants to make the opponent come to him, using his two projectiles, the laser and the Gyro. When he has to approach, neutral air is his strong tool against characters with mediocre range, and forward air against long-range characters like swordfighters. He is very strong at the ledge and offstage.",
      },
      traits: [
        {
          name: "Robo Beam (laser)",
          text: { en: "Can be aimed up to catch jump-ins or down to hit small characters. Like Gyro it is laggy, so at mid range it can be punished by jumping over it." },
        },
        {
          name: "Gyro",
          text: { en: "A spinning top he charges and throws, which then stays on the stage as an item. It sets up ledge traps and combos, for example hitting the opponent into a Gyro lying behind them." },
        },
        {
          name: "Neutral air",
          text: { en: "A strong edgeguard that KOs very early offstage, and a ledge trap that covers several get-up options. Spaced, it is safe on shield." },
        },
        {
          name: "Robo Burner",
          text: { en: "His up special. Besides recovering, it lets him follow up where his normal air movement can't, and get past opponents who rely on horizontal projectiles." },
        },
      ],
      strengths: [
        { en: "Projectiles that force the opponent to approach." },
        { en: "Edgeguarding and ledge trapping." },
        { en: "A down air spike that the guide says demolishes linear, delayed recoveries." },
      ],
      weaknesses: [
        { en: "Pretty terrible in disadvantage: a huge frame with mediocre frame data and nothing to escape true combos with." },
        { en: "His projectiles are laggy and punishable at mid range." },
      ],
    },
    greninja: {
      source: { title: "Greninjuts-Two: A Beginner to Intermediate Guide to Greninja", url: "https://smashboards.com/guides/greninjuts-two.1202/", by: "Ludi (Ludiloco on Smashboards)", written: "February 2019" },
      playstyle: {
        en: "Bait and punish. Greninja has some of the best mobility in the game, but his moves are fairly committal and his approaches fairly linear, so the guide has him use that speed to feint, draw a response and punish it rather than rush in. Water Shuriken, his long-range projectile, makes opponents come to him. The guide warns he can't be played recklessly.",
      },
      traits: [
        {
          name: "Water Shuriken",
          text: { en: "An exceptional long-range projectile and an important tool for his bait-and-punish game." },
        },
        {
          name: "Mobility",
          text: { en: "His neutral relies on it: he approaches with a feint, and punishes when the opponent contests the feint." },
        },
        {
          name: "Combos",
          text: { en: "The guide describes one of the most diverse and deep combo trees, rewarding players who can execute it." },
        },
      ],
      strengths: [
        { en: "Blistering mobility." },
        { en: "A deep, varied combo game." },
        { en: "One of the most unique kits for baiting and punishing." },
      ],
      weaknesses: [
        { en: "His moves are medium-to-large commitments." },
        { en: "Most of his approach options are fairly linear." },
        { en: "The guide says he may not suit players who struggle to control very fast characters, or to use a recovery that has no hitbox." },
      ],
    },
    // Round 926 batch: the last usable guides in Matthew's Smashboards document.
    palutena: {
      source: { title: "The playful Goddess of Skyworld: Lady Palutena", url: "https://smashboards.com/guides/the-playful-goddess-of-skyworld-lady-palutena.1176/", by: "BelChydru (Smashboards)", written: "December 2018" },
      playstyle: {
        en: "A bait-and-punish character: the guide says she thrives by tricking the opponent into thinking they can punish her, then capitalizing on their mistake. Her speed and her aerials let her punish consistently, and she is elusive on stage and strong at edgeguarding.",
      },
      traits: [
        {
          name: "Back air and forward air",
          text: { en: "Forward air is her spacing tool and starts combos at low to mid percent. The guide says opponents need a very long-reaching hit to challenge back air; it is her best edgeguarding tool and a KO move." },
        },
        {
          name: "Jab and down tilt",
          text: { en: "The first hit of jab pokes shields and baits; down tilt starts slowly but ends deceptively fast, which makes it a good bait in neutral." },
        },
        {
          name: "Warp",
          text: { en: "Her up special: she disappears and reappears where she chooses, invisible and unable to be hit on the way. The guide uses it strictly for recovering, and says it makes her hard to punish when she goes offstage to edgeguard." },
        },
      ],
      strengths: [
        { en: "Edgeguards with ease, with a reliable spike." },
        { en: "Projectiles with decent damage and KO potential." },
        { en: "Throw combos, and a throw that KOs." },
        { en: "Two invincible moves." },
      ],
      weaknesses: [
        { en: "A poor ground game, because her jab and tilts are slow." },
        { en: "Not very good options out of shield." },
        { en: "Struggles with up-close pressure." },
      ],
    },
    hero: {
      source: { title: "My definitive Hero guide", url: "https://smashboards.com/guides/my-definitive-hero-guide.1279/", by: "Linkmain-maybe (Smashboards)", written: "January 2022" },
      playstyle: {
        en: "The guide's author stresses they aren't a professional. In their description Hero has a difficult neutral, with no burst options and few safe moves, so he conditions the opponent with long-range spells and wins exchanges on reads. His reward is in advantage: big single hits rather than combos, and taking stocks extremely early, which the guide calls his biggest strength.",
      },
      traits: [
        {
          name: "Spells and MP",
          text: { en: "His specials cost MP. Frizz and Zap are his main tools for testing an opponent's habits; his recovery spells (Woosh and Zoom) cost MP too, so he recovers with jumps and air dodges when he can. He regains MP while hanging on the ledge." },
        },
        {
          name: "The spell menu",
          text: { en: "The guide rates his menu of spells very powerful at the ledge, for catching opponents as they grab it or stall there. Flame Slash and Kacrackle Slash are two of the strong spells it describes." },
        },
        {
          name: "Up tilt",
          text: { en: "The move that carries his juggling: exceptionally long range, and it forces air dodges." },
        },
      ],
      strengths: [
        { en: "Takes stocks extremely early." },
        { en: "Strong edgeguarding, thanks to a far-reaching recovery and strong aerials." },
        { en: "Good tech-chase potential." },
      ],
      weaknesses: [
        { en: "A difficult neutral: no burst options and few safe moves." },
        { en: "Tall and heavy, so he is very easy to combo, with limited options under pressure." },
        { en: "Being pressured in shield is one of his biggest weaknesses." },
      ],
    },
    cloud: {
      source: { title: "BREAKING THE LIMITS: Cloud Guide", url: "https://smashboards.com/guides/breaking-the-limits-cloud-guide-ssbu.1210/", by: "Afro Ninja (Smashboards)", written: "February 2019" },
      playstyle: {
        en: "A well-rounded swordsman with a good neutral game and some of the biggest disjointed hits in the game. The guide calls him easy for beginners, and a good second character to cover a main who struggles against swords.",
      },
      traits: [
        {
          name: "Limit",
          text: { en: "His charge mechanic. It is weaker than in Smash 4 but still gives good comeback potential, and his recovery depends on it: without Limit it is very exploitable." },
        },
      ],
      strengths: [
        { en: "A good neutral game." },
        { en: "Some of the biggest disjointed hitboxes in the game." },
        { en: "A good juggle and combo game." },
        { en: "Decent weight, which gives him good survivability." },
        { en: "Easy to pick up." },
      ],
      weaknesses: [
        { en: "Without Limit, his recovery is very exploitable." },
        { en: "Despite his reach, he can still be walled out by strong zoners." },
      ],
    },
    snake: {
      source: { title: "Solid Snake Guide", url: "https://smashboards.com/guides/solid-snake-guide.1219/", by: "Falc01 (Smashboards)", written: "March 2019" },
      playstyle: {
        en: "Snake controls the game and its pace with explosives. The guide says he wants grenades out most of the time, either dropped while jumping in to approach or laid around the stage so the opponent has to come to him, and that good Snake players are always in control through this move.",
      },
      traits: [
        {
          name: "Grenades",
          text: { en: "He can have two out at once, and can drop them by shielding or rolling while holding one. Holding a grenade when hit blows up both players, so he can go for trades when he's even or ahead on stocks." },
        },
        {
          name: "C4",
          text: { en: "A stage-control tool that he detonates himself. The guide suggests placing it at one edge of the stage rather than the center, and warns that it goes off on its own after half a minute." },
        },
        {
          name: "Nikita",
          text: { en: "His edgeguarding tool. It leaves him quite vulnerable, so the guide says to use it only when the opponent is offstage, and to aim it above them to limit their options." },
        },
        {
          name: "Up smash",
          text: { en: "An unorthodox smash attack that the guide treats as a neutral and ledge-trap tool, for opponents who keep trying to jump over him." },
        },
      ],
      strengths: [
        { en: "Controls space and the pace of the match with grenades and C4." },
        { en: "A forward smash that does huge damage and can KO very early, on a hard read." },
        { en: "Strong edgeguarding with Nikita." },
      ],
      weaknesses: [
        { en: "His own explosives can hurt or KO him." },
        { en: "His strongest hits are slow and punishable if dodged or baited." },
      ],
    },
    inkling: {
      source: { title: "Stay Fresh!! An Inkling Guide (parts 1 and 2)", url: "https://smashboards.com/guides/stay-fresh-an-inkling-guide-part-1-moveset-and-uses.1224/", by: "Ink Floyd (Smashboards)", written: "March 2019" },
      playstyle: {
        en: "At the start of a match Inkling's main goal in neutral is a grab, which opens the most options for damage: punish a spacing mistake with one, or bait the opponent into trying to punish and grab instead. From the throw she starts a combo and keeps the pressure on.",
      },
      traits: [
        {
          name: "Ink",
          text: { en: "Some of her attacks cover the opponent in ink, and an inked opponent takes more damage. The rapid jab is one way to apply it." },
        },
        {
          name: "Splat Roller",
          text: { en: "Her side special, one of her ways to take a stock: landing it and following up." },
        },
        {
          name: "Ways to take a stock",
          text: { en: "The guide lists three: edgeguarding, landing a roller and following up, or a grab into up throw and up air." },
        },
      ],
      strengths: [
        { en: "A grab that leads into combos and pressure." },
        { en: "Good movement tools for baiting: the guide points to fox-trotting and dash dancing." },
      ],
      weaknesses: [],
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
    mario: {
      source: {
        title: "The Fundamentals of Mario",
        url: "https://docs.google.com/document/d/1EhHgPgiP72WuTRw4lpISYVsJuxNzydjTogpHqy_rSuI/edit",
        by: "Reynolds",
      },
      playstyle: {
        en: "An improvisational character. The guide says Mario has no highly centralizing tools, just a lot of okay options, so there are always several paths once he gets an opening, and few bread-and-butter combos to fish for. Because openings are hard to find as Mario, the advice is to space just outside the opponent's reach, punish what misses, make every opening count, and not overextend.",
      },
      traits: [
        {
          name: "Compared with Dr. Mario",
          text: { en: "Slightly better reach, less landing lag on every aerial, and better launch angles (up tilt especially). His aerials are weaker, which lets combos go on longer. Dr. Mario has stronger hits and more guaranteed finishers; the guide's view is that if either is stronger, it's marginal." },
        },
        {
          name: "Fireballs",
          text: { en: "The author prefers them to Dr. Mario's pills: they contest campy opponents, help his own recovery and edgeguards, and are his only practical true jab reset." },
        },
        {
          name: "Forward smash",
          text: { en: "A large, powerful, disjointed hit that lingers. It gives easy kill confirms and a space the opponent has to respect." },
        },
      ],
      strengths: [
        { en: "Several tools usually apply in the same situation, so his punishes can go many ways." },
        { en: "Combos extend further thanks to weaker aerials and low landing lag." },
        { en: "Less explored than popular characters, with room to develop a style of your own." },
      ],
      weaknesses: [
        { en: "Finding an opening is hard." },
        { en: "Nothing in his kit is particularly powerful." },
        { en: "Faster characters such as Fox close and create distance much more quickly than he can." },
      ],
    },
    // Round 928 batch: Melee guides from Smashboards that Matthew copied out. Older than the Ultimate ones,
    // but Melee itself hasn't changed; what dates is the players' understanding of it, so each still shows
    // when it was written. Tier placements in the guides are left out.
    fox: {
      source: { title: "Guide to Ace Arwing Pilot Fox McCloud", url: "https://smashboards.com/guides/guide-to-ace-arwing-pilot-fox-mccloud-updated-for-2015.100/", by: "CunningKitsune (Smashboards)", written: "2004, updated through February 2015" },
      // Matthew's own edits (round 933): the playstyle wording, and what Shine and Laser say. The two move
      // facts (Shine on frame 1 and invincible; Laser's end lag cancelled by landing) are his, not the guide's,
      // so the page credits the guide "with Smashy's own edits".
      edited: true,
      playstyle: {
        en: "Very fast and very technical. Lightning-quick moves, fast and effective finishers, versatile play and a projectile he can fire constantly, and he is second to none in the hands of an experienced, technically sound player. Excelling with him takes a lot of time and consistent practice.",
        es: "Muy rápido y muy técnico. Movimientos fulgurantes, remates rápidos y eficaces, un juego versátil y un proyectil que puede disparar sin parar, y no tiene rival en manos de un jugador con experiencia y buena técnica. Destacar con él exige mucho tiempo y práctica constante.",
        fr: "Très rapide et très technique. Des coups fulgurants, des finishers rapides et efficaces, un jeu polyvalent et un projectile qu’il peut tirer sans arrêt : il n’a pas d’égal entre les mains d’un joueur expérimenté et solide techniquement. Exceller avec lui demande beaucoup de temps et un entraînement régulier.",
        ja: "とても速く、とてもテクニカルなキャラです。電光石火のワザ、速くて効果的な締めのワザ、多彩な戦い方、絶え間なく撃てる飛び道具を持ち、経験があり技術のしっかりしたプレイヤーが使えば右に出るものはいません。フォックスで上達するには多くの時間と継続的な練習が必要です。",
      },
      traits: [
        {
          name: "Shine",
          text: {
            en: "His Reflector, frame 1 and invincible.",
            es: "Su Reflector: sale en el frame 1 y es invencible.",
            fr: "Son Réflecteur : frame 1 et invincible.",
            ja: "リフレクターのこと。発生1フレームで無敵です。",
          },
        },
        {
          name: "Laser",
          text: {
            en: "A projectile he can spam, with end lag being canceled by landing.",
            es: "Un proyectil que puede disparar sin parar; el lag final se cancela al aterrizar.",
            fr: "Un projectile qu’il peut tirer en boucle ; le lag de fin est annulé à l’atterrissage.",
            ja: "連発できる飛び道具です。着地すると後隙がキャンセルされます。",
          },
        },
        {
          name: "Fast-faller",
          text: {
            en: "Both a strength and a weakness.",
            es: "Una ventaja y un inconveniente a la vez.",
            fr: "À la fois une force et une faiblesse.",
            ja: "強みでもあり、弱みでもあります。",
          },
        },
      ],
      strengths: [
        { en: "Lightning speed on nearly every move, with little lag." },
        { en: "Great at controlling the pace of the fight." },
        { en: "A combo character with fast, effective finishers." },
        { en: "A very powerful grab game." },
        { en: "A very adaptive playing style." },
      ],
      weaknesses: [
        { en: "Fast-paced, demanding and often unforgiving controls; consistency suffers without regular practice or under pressure." },
        { en: "Many opportunities to self-destruct." },
        { en: "His recoveries can be edgeguarded relatively well." },
        { en: "Low overall range." },
        { en: "So common in tournaments that nearly every player has experience against him." },
      ],
    },
    falco: {
      source: { title: "EH | Saiblade's Comprehensive Guide to Falco", url: "https://smashboards.com/guides/eh-saiblades-comprehensive-guide-to-falco-wip.585/", by: "Saiblade (Smashboards)", written: "August 2015" },
      playstyle: {
        en: "A fast character with a plethora of options, who is great at putting on pressure, restricting what the opponent can do, and walling out certain opponents. The guide is written for total beginners and starts from the techniques every new Falco needs: short hopping, fast falling, wavedashing and jump cancelling.",
      },
      traits: [
        {
          name: "Laser",
          text: { en: "The guide says it is arguably the best projectile in the game." },
        },
        {
          name: "Shield pressure",
          text: { en: "Listed as amazing, helped by many moves that come out early." },
        },
        {
          name: "Fast-faller",
          text: { en: "Listed as both a strength and a weakness." },
        },
      ],
      strengths: [
        { en: "Fantastic aerials and amazing jump heights." },
        { en: "Incredible combo potential." },
        { en: "Great at pressure and at restricting options." },
        { en: "Fast." },
      ],
      weaknesses: [
        { en: "Not the greatest of recoveries." },
        { en: "Requires a lot of technique, and so fast hands." },
      ],
    },
    "captain-falcon": {
      source: { title: "SSBM - The Falcon Talk", url: "https://smashboards.com/guides/ssbm-the-falcon-talk.1098/", by: "magicsixball (Smashboards)", written: "June 2017" },
      playstyle: {
        en: "The fastest character on the ground, with some of the best mobility in the air, who has to win through movement and precision. The guide's first lesson is not to try to out-speed other characters' attacks, because their hitboxes are all faster than his: play around the opponent's options instead. It says Falcon requires discipline and precision, and has a lot of potential.",
      },
      traits: [
        {
          name: "Grounded movement",
          text: { en: "Most of the guide's notes are on this: dash dances of varied speed and range, short dashes, fox-trots, wavedashes, pivots and stopping his momentum by crouching." },
        },
        {
          name: "Spacing with jumps and drift",
          text: { en: "The other half of his neutral: using his jump and air drift to place himself." },
        },
      ],
      strengths: [
        { en: "The fastest ground speed in the game." },
        { en: "One of the best for aerial mobility." },
      ],
      weaknesses: [
        { en: "A poor recovery." },
        { en: "Slow hitboxes, and no fast options on the ground." },
        { en: "Weaknesses that opponents can exploit; the guide's advice is to accept them early and make them harder to exploit." },
      ],
    },
    bowser: {
      source: { title: "Koopa King", url: "https://smashboards.com/guides/koopa-king.194/", by: "Sauron_The_Great (Smashboards)", written: "January 2015" },
      playstyle: {
        en: "Heavy, slow and strong: a scary opponent at close range who is extremely hard to KO. The guide says he has few options, so he has to keep dominance on the ground, ideally on small stages, and lean on his strength: forward smash, Fire Breath for quick damage, and Koopa Klaw.",
      },
      traits: [
        {
          name: "Up special out of shield",
          text: { en: "Shield an attack at close range, then use his up special. The guide's words: it hurts a lot." },
        },
        {
          name: "Fire Breath",
          text: { en: "Racks up damage quickly and edgeguards well." },
        },
        {
          name: "Koopa Klaw (side special)",
          text: { en: "Powerful and fairly long-ranged, but it can take him off the stage with the opponent." },
        },
      ],
      strengths: [
        { en: "The heaviest character in the game, so he is hard to KO." },
        { en: "One of the strongest characters; up air and forward air are extremely powerful." },
        { en: "Decent hitboxes on most moves." },
      ],
      weaknesses: [
        { en: "Heavy, big and slow, so he is extremely easy to combo." },
        { en: "A very bad recovery with little vertical range." },
        { en: "No reliable way to deal with projectiles." },
        { en: "Poor combos and few ways to punish." },
      ],
    },
    "ice-climbers": {
      source: { title: "How to play Ice Climbers, without wobbling", url: "https://smashboards.com/guides/how-to-play-ice-climbers-without-wobbling-wip.1069/", by: "Nametaken121 (Smashboards)", written: "March 2017" },
      playstyle: {
        en: "Look for a grab. The basics, in the guide's words, are to stand just outside the reach of the opponent's approach and answer it with a grab, which leads to chain grabs between the two climbers (or to wobbling, their infinite, which this guide deliberately plays without). Against opponents camping on platforms, their up air pokes them back down.",
      },
      traits: [
        {
          name: "Two climbers",
          text: { en: "Popo and Nana count as two characters, which is what makes their grab combos possible. Together their recovery is decent; Popo alone has the worst in the game." },
        },
        {
          name: "Wobbling",
          text: { en: "An infinite from a grab, in which the two climbers keep hitting the opponent so they can never act. The guide calls relying on it a crutch and teaches the rest of their game." },
        },
        {
          name: "Wavedash",
          text: { en: "The second longest in the game." },
        },
      ],
      strengths: [
        { en: "Grabs that lead to chain grabs and very large punishes." },
        { en: "A long wavedash." },
        { en: "A disjointed up air for reaching platforms." },
      ],
      weaknesses: [
        { en: "Popo alone has the worst recovery." },
        { en: "The guide's author believes top-tier characters have moves that beat out most of theirs." },
      ],
    },
    "mr-game-and-watch": {
      source: { title: "Flatten The Competition: A Game and Watch Guide", url: "https://smashboards.com/guides/flatten-the-competition-a-game-and-watch-guide.43/", by: "LiteralGrill (Smashboards)", written: "October 2014" },
      playstyle: {
        en: "A light, rarely played character with serious combo potential. The guide says he takes work: his defense is bad, so players are told to master light shielding and wavedashing, and to avoid attacks rather than shield them. When he gets a hit or a grab, knowing the follow-up is where his strength lies.",
      },
      traits: [
        {
          name: "Judge",
          text: { en: "His hammer shows a random number from 1 to 9 with a different effect each time. A 9 does 32% and can KO at single-digit percents; an 8 freezes the opponent." },
        },
        {
          name: "Oil Panic",
          text: { en: "Listed with Judge as a move that can KO in one hit." },
        },
      ],
      strengths: [
        { en: "Powerful killing moves, and moves that stay out a long time." },
        { en: "Several disjointed attacks." },
        { en: "A grab game with chain grabs and combos." },
        { en: "Good edgeguarding and good combo potential." },
        { en: "Few people know how to play against him." },
      ],
      weaknesses: [
        { en: "The second lightest character, so he doesn't live long, and he is easily comboed." },
        { en: "A bad defensive game: a bad shield, poor options out of shield, a bad roll and sidestep." },
        { en: "Awful to approach with, and slow overall." },
        { en: "A predictable recovery." },
        { en: "Only two of his aerials can be L-cancelled." },
      ],
    },
    // Round 929 batch: the rest of the Melee guides Matthew copied out (his second document).
    jigglypuff: {
      source: { title: "Become the next Sleepy Singer!", url: "https://smashboards.com/guides/become-the-next-sleepy-singer.689/", by: "tough9870 (Smashboards)", written: "November 2015" },
      playstyle: {
        en: "An aerial character. The guide's author, who says they aren't a professional, describes a ground game that runs from decent to not so good and an air game that is spot on: fast attacks, the best maneuverability in the air, and Rest, a KO move that is ready at almost any time. The advice is to stay in the air and approach with forward, neutral and back airs, which are safe when spaced.",
      },
      traits: [
        {
          name: "Rest",
          text: { en: "The strongest instant-knockback move in the game. If it misses, Jigglypuff is left extremely vulnerable." },
        },
        {
          name: "Wall of Pain",
          text: { en: "A string of back airs or forward airs, which can lead into other moves, including Rest." },
        },
        {
          name: "Pound",
          text: { en: "Useful as a mix-up when approaching." },
        },
      ],
      strengths: [
        { en: "The fastest maneuverability in the air, and possibly the greatest aerial game in Melee." },
        { en: "A deadly edgeguarding game." },
        { en: "Excellent recovery options." },
        { en: "Light, so she escapes combos easily." },
        { en: "Great combo potential and powerful smash attacks." },
      ],
      weaknesses: [
        { en: "Light, so she is KO'd early." },
        { en: "Slow walking and running, with a short wavedash and dash dance." },
        { en: "No projectile." },
        { en: "A missed Rest is punished heavily." },
      ],
    },
    kirby: {
      source: { title: "Kirby: What I've discovered", url: "https://smashboards.com/guides/kirby-what-ive-discovered.1117/", by: "Dupe (Smashboards)", written: "October 2017" },
      playstyle: {
        en: "The guide says Kirby's neutral is like Jigglypuff's, only worse at it, because he lacks her drift in the air. So he combines spaced back airs with his ground movement to build a wall: back air and forward air in the air, forward and up tilts on the ground. His movement is clunky at first but workable across small areas.",
      },
      traits: [
        {
          name: "Movement",
          text: { en: "18th in dash speed and 17th in wavedash length." },
        },
        {
          name: "Recovery",
          text: { en: "Above the stage it is one of the better ones, alongside Jigglypuff's and Peach's. Level with the ledge or below it, he has to use his up special, which is easy to hit and to keep offstage." },
        },
      ],
      strengths: [
        { en: "A good recovery from above the stage." },
        { en: "Back air spacing that can form a decent wall." },
      ],
      weaknesses: [
        { en: "Little drift in the air." },
        { en: "A terrible up special for recovering from low." },
        { en: "Needs near frame-perfect movement against Fox and Falco." },
      ],
    },
    luigi: {
      source: { title: "Luigi | A Guide to Mastery", url: "https://smashboards.com/guides/luigi-a-guide-to-mastery-by-dire-creeper-outdated-read-the-note.506/", by: "Dire Creeper (Smashboards)", written: "June 2015; its author marks it as outdated" },
      playstyle: {
        en: "Odd in a new player's hands, powerful and agile in a smart player's. The guide says his ground movement is ridiculously fast and versatile because he has the longest wavedash in the game, and that his aerials are some of the best for their power, speed and low lag. He has the worst horizontal air speed, so he relies on that wavedash to move and approach. The guide calls him very difficult to master.",
      },
      traits: [
        {
          name: "Wavedash",
          text: { en: "The longest in the game, and the basis of how he moves and approaches." },
        },
        {
          name: "Floatiness",
          text: { en: "It helps his combos and air game, keeps him out of most mid-to-high percent combos and chain grabs, and helps his recovery; it works against him when he is being juggled and needs to land." },
        },
        {
          name: "Neutral air",
          text: { en: "One of the best of its kind: out on frame 3, sends straight up, and interrupts opponents' combos." },
        },
      ],
      strengths: [
        { en: "Very fast, versatile ground movement." },
        { en: "Some of the best aerials in the game, and a good variety of KO and combo moves." },
        { en: "High priority on his moves." },
      ],
      weaknesses: [
        { en: "The worst horizontal air speed in the game." },
        { en: "A predictable recovery that is easy to edgeguard, despite its distance." },
        { en: "Needs very high technical skill and fast hands." },
      ],
    },
    marth: {
      source: { title: "It's All About the Spacing", url: "https://smashboards.com/guides/its-all-about-the-spacing.172/", by: "JUSTN (Smashboards)", written: "January 2015, updated March 2015" },
      playstyle: {
        en: "A swordsman who wins on range and spacing. The guide, whose author says they are no expert, describes a sword that out-ranges opponents up close and quick attacks that interrupt them. Its title is the lesson: space attacks so the tip of the sword connects.",
      },
      traits: [
        {
          name: "The tipper",
          text: { en: "His sword does much more damage and knockback at its tip. The guide calls it his bread and butter." },
        },
        {
          name: "Forward air",
          text: { en: "Described as a Marth player's most used move: it interrupts opponents' aerials, can lead to a grab, and starts the Ken Combo." },
        },
        {
          name: "Forward smash",
          text: { en: "One of his best attacks and his most reliable finisher; tipped, it KOs at low percent." },
        },
      ],
      strengths: [
        { en: "Out-ranges opponents at close quarters." },
        { en: "Quick attacks that interrupt." },
      ],
      weaknesses: [
        { en: "His weight makes him easy to chain grab, and Fox and Falco can combo him heavily." },
        { en: "A predictable recovery that is easily edgeguarded." },
        { en: "Little shield pressure." },
      ],
    },
    mewtwo: {
      source: { title: "The forgotten #150 pokemon", url: "https://smashboards.com/guides/the-forgotten-150-pokemon.757/", by: "ShadowKing (Smashboards)", written: "December 2015" },
      playstyle: {
        en: "A short guide written to show Mewtwo is better than his reputation. It points to his tail as his best spacing tool, Shadow Ball as a very strong projectile, down tilt as a combo starter and up tilt as a juggle and KO move.",
      },
      traits: [
        {
          name: "Tail",
          text: { en: "His best spacing tool." },
        },
        {
          name: "Shadow Ball",
          text: { en: "A very strong projectile." },
        },
      ],
      strengths: [
        { en: "One of the best recoveries." },
        { en: "The third best wavedash." },
        { en: "Strong KO moves." },
      ],
      weaknesses: [
        { en: "Light, so he can be KO'd very early." },
        { en: "Can be comboed at any percent." },
        { en: "Lacks speed." },
      ],
    },
    ness: {
      source: { title: "Ness", url: "https://smashboards.com/guides/ness.1057/", by: "Chief_ (Smashboards)", written: "February 2017" },
      playstyle: {
        en: "The guide calls Ness a fundamental and complex character. His neutral is built on the double jump cancel, which lets him vary his movement on the ground, on platforms and when landing; he uses PK Fire to make space, dash dancing to bait, and spaced forward airs to gain ground and start pressure.",
      },
      traits: [
        {
          name: "Double jump cancel",
          text: { en: "A technique with his second jump (the guide writes DJC). It makes his aerials good for mix-ups, for hitting awkward angles and for poking through platforms." },
        },
        {
          name: "Punishes",
          text: { en: "From a dash attack, down throw or up throw he follows with forward air or up air; a down air can lead to a tech chase on fast-fallers." },
        },
      ],
      strengths: [
        { en: "Forward air has good knockback and combo potential." },
        { en: "Down air and his up special can gimp fast-fallers early." },
        { en: "Up air is good for juggling." },
      ],
      weaknesses: [
        { en: "A bad recovery." },
        { en: "Limited options from the ledge." },
        { en: "A terrible jab and a short grab range." },
      ],
    },
    peach: {
      source: { title: "Fieari's Newbie Peach Training Guide", url: "https://smashboards.com/guides/fiearis-newbie-peach-training-guide.1074/", by: "Fieari, reposted by ZexM (Smashboards)", written: "2004" },
      playstyle: {
        en: "A beginner's guide from 2004. It describes Peach as a wicked brawler at close range whose ground game is mostly three things: down smash, dash attack and turnips. What sets her apart is her float, which she uses to hover at head height where most ground attacks miss her, and to attack on the way down.",
      },
      traits: [
        {
          name: "Float",
          text: { en: "Holding jump lets her hover. Floating level with the opponent's face makes most of their ground attacks miss and forces them to jump at her." },
        },
        {
          name: "Float cancel",
          text: { en: "An aerial started while floating has its landing lag cancelled when she drops, faster than L-cancelling. The guide's first combo from it is a float-cancelled aerial into down smash." },
        },
        {
          name: "Turnips",
          text: { en: "She pulls them from the ground and throws them: her projectile, and one of her three main ground tools." },
        },
      ],
      strengths: [
        { en: "Strong close-quarters attacks." },
        { en: "Floating lets her avoid ground attacks and attack with almost no landing lag." },
      ],
      weaknesses: [],
    },
    pichu: {
      source: { title: "Pichu Power of The Mouse", url: "https://smashboards.com/guides/pichu-power-of-the-mouse.311/", by: "Ace Mcconnell (Smashboards)", written: "March 2015" },
      playstyle: {
        en: "The guide's author, who doesn't claim to be a pro, opens by saying Pichu is fundamentally flawed and then explains how to play him anyway. The core idea is to keep self-damage down: use neutral air where forward air or down air would do, and save the electric moves for where they matter, such as Thunder Jolt for pressure and edgeguarding.",
      },
      traits: [
        {
          name: "Self-damage",
          text: { en: "His electric attacks hurt him too: about 1% from Thunder Jolt and 4% each time he uses his up special." },
        },
        {
          name: "Thunder Jolt",
          text: { en: "His only projectile. The guide says to use it in the air where possible, and that its slow travel makes it an effective edgeguard." },
        },
        {
          name: "Recovery",
          text: { en: "Very reliable, though predictable: side special, then jump, then up special gets him back from almost anywhere." },
        },
      ],
      strengths: [
        { en: "A very reliable recovery." },
        { en: "A projectile that pressures and edgeguards." },
      ],
      weaknesses: [
        { en: "Half his moves damage himself." },
        { en: "Poor attack range." },
      ],
    },
    samus: {
      source: { title: "Samus: The Missile Maniac", url: "https://smashboards.com/guides/samus-the-missile-maniac.260/", by: "gamegod7 (Smashboards)", written: "February 2015" },
      playstyle: {
        en: "An introduction for new Samus players. It describes a floaty, hard-to-KO character with solid projectiles that make space and can KO at high percent, who moves well on the ground through wavedashing. The guide recommends her to players who don't want to learn a huge amount of technique before being a threat.",
      },
      traits: [
        {
          name: "Missiles and missile cancelling",
          text: { en: "Missile cancelling lets her have several projectiles out at once." },
        },
        {
          name: "Grapple Beam",
          text: { en: "The longest grab in the game, and it can latch onto the stage to recover, which makes her harder to edgeguard. As a grab it is slow and easy to punish." },
        },
        {
          name: "Neutral air",
          text: { en: "A long-lasting aerial with a lot of priority." },
        },
      ],
      strengths: [
        { en: "Floaty: she recovers from long distances and is hard to KO." },
        { en: "Solid projectiles." },
        { en: "A good crouch cancel, which helps her survive at high percents." },
        { en: "A wall jump." },
      ],
      weaknesses: [
        { en: "Heavy, so without good DI she can be comboed easily." },
        { en: "Very few options out of shield." },
        { en: "A slow, dangerous grab." },
      ],
    },
    sheik: {
      source: { title: "Ocarina' is like Steins;Gate", url: "https://smashboards.com/guides/ocarina-is-like-steins-gate.244/", by: "dude it's raining (Smashboards)", written: "February 2015" },
      playstyle: {
        en: "Sheik's general strategy, in the guide's words: rack up damage with needles and her strong grab game, then start a combo with her strong tilts that leads to a KO or an edgeguard. She also looks to gimp at early percents because of her offstage game. Early in a stock, when many of her moves can be crouch cancelled, the guide says her best punish is a grab.",
      },
      traits: [
        {
          name: "Needles",
          text: { en: "An excellent projectile for building damage and for edgeguarding." },
        },
        {
          name: "Tilts",
          text: { en: "All extremely fast and strong, and they lead into each other and into her aerials." },
        },
        {
          name: "Grab game",
          text: { en: "Down throw leads into follow-ups, chain grabs and tech chases." },
        },
      ],
      strengths: [
        { en: "Tech chasing." },
        { en: "Edgeguarding with back air and needles." },
        { en: "High ground speed, which gives her strong stage control." },
        { en: "Fast, powerful attacks; the guide says technical skill matters less for her than for most." },
      ],
      weaknesses: [
        { en: "A very punishable recovery." },
        { en: "Her weight makes her susceptible to many combos." },
        { en: "Much of her moveset can be crouch cancelled at early percents." },
        { en: "A short dash dance and wavedash." },
      ],
    },
    ganondorf: {
      source: { title: "The Power of The Triforce", url: "https://smashboards.com/guides/the-power-of-the-triforce.58/", by: "Sauron_The_Great (Smashboards)", written: "October 2014" },
      playstyle: {
        en: "A short, casual guide. Its summary: his attacks are slow but strong, and he can be played as all-out attack or as rock-solid defense. It rates his aerials especially highly and says his grab combos are excellent when chained, particularly against Fox and Falco.",
      },
      traits: [
        {
          name: "Up air",
          text: { en: "He can fit two into one jump, and a reversed up air can't be teched." },
        },
        {
          name: "Down air",
          text: { en: "A meteor smash the guide rates among the best in the game." },
        },
      ],
      strengths: [
        { en: "Excellent range, with one of the farthest-reaching forward smashes." },
        { en: "Powerful throws that chain well." },
        { en: "An excellent edgeguarding game." },
        { en: "Heavy and hard to KO." },
      ],
      weaknesses: [
        { en: "No projectile, which the guide calls his main weakness." },
        { en: "Slow." },
      ],
    },
    roy: {
      source: { title: "How to utilize Roy and his (not so) great moves", url: "https://smashboards.com/guides/how-to-utilize-roy-and-his-not-so-great-moves-wip.1131/", by: "Zacory (Foxy) (Smashboards)", written: "December 2017" },
      playstyle: {
        en: "A guide by a two-year Roy player on getting the most from each of his moves. It describes a fast character, because of his fall speed and an excellent wavedash that gives both distance and options, who struggles against projectiles.",
      },
      traits: [
        {
          name: "Wavedash",
          text: { en: "Excellent: good distance and good options out of it. His jump takes 5 frames to leave the ground, which the guide calls not terrible, just not the fastest." },
        },
        {
          name: "Forward tilt",
          text: { en: "Situational, but his best answer to projectiles: it moves him forward and hits them out of the air." },
        },
      ],
      strengths: [
        { en: "Fast movement." },
        { en: "An excellent wavedash." },
      ],
      weaknesses: [
        { en: "Struggles against projectiles." },
      ],
    },
  },
  // Round 931: P+ pages. These guides were written for Project M (versions 3.5 and 3.6, 2014 to 2016), the mod
  // Project+ is built on; P+ rebalanced many characters since. Matthew chose to show them labelled as such
  // (2026-11-26), so each "written" says it is for Project M, and the overviews keep to how the character
  // is meant to be played and leave out percentages and frame numbers.
  pplus: {
    bowser: {
      source: { title: "PM Bowser's Broken", url: "https://smashboards.com/guides/pm-bowsers-broken-a-guide-to-well-pm-bowser.16/", by: "WinterShorts (Smashboards)", written: "October 2014 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "A heavy tank whose game is more defensive than offensive, with offense mixed in. The guide's core habit is to shield an attack and answer with his up special, while warning that it becomes predictable. It says he is destructive when used properly, and that he should be kept fast with wavedashing, L-cancelling and dash dancing.",
      },
      traits: [
        {
          name: "Up special out of shield",
          text: { en: "His main defensive answer: shield, then up special." },
        },
        {
          name: "Fire Breath",
          text: { en: "A small flamethrower, used now and then as unexpected defense." },
        },
      ],
      strengths: [
        { en: "Power and speed that earlier versions of Bowser lacked." },
        { en: "A long list of useful, powerful moves." },
      ],
      weaknesses: [
        { en: "His shield-then-up-special habit is easy to predict." },
      ],
    },
    charizard: {
      source: { title: "The Firey Dragon", url: "https://smashboards.com/guides/the-firey-dragon.664/", by: "ShadowKing (Smashboards)", written: "October 2015 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "A heavy character with strong throws and KO power. The guide builds his game on grabs: back throw into another grab to rack up damage, down throw to set up a read, up throw to KO. Being heavy lets him survive to high percent while his power takes stocks early.",
      },
      traits: [
        {
          name: "Throws",
          text: { en: "Back throw chains into another grab, forward throw can KO or lead to a dash attack or up smash, down throw sets up a smash attack on a read, and up throw is his best throw for KOs." },
        },
        {
          name: "Forward smash",
          text: { en: "His best KO move by far, with a lot of end lag: the guide suggests it after a down throw or on a broken shield." },
        },
        {
          name: "Edgeguarding",
          text: { en: "Back air is his best tool for it, with forward air, down air and neutral air also used." },
        },
      ],
      strengths: [
        { en: "Heavy, so he survives at high percent." },
        { en: "KO power that takes stocks early." },
        { en: "A strong grab game." },
      ],
      weaknesses: [
        { en: "His strongest move has a lot of end lag." },
      ],
    },
    "donkey-kong": {
      source: { title: "Basic DK", url: "https://smashboards.com/guides/basic-dk.33/", by: "Jake The Preacher (Smashboards)", written: "October 2014 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "The guide's number one rule for Donkey Kong is grabbing: without grabs, it says, he probably isn't winning. He has a huge grab range and is fast, so he spaces around it and mixes up how he goes for it. Once he has the grab, the forward throw puts the opponent on his back and he chooses the follow-up from there. Under pressure, the advice is to get out and reset.",
      },
      traits: [
        {
          name: "Cargo throw",
          text: { en: "Forward throw lifts the opponent onto his back so he can carry them, then throw them up into up airs or forward into neutral or forward airs." },
        },
        {
          name: "Jump-cancelled grab",
          text: { en: "Pressing jump and then grab while running gives him a standing grab with running momentum; the guide calls this the first thing to learn." },
        },
        {
          name: "Back air",
          text: { en: "His best spacing move because of how far it reaches." },
        },
      ],
      strengths: [
        { en: "A huge grab range, and many options from a grab." },
        { en: "Fast, with the size to space well." },
        { en: "One of the best horizontal recoveries, which lets him edgeguard offstage." },
      ],
      weaknesses: [
        { en: "Huge, so he is a big combo target." },
        { en: "Doesn't deal well with pressure." },
        { en: "Grabbing the ledge precisely with his recovery is hard." },
      ],
    },
    "mr-game-and-watch": {
      source: { title: "Rockin it in 2D", url: "https://smashboards.com/guides/rockin-it-in-2d.73/", by: "CamGAM3S (Smashboards)", written: "November 2014 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "The guide calls him underrated, with aerials and a very versatile ground game. It teaches three things: pressure, with short-hop neutral specials and repeated back airs; a ground game of tilts and smash attacks that takes stocks quickly once his movement is under control; and a recovery it describes as insane.",
      },
      traits: [
        {
          name: "Chef (neutral special)",
          text: { en: "Short hop, mash the button, repeat: food flies everywhere and makes the opponent back off." },
        },
        {
          name: "Recovery",
          text: { en: "Ridiculous vertical reach, and he can use his bucket in the air to gain horizontal distance." },
        },
        {
          name: "Dash dance",
          text: { en: "He is small and turns back and forth faster than most, which the guide uses to bait." },
        },
      ],
      strengths: [
        { en: "Strong pressure with neutral special and back air." },
        { en: "A versatile ground game that takes stocks quickly." },
        { en: "An excellent recovery." },
      ],
      weaknesses: [],
    },
    ike: {
      source: { title: "Berserk: A Guide to Nintendo's Guts", url: "https://smashboards.com/guides/berserk.635/", by: "NWRL (Smashboards)", written: "September 2015 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "The guide calls Ike one of the most unique characters: Marth's range and disjoint, Ganondorf's power and sluggishness, and Captain Falcon's free-form combos and grab game. He is slow on the ground, floaty and medium weight, which makes him easy to combo, and covers for it with a very large sword and by jumping out of his side special. His goal is to keep the opponent at mid range, just outside their reach and well inside his.",
      },
      traits: [
        {
          name: "Quick Draw (side special)",
          text: { en: "A dash he can jump out of. It is how he moves quickly and how he follows up his hits." },
        },
        {
          name: "Aether (up special)",
          text: { en: "His main recovery when coming from low; he can steer forward or back while spinning to land on the ledge or the stage." },
        },
        {
          name: "Varied hits on one sword",
          text: { en: "Different parts of his arms and sword have different effects, so where a move connects changes what it does." },
        },
      ],
      strengths: [
        { en: "An extremely large disjointed sword." },
        { en: "Power." },
        { en: "Free-form combos and a strong grab game." },
      ],
      weaknesses: [
        { en: "Slow on the ground." },
        { en: "Quite susceptible to combos." },
        { en: "Awkward to play at first." },
      ],
    },
    "king-dedede": {
      source: { title: "A Beginners Guide to King Dedede", url: "https://smashboards.com/guides/a-beginners-guide-to-king-dedede.109/", by: "Ridel (Smashboards)", written: "December 2014 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "The guide's word for him is passive-aggressive: keep the pressure on, but know when to step back and keep distance. Compared with Brawl he gave up some defense for offense and mobility, and relies more on getting in and racking up damage. He is extremely powerful, a threat at long and close range, but a very big target who has trouble approaching faster characters and those who can zone him out.",
      },
      traits: [
        {
          name: "Aerials",
          text: { en: "Among his best moves. Forward air has an enormous disjointed hitbox with power and speed, and is a deadly edgeguarding tool." },
        },
        {
          name: "Inhale",
          text: { en: "The guide calls it his anti-approach option: its suction can stop some moves that rush at him." },
        },
        {
          name: "Super Dedede Jump (up special)",
          text: { en: "A recovery that rises a tremendous distance very quickly." },
        },
      ],
      strengths: [
        { en: "Some of the most powerful smash attacks." },
        { en: "Very disjointed moves, dangerous at long and close range." },
        { en: "More mobility than he had in Brawl." },
      ],
      weaknesses: [
        { en: "A very big target." },
        { en: "Has trouble approaching characters who are faster than him or can zone him out." },
      ],
    },
    lucas: {
      source: { title: "Lightning Fast: A Project M Lucas Guide", url: "https://smashboards.com/guides/lightning-fast-a-project-m-lucas-guide-wip.270/", by: "D e l t a (Smashboards)", written: "February 2015 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "A fast-paced, burst-momentum character whose approach is based on creating and exploiting openings in the opponent's defense. The guide compares his playstyle to Falco's and Sheik's. He has a strong dash dance for baiting, a short range and a very strong punish game, so the guide stresses spacing in neutral above all and never playing on autopilot.",
      },
      traits: [
        {
          name: "“The 4th spacie”",
          text: { en: "A nickname he earned for resembling Fox, Falco and Wolf in pressure, combos and neutral. The guide notes that later nerfs made people question it." },
        },
        {
          name: "PK Fire",
          text: { en: "Looks like a good option all the time, but its startup and end lag mean it can be punished." },
        },
        {
          name: "Grabs",
          text: { en: "The guide says to jump-cancel or pivot every grab rather than dash grab." },
        },
      ],
      strengths: [
        { en: "A strong dash dance game for baiting." },
        { en: "A very strong punish game." },
        { en: "Fast, with bursts of momentum." },
      ],
      weaknesses: [
        { en: "Short range." },
        { en: "Light." },
      ],
    },
    "meta-knight": {
      source: { title: "The Ultimate Meta Knight Collaborative Guide", url: "https://smashboards.com/guides/the-ultimate-meta-knight-collaboratve-guide-wip.121/", by: "leekslap (Smashboards)", written: "December 2014 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "A first draft by one author, who calls it probably opinionated. It describes a fast character with very quick attacks, deceptively long reach on his sword, versatile combos and mix-ups, and one of the best edgeguarding games. His forward tilt and down tilt are his spacing and combo tools.",
      },
      traits: [
        {
          name: "Forward tilt",
          text: { en: "Three hits whose timing he controls; used for combos, spacing and sometimes shield pressure." },
        },
        {
          name: "Down tilt",
          text: { en: "Pops opponents up for combos at close range and pushes them back at the tip; one of his best spacing moves, and good for edgeguarding from the stage." },
        },
        {
          name: "Forward smash",
          text: { en: "Deceptively fast with a massive hitbox, for hard reads and punishing recoveries." },
        },
      ],
      strengths: [
        { en: "One of the best edgeguarders." },
        { en: "Deceptively great range on a disjointed sword." },
        { en: "Versatile combos and mix-ups." },
        { en: "Very fast attacks and run speed." },
        { en: "An unpredictable recovery that covers a lot of horizontal distance." },
      ],
      weaknesses: [
        { en: "Very fragile: one of the lightest characters, with a fast fall speed and a slow tech roll." },
        { en: "A relatively bad vertical recovery." },
      ],
    },
    mewtwo: {
      source: { title: "Guide for Mewtwo (3.5)", url: "https://smashboards.com/guides/guide-for-mewtwo-3-5.163/", by: "MysticSkarps (Smashboards)", written: "January 2015 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "Not an aggressive character all the time. The guide says Mewtwo must be played defensively to find an opening or make the opponent approach, then turn aggressive once he is in or has found a weakness in their approach.",
      },
      traits: [
        {
          name: "Teleport",
          text: { en: "With his high jumps it gives him a recovery the guide calls broken: quick, hard to read and easy to land on the ledge with. He can still be read and punished." },
        },
        {
          name: "Tail",
          text: { en: "Gives him his mid range." },
        },
        {
          name: "Grab game",
          text: { en: "Rated amazing, with a chain grab on heavy characters at low percent." },
        },
      ],
      strengths: [
        { en: "A very high jump and an amazing aerial game." },
        { en: "Unmatched edgeguarding." },
        { en: "An extremely strong recovery." },
      ],
      weaknesses: [
        { en: "Very floaty." },
        { en: "Only okay approach options and ground game." },
        { en: "Has to charge his projectile for it to be effective." },
      ],
    },
    roy: {
      source: { title: "Playing with Ph1r3 - Gold Version", url: "https://smashboards.com/guides/playing-with-ph1r3-gold-version.62/", by: "Sethlon (Smashboards)", written: "October 2014, updated January 2016 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "An aggressive character who has to get close. His real strength is the sweetspot on the middle and hilt of his blade, so although his range lets him control space, he needs to be in the opponent's face to hurt them. His movement is only average, so the guide's game plan is to advance steadily and carefully with dash dancing, crouch cancelling and long-reaching attacks, pin the opponent down, and set up down tilts and grabs. It says Smash fundamentals are the pillars that hold Roy up.",
      },
      traits: [
        {
          name: "Sweetspot",
          text: { en: "The middle and hilt of his sword hit hardest, the opposite of Marth's tip." },
        },
        {
          name: "Crouch cancel",
          text: { en: "The guide calls his crouch cancel game great, and at the same time one of his biggest weaknesses." },
        },
        {
          name: "Down tilt and grab",
          text: { en: "What his careful advance is meant to set up." },
        },
      ],
      strengths: [
        { en: "Range to control space." },
        { en: "A great dash dance." },
        { en: "Strong KO options." },
        { en: "Potentially great combos." },
      ],
      weaknesses: [
        { en: "Has to get in fairly close for his better rewards." },
        { en: "Middling overall movement speed." },
        { en: "His combos often need a read on the opponent's DI." },
        { en: "Fairly easy to KO." },
      ],
    },
    wolf: {
      source: { title: "A Wolf Guide: ‘Beep is your Destiny’ (unfinished)", url: "https://smashboards.com/guides/a-wolf-guide-%E2%80%98beep-is-your-destiny%E2%80%99-unfinished.339/", by: "TimeMuffinPhD (Smashboards)", written: "April 2015 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "An unfinished guide whose author says they stopped because they weren't yet skilled enough. It describes Wolf as versatile and well rounded, overall an aggressive character because of his long combo game, and a glass cannon: he hits extremely hard and can have the same done to him. His Blaster is one of his main tools in neutral for opening the opponent up.",
      },
      traits: [
        {
          name: "Blaster",
          text: { en: "A main neutral tool the guide says most Wolf players underuse. He can waveland out of it, which lets him keep pressure on behind a projectile." },
        },
        {
          name: "Combos",
          text: { en: "The guide says he can start one from almost anything and extend the punish a long way." },
        },
        {
          name: "Forward smash",
          text: { en: "Long range for punishing laggy moves, with less knockback than people expect." },
        },
      ],
      strengths: [
        { en: "A long, flexible combo game." },
        { en: "Well rounded, with a good spread of matchups." },
        { en: "A projectile he can move out of." },
      ],
      weaknesses: [
        { en: "A glass cannon: he takes as much as he gives." },
        { en: "Has a rough time if his spacing and movement aren't on point." },
      ],
    },
    zelda: {
      source: { title: "A Guide To The Powerful Princess Zelda", url: "https://smashboards.com/guides/a-guide-to-the-powerful-princess-zelda-3-5-updated.69/", by: "Captain Zack (Smashboards)", written: "November 2014 for Project M, the mod P+ is built on" },
      playstyle: {
        en: "Not an aggressive character. The guide says Zelda mostly takes her time and waits for the opponent to make a wrong move: she isn't very good at approaching, but has a great long-range game, using Din's Fire as a wall that is hard to break through. When the opponent slips, she has plenty of ways to combo or finish the stock.",
      },
      traits: [
        {
          name: "Din's Fire",
          text: { en: "Her wall: it keeps opponents out at long range." },
        },
        {
          name: "Lightning Kick",
          text: { en: "Her forward and back airs. The guide calls it pretty much her best move, able to KO heavy characters early when it lands cleanly." },
        },
        {
          name: "Nayru's Love",
          text: { en: "A spinning crystal that also reflects projectiles, useful in combos and when retreating." },
        },
      ],
      strengths: [
        { en: "A great long-range game." },
        { en: "Powerful finishers." },
        { en: "Many ways to punish a mistake." },
      ],
      weaknesses: [
        { en: "Not very good at approaching." },
        { en: "Sitting in shield is not a safe option for her." },
      ],
    },
  },
};

/** A guide's "written" date in the reader's language when the translation files have it, else as written. */
export function writtenIn(written: string, lang: string): string {
  return TRANSLATED[lang]?.[written] ?? written;
}

export function characterOverview(game: GameKey, character: string): CharacterOverview | null {
  return CHARACTER_OVERVIEWS[game]?.[character] ?? null;
}

// Translations kept beside the English, one file per language, looked up by the English line (round 930).
const TRANSLATED: Record<string, Record<string, string>> = { es: OVERVIEW_ES, fr: OVERVIEW_FR, ja: OVERVIEW_JA };

/** The text in the reader's language: written beside the English, or from that language's file; English when neither has it. */
export function inLang(text: Text, lang: string): string {
  return (text as Record<string, string | undefined>)[lang] ?? TRANSLATED[lang]?.[text.en] ?? text.en;
}
