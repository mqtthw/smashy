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
  /** `written`: when the source was written or last updated, as it says itself ("December 2018"). Shown beside
   *  the credit, because games get patched and an old guide's details may no longer hold (Matthew, round 922:
   *  "do not treat these as gospel because some may be outdated"). */
  source: { title: string; url: string; by: string; written?: string };
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
    // readers). They date from the game's first months, so each shows when it was written. The copies came
    // without their addresses, so the link goes to Smashboards' guides section until Matthew sends each one.
    samus: {
      source: { title: "Samus/Dark Samus Competitive Guide", url: "https://smashboards.com/guides/", by: "Dr. Jay (Smashboards)", written: "December 2018" },
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
      source: { title: "Competitive Guide to Playing as and Against Yoshi", url: "https://smashboards.com/guides/", by: "Dr. Jay (Smashboards)", written: "December 2018" },
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
      source: { title: "Jigglypuff Beginner's Guide", url: "https://smashboards.com/guides/", by: "Zarxrax (Smashboards)", written: "March 2019" },
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
      source: { title: "Hail to the Demon King: A Ganondorf Guide", url: "https://smashboards.com/guides/", by: "King9999 (Smashboards)", written: "January 2019, updated through patch 11.0.0" },
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
      source: { title: "The Complete Ultimate Dr. Mario Guide", url: "https://smashboards.com/guides/", by: "ASAP_Smash (Smashboards)", written: "February 2019" },
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
      source: { title: "Mewtwo Guide", url: "https://smashboards.com/guides/", by: "Macchus (Smashboards)", written: "January 2019" },
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
      source: { title: "A Comprehensive Competitive Guide to Chrom", url: "https://smashboards.com/guides/", by: "TheDMatch (Smashboards)", written: "January 2019" },
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
      source: { title: "Art of Sonic Guide for Ultimate", url: "https://smashboards.com/guides/", by: "Sonic Meaper (Smashboards)", written: "January 2019" },
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
      source: { title: "Robotic Operating Basics", url: "https://smashboards.com/guides/", by: "Jams. (Smashboards)", written: "January 2019" },
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
      source: { title: "Greninjuts-Two: A Beginner to Intermediate Guide to Greninja", url: "https://smashboards.com/guides/", by: "Ludi (Ludiloco on Smashboards)", written: "February 2019" },
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
  },
};

export function characterOverview(game: GameKey, character: string): CharacterOverview | null {
  return CHARACTER_OVERVIEWS[game]?.[character] ?? null;
}

/** The text in the reader's language, or in English when that language isn't written yet. */
export function inLang(text: Text, lang: string): string {
  return (text as Record<string, string | undefined>)[lang] ?? text.en;
}
