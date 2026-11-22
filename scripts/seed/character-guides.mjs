// Short "where to start" guides for popular characters, posted by @smashyhq on each character's page.
// Plain text. Loaded by scripts/seed/seed-starter.mjs.

const close = (name) => `\n\nNEXT STEP\nJoin the ${name} community Discord (linked at the top of this page) for matchup notes, combo videos and people to practice with.`;

export const CHARACTER_GUIDES = [
  // ---------------- Melee ----------------
  {
    game: "melee",
    character: "fox",
    type: "guide",
    title: "Fox: where to start",
    description: "The fastest character in Melee. What makes Fox strong, his key moves, and what to practice first.",
    guide_body: `WHY PLAY FOX
Fox is extremely fast, has some of the best combos in the game, and can win from almost any position. He's also demanding: he rewards clean tech skill more than almost anyone.

KEY MOVES
- Shine (down special): comes out instantly, reflects projectiles and can be canceled by jumping. It's the heart of Fox's game.
- Neutral air, back air, up air: fast aerials for starting and extending combos.
- Down air (drill): leads into shine, grabs and more combos when L-canceled.
- Up smash: one of his main ways to take stocks.
- Laser (neutral special): short hop lasers chip damage and force opponents to act.

THINGS TO KNOW
- Fox is light and falls fast, so he gets comboed hard. Good DI keeps you alive.
- His recovery (Fire Fox up special, Fox Illusion side special) is easy to guess. Mix up angles and timing.

PRACTICE FIRST
1. L-canceling every aerial.
2. Short hop lasers.
3. Shine out of shield and jump-canceling shine.
4. Drill to shine or grab.${close("Fox")}`,
  },
  {
    game: "melee",
    character: "falco",
    type: "guide",
    title: "Falco: where to start",
    description: "Lasers, pillars and spikes. How Falco plays and what to practice first.",
    guide_body: `WHY PLAY FALCO
Falco controls space with his lasers, hits hard, and has huge combos. He shares a lot with Fox but plays more around lasers and pressure.

KEY MOVES
- Laser (neutral special): short hop lasers are Falco's main tool. They knock opponents out of the air and set up approaches.
- Shine (down special): sends opponents sideways. Great for combos and for spiking offstage.
- Down air: a spike when it hits offstage, and the start of "pillar" combos onstage (down air, shine, down air...).
- Back air and up air: strong aerials for spacing and juggling.

THINGS TO KNOW
- Falco's recovery is one of the weakest among top characters. Stay close to the stage and mix up Phantasm (side special) and Fire Bird (up special).
- Like Fox, he falls fast and gets comboed, so DI matters a lot.

PRACTICE FIRST
1. Short hop double lasers (laser twice in one short hop).
2. L-canceled down air into shine.
3. Simple pillars at low percent.
4. Recovering low and high so you're hard to edgeguard.${close("Falco")}`,
  },
  {
    game: "melee",
    character: "marth",
    type: "guide",
    title: "Marth: where to start",
    description: "Sword spacing, tipper hits and grabs. How Marth plays and what to practice first.",
    guide_body: `WHY PLAY MARTH
Marth has long, fast sword attacks, great grabs and strong edgeguards. He's about spacing: staying just out of reach and punishing mistakes.

KEY MOVES
- Forward air: his main aerial. Fast, safe when spaced, and the core of his combos.
- Forward smash: hitting with the tip of the sword ("tipper") does much more damage and knockback.
- Grab and down throw / forward throw: Marth gets a lot from grabs, especially against Fox and Falco.
- The "Ken combo": forward air into down air (a spike) offstage.

THINGS TO KNOW
- Learn tipper spacing: where the sword's tip will land.
- Marth's recovery (Dolphin Slash up special) is vulnerable; recover with your side special to stall and mix up timing.

PRACTICE FIRST
1. Short hop forward air, L-canceled.
2. Dash dance and grab.
3. Tipper forward smash from a dash.
4. Edgeguarding with forward air and down air.${close("Marth")}`,
  },
  {
    game: "melee",
    character: "sheik",
    type: "guide",
    title: "Sheik: where to start",
    description: "Fast, safe attacks and tech chases off her down throw. How Sheik plays.",
    guide_body: `WHY PLAY SHEIK
Sheik is fast, safe and consistent. She wins by poking with quick attacks, reading tech options after her down throw, and controlling space with needles.

KEY MOVES
- Forward tilt: fast, hits several times at low percent and starts combos.
- Forward air and back air: safe, quick aerials.
- Down throw: the core of her game. Opponents usually land and tech, and Sheik follows them ("tech chasing").
- Needles (neutral special): charge them, then throw to chip damage and interrupt approaches.

THINGS TO KNOW
- Tech chasing means reacting to how your opponent gets up (tech in place, left, right, or missed tech). It takes practice, but it's Sheik's biggest strength.
- Her recovery (Vanish up special) can be angled. Don't always recover the same way.
- In tournaments Sheik stays as Sheik (no transforming into Zelda mid-game).

PRACTICE FIRST
1. Down throw, then react to the tech.
2. Forward tilt at low percent into a grab or aerial.
3. Charging needles and throwing them from the ledge.${close("Sheik")}`,
  },
  {
    game: "melee",
    character: "captain-falcon",
    type: "guide",
    title: "Captain Falcon: where to start",
    description: "Speed, stomps and the knee. How Captain Falcon plays and what to practice first.",
    guide_body: `WHY PLAY CAPTAIN FALCON
Captain Falcon is fast, hits hard and has flashy combos. He's built for movement and punishing, ending stocks with his famous knee.

KEY MOVES
- Forward air (the knee): hitting with the sweetspot at the start of the move has huge knockback. Missing the sweetspot is weak.
- Down air (stomp): sends opponents down, often into a knee.
- Neutral air and up air: fast aerials for starting and extending combos.
- Grab: up throw and down throw lead into aerial follow-ups.
- Raptor Boost (side special): an approach and a ground mixup.

THINGS TO KNOW
- Falcon has one of the fastest runs in the game. Use dash dancing to bait opponents.
- His recovery (Falcon Dive up special) is easy to edgeguard. Stay close to the stage and mix up when you use your double jump.
- He gets comboed easily. Practice DI.

PRACTICE FIRST
1. Short hop knee with the sweetspot.
2. Stomp into knee.
3. Dash dance into grab.
4. L-canceled neutral air.${close("Captain Falcon")}`,
  },

  // ---------------- Ultimate ----------------
  {
    game: "ultimate",
    character: "mario",
    type: "guide",
    title: "Mario: where to start",
    description: "A great all-rounder with fast combos. Mario's key moves and what to practice first.",
    guide_body: `WHY PLAY MARIO
Mario has no big weaknesses: fast attacks, strong combos at low percent, a reliable recovery and good kill moves. He's a great character to learn the game with.

KEY MOVES
- Up tilt: chains into itself and into aerials at low percent.
- Up air: fast juggles above you.
- Down throw: leads into up airs and other aerials.
- Cape (side special): reflects projectiles, turns opponents around and can stall your fall when recovering.
- F.L.U.D.D. (down special): charge it, then push opponents away, especially offstage.
- Forward smash and back air: his main ways to take stocks.

THINGS TO KNOW
- Mario's Super Jump Punch (up special) recovers well but has a short range. Use your double jump and cape wisely.
- Edgeguarding with cape and F.L.U.D.D. can take stocks early.

PRACTICE FIRST
1. Up tilt into up tilt into up air at low percent.
2. Down throw into up air.
3. Short hop aerials with fast falls.
4. Using cape on recovering opponents.${close("Mario")}`,
  },
  {
    game: "ultimate",
    character: "pikachu",
    type: "guide",
    title: "Pikachu: where to start",
    description: "Small, fast and hard to hit. How Pikachu plays and what to practice first.",
    guide_body: `WHY PLAY PIKACHU
Pikachu is tiny and quick, with fast aerials, long combos and an amazing recovery. It's hard to hit and great at pressuring shields.

KEY MOVES
- Quick Attack (up special): moves you in two directions fast. It's your recovery and a movement tool.
- Thunder Jolt (neutral special): a projectile that travels along the ground and stage.
- Neutral air and forward air: fast aerials for pressure and combos.
- Down throw: leads into aerials at low percent.
- Thunder (down special) and back air: ways to take stocks.

THINGS TO KNOW
- Pikachu is light, so it gets knocked out early. Play carefully at high percent.
- Quick Attack can be angled in many ways, so mix up your recovery.

PRACTICE FIRST
1. Short hop neutral air and forward air with fast falls.
2. Down throw into aerials.
3. Recovering with Quick Attack from different angles.
4. Thunder Jolt to force your opponent to approach.${close("Pikachu")}`,
  },
  {
    game: "ultimate",
    character: "joker",
    type: "guide",
    title: "Joker: where to start",
    description: "Fast attacks plus Arsene, a power-up that changes the match. How Joker plays.",
    guide_body: `WHY PLAY JOKER
Joker is fast and mobile, with quick attacks and a strong combo game. His Rebellion Gauge summons Arsene, which makes his specials much stronger for a while.

THE REBELLION GAUGE
- The gauge fills when Joker takes damage, and faster when he blocks hits with Rebel's Guard (down special).
- When it's full, Arsene appears for a limited time. Your attacks get stronger and your specials change.

KEY MOVES
- Gun (neutral special): shoot from a distance. With Arsene it becomes much stronger.
- Eiha (side special): a curse that deals damage over time.
- Grappling Hook (up special): your recovery (a tether). With Arsene it becomes Wings of Rebellion, a much better recovery.
- Neutral air and forward air: fast aerials for pressure.

THINGS TO KNOW
- Play patiently without Arsene and aggressively with him.
- Without Arsene, Joker's recovery is weak. Be careful offstage.

PRACTICE FIRST
1. Short hop aerials with fast falls.
2. Combos from down throw at low percent.
3. When to use Rebel's Guard to fill the gauge.
4. Making the most of Arsene before he leaves.${close("Joker")}`,
  },
  {
    game: "ultimate",
    character: "snake",
    type: "guide",
    title: "Snake: where to start",
    description: "Grenades, explosives and powerful tilts. How Snake controls space.",
    guide_body: `WHY PLAY SNAKE
Snake is heavy, hits hard and controls the stage with explosives. He's great at making opponents come to him, then punishing them.

KEY MOVES
- Hand Grenade (neutral special): pull a grenade and throw or drop it to control space.
- Nikita (side special): a remote-controlled missile you can steer.
- C4 (down special): stick it to the ground or an opponent, then detonate it.
- Cypher (up special): a long recovery that flies you upward.
- Up tilt: a fast, strong uppercut that can take stocks.
- Forward tilt: a two-hit combo with good reach.

THINGS TO KNOW
- Snake's explosives can hurt you too, so be careful at close range.
- He's heavy and survives long, but he can be juggled. Use grenades and C4 to protect yourself.

PRACTICE FIRST
1. Holding and dropping grenades while shielding or moving.
2. Up tilt and forward tilt spacing.
3. Recovering with Cypher, and attacking on the way down.
4. Setting C4 traps on the ledge.${close("Snake")}`,
  },
  {
    game: "ultimate",
    character: "cloud",
    type: "guide",
    title: "Cloud: where to start",
    description: "Big sword, fast aerials and the Limit Break. How Cloud plays and what to practice first.",
    guide_body: `WHY PLAY CLOUD
Cloud has long sword attacks, fast and safe aerials, and a powerful edgeguarding game. His Limit Break makes one special move much stronger.

LIMIT BREAK
- Cloud fills his Limit gauge by dealing and taking damage, or by charging it with Limit Charge (down special).
- When it's full, his next special move gets much stronger, and his speed goes up until he uses it.

KEY MOVES
- Up air and back air: fast, with huge reach. Great for juggling and spacing.
- Neutral air: hits around him and is safe when landing.
- Blade Beam (neutral special): a projectile, and a strong one with Limit.
- Climhazzard (up special): his recovery. Without Limit it's short, so be careful offstage.
- Down air: a spike offstage.

THINGS TO KNOW
- Cloud's recovery is his biggest weakness. Saving Limit can help you recover.
- He's great at edgeguarding: chase opponents offstage with back air and down air.

PRACTICE FIRST
1. Short hop up air and back air with fast falls.
2. Charging Limit safely when your opponent is far away.
3. Edgeguarding with back air.
4. Recovering low and high without Limit.${close("Cloud")}`,
  },
];
