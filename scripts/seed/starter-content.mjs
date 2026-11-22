// Starter content for launch: guides written for Smashy, links to well-known community resources,
// and a San Antonio scene with starter rulesets. Posted by the official @smashyhq account.
// Loaded by scripts/seed/seed-starter.mjs. Guide text is plain text (Smashy shows it as written).

export const SMASHY_PROFILE = {
  tag: "Smashy",
  handle: "smashyhq", // "smashy" itself is reserved so nobody can pose as the site
  bio: "The official Smashy account: starter guides, resources and announcements.",
  home_city: "San Antonio",
  games: ["melee", "ultimate"],
};

export const HIGHLIGHTS = [
  // ---------------- Melee ----------------
  {
    game: "melee",
    type: "guide",
    title: "Melee basics: start here",
    description: "New to competitive Melee? The controls, how matches work, and what to practice first.",
    guide_body: `WELCOME TO MELEE
Super Smash Bros. Melee (2001, GameCube) is still played at tournaments every week, including here in San Antonio. It's fast and hard to master, but the basics come quickly.

HOW A TOURNAMENT MATCH WORKS
- 4 stocks (lives), 8-minute timer, items off.
- Sets are usually best of 3, and best of 5 near the end of bracket.
- Game 1 is played on a "starter" stage the players agree on by striking (taking turns removing stages). After that, the loser of each game picks the next stage.
- Your local scene's ruleset is on its Scenes page on Smashy.

THE CONTROLS
- A: normal attacks. B: special moves.
- X or Y: jump. L or R: shield (and air dodge while in the air).
- Z: grab. C-stick: smash attacks on the ground, aerials in the air.
- Tilt the control stick gently for tilt attacks, flick it with A for smash attacks.

FOUR IDEAS THAT MATTER MOST
1. Neutral: the back-and-forth before anyone gets hit. Whoever wins neutral gets to start a combo.
2. Punish: what you do after landing a hit. Good players turn one hit into a stock.
3. Edgeguarding: stopping your opponent from getting back to the stage.
4. Recovery: getting back to the stage yourself, in ways that are hard to stop.

WHAT TO PRACTICE FIRST
- Short hops (tap jump lightly) and fast falls (press down at the top of a jump).
- L-canceling and wavedashing (see the Tech guides on Smashy's Melee page).
- Your character's best combo starters and how to recover safely.
- Directional influence (DI): holding the stick when you're hit so you survive longer.

HOW TO PLAY
- In person: local weeklies are the fastest way to improve. Check Smashy's Events tab.
- Online: Slippi (slippi.gg) lets you play Melee online with rollback netcode, ranked or with friends.
- Training: the UnclePunch Training Mode mod has drills for tech skill, edgeguards and more.

Pick a character you enjoy, join their community Discord (linked on each character page), and play lots of games. Everyone was bad at first.`,
  },
  {
    game: "melee",
    type: "tech",
    title: "Wavedashing, explained",
    url: "https://www.ssbwiki.com/Wavedash",
    description: "What a wavedash is, how to do one, and why every Melee player uses them.",
    guide_body: `WHAT IT IS
A wavedash makes your character slide along the ground. You jump, then immediately air dodge diagonally into the ground. The air dodge's momentum carries into a slide.

HOW TO DO IT
1. Press jump (X or Y).
2. Right away, before your character leaves the ground, press L or R while holding the control stick diagonally down and to one side.
3. Your character slides in that direction.

The angle matters: the closer to horizontal you hold the stick, the farther you slide. Straight down barely moves you.

WHY IT'S USEFUL
- Move while staying ready to shield, grab or attack.
- Wavedash out of shield: jump out of shield, then wavedash, to reposition quickly.
- Wavedash back to make your opponent whiff, then punish.
- Some characters (like Luigi and Ice Climbers) slide very far, others barely move.

RELATED: WAVELANDING
Air dodging diagonally into a platform (or the stage) while falling is called a waveland. It's great for landing safely and moving across platforms.

PRACTICE TIP
Practice on Final Destination: wavedash back and forth across the stage until the timing feels automatic. The UnclePunch Training Mode shows your timing.`,
  },
  {
    game: "melee",
    type: "tech",
    title: "L-canceling, explained",
    url: "https://www.ssbwiki.com/L-canceling",
    description: "Halve your landing lag after aerials. The most important tech skill in Melee.",
    guide_body: `WHAT IT IS
When you land while doing an aerial attack, your character has landing lag: a moment where they can't act. Pressing L, R or Z just before you land cuts that landing lag in half.

HOW TO DO IT
1. Do an aerial (like a neutral air or down air).
2. Press L, R or Z in the 7 frames (about a tenth of a second) before you touch the ground.
3. If it worked, your character recovers much faster after landing. Many players feel the timing by pressing the shield button "as they land".

WHY IT MATTERS
- Your attacks become much safer when they hit a shield.
- You can combo faster: a well-timed L-cancel lets you follow up right away.
- Almost every competitive player L-cancels nearly every aerial.

PRACTICE TIP
Start with one move (Fox's or Falco's neutral air is a classic) and do it over and over in training. Slippi and the UnclePunch Training Mode can show whether each L-cancel succeeded.`,
  },
  {
    game: "melee",
    type: "tech",
    title: "DI in Melee: how to survive longer and escape combos",
    url: "https://www.ssbwiki.com/Directional_influence",
    description: "Hold the stick the right way when you get hit to live longer and get out of combos.",
    guide_body: `WHAT DI IS
DI (directional influence) changes the angle you fly at when you get hit. Hold the control stick in a direction when you're hit and your launch angle shifts toward it. It doesn't change how hard you're hit, only the direction.

The effect is biggest when you hold the stick at a right angle (perpendicular) to the direction you're being launched.

SURVIVAL DI
- Hit sideways toward the edge: hold up and slightly toward the stage (up-and-in). Going up instead of straight out makes you travel farther before reaching the side blast zone.
- Hit straight up: hold to the left or right, so you drift toward a side instead of the top.
A good rule: angle toward the blast zone that's farthest away.

COMBO DI
When your opponent is trying to combo you at low percent, DI away from where they want you to go. Watch what they usually follow up with and DI to make that harder.

SMASH DI (SDI)
While you're stuck in hitlag (the brief freeze when a hit connects), tapping the stick moves your character slightly. Use it to escape multi-hit moves or shift out of a follow-up. The C-stick can also nudge you once (automatic smash DI).

PRACTICE TIP
Ask a friend (or use a training mod) to hit you with the same move over and over while you try different DI. You'll quickly feel how much it changes things.`,
  },
  {
    game: "melee",
    type: "guide",
    title: "Playing Melee online with Slippi",
    url: "https://slippi.gg",
    description: "How to set up Slippi, the free way to play Melee online with rollback netcode.",
    guide_body: `WHAT SLIPPI IS
Slippi is a free program that lets you play Melee online, with rollback netcode that makes matches feel close to playing in person. It also saves replays of your games, and it has ranked matchmaking.

WHAT YOU NEED
- A computer (Windows, Mac or Linux).
- Your own copy of Melee (NTSC 1.02) as a disc image you made from your disc.
- A controller: a GameCube controller with an adapter is the most common choice.

SETTING IT UP
1. Download the Slippi Launcher from slippi.gg and install it.
2. Log in and pick a connect code (other players use it to find you).
3. Point the launcher at your Melee disc image.
4. Set up your controller in the Dolphin settings (a GameCube adapter in "Wii U" mode is the usual setup).

WAYS TO PLAY
- Unranked: quick matches against random players.
- Ranked: matchmaking that tracks your rank.
- Direct: type in a friend's connect code to play them.
- Teams: 2v2 with friends.

TIPS
- A wired internet connection helps a lot.
- Watch your saved replays to see your habits.
- Add people you meet at local events by their connect code.`,
  },
  {
    game: "melee",
    type: "guide",
    title: "Practicing with UnclePunch Training Mode",
    url: "https://github.com/AlexanderHarrison/TrainingMode-CommunityEdition/releases/latest",
    description: "The main way Melee players practice: tech drills, a training lab with savestates, and CPU recordings. Now kept up to date as the Community Edition.",
    guide_body: `WHAT IT IS
UnclePunch Training Mode is a modded version of Melee built for practice. UnclePunch made the original; the community now keeps it updated as Training Mode - Community Edition (TM-CE), with bug fixes and new features. Most players simply call it "UnclePunch".

WHAT YOU NEED
- Your own copy of Melee (NTSC 1.02) as a disc image you made from your disc.
- The TM-CE download from its releases page (linked above). It turns your Melee image into the training version.
- A way to play it: Slippi's Dolphin on a computer, or Nintendont on a Wii.

WHAT'S INSIDE
- Training Lab: set up any situation, save it (savestates) and replay it. Record the CPU doing an option and practice your answer over and over.
- Tech drills: L-canceling, wavedashing, ledge-dash, shield drop, amsah tech and more, with feedback on your timing.
- Situations: edgeguarding, recovering, escaping combos and reacting to techs.
- Live info on screen: frame-by-frame timing, so you can see exactly how early or late you were.

HOW TO PRACTICE WITH IT
- Pick one skill per session and stick with it for 10-15 minutes.
- Use the Training Lab to rebuild a situation you lost in a real match, then drill your answer.
- Turn on the timing display for tech like L-canceling to see whether you're early or late.

The TM-CE Discord (linked from its GitHub page) is the place for help and new features.`,
  },
  {
    game: "melee",
    type: "other",
    title: "The Melee Library",
    url: "https://www.meleelibrary.com",
    description: "A big, organized collection of Melee guides, videos and resources from across the community.",
  },
  {
    game: "melee",
    type: "other",
    title: "Character Discords for every Melee character",
    url: "https://www.ssbwiki.com/Discord",
    description: "Most character guides and matchup notes live in each character's Discord. SmashWiki keeps the full list (each character page on Smashy links its Discord too).",
  },

  // ---------------- Ultimate ----------------
  {
    game: "ultimate",
    type: "guide",
    title: "Ultimate basics: start here",
    description: "New to competitive Smash Ultimate? How tournament matches work, settings, and what to practice first.",
    guide_body: `WELCOME TO COMPETITIVE ULTIMATE
Super Smash Bros. Ultimate (2018, Switch) has the biggest competitive Smash scene, with tournaments every week, including here in San Antonio.

HOW A TOURNAMENT MATCH WORKS
- 3 stocks (lives), 7-minute timer, items off, stage hazards off.
- Sets are usually best of 3, and best of 5 near the end of bracket.
- Game 1 is on a starter stage the players agree on by striking. After each game, the winner bans stages and the loser picks the next one.
- Your local scene's ruleset is on its Scenes page on Smashy.

CONTROLLER SETTINGS PLAYERS OFTEN CHANGE
Settings live in the game's Options > Controls, saved to your name.
- Tap jump off (so pressing up on the stick doesn't jump). Many players prefer jumping with a button.
- Right stick set to "Tilt attack" instead of smash attacks. This makes tilts easier.
- Try a few setups and keep whatever feels natural. There's no single right answer.

FOUR IDEAS THAT MATTER MOST
1. Neutral: the back-and-forth before anyone gets hit.
2. Punish: turning a hit into as much damage as you can.
3. Edgeguarding: stopping your opponent from getting back to the stage.
4. Ledge play: getting back onstage safely when you're the one recovering.

WHAT TO PRACTICE FIRST
- Short hop aerials and fast falls (see the Tech guide).
- Shielding and your best "out of shield" option.
- Your character's best combos at low percent and kill moves at high percent.
- Mixing up your ledge options so you're hard to read.

HOW TO PLAY
- In person: local weeklies are the best way to improve. Check Smashy's Events tab.
- Online: Ultimate's built-in online works, and many character Discords run matchmaking.
- Training mode lets you see frame data, hitboxes and launch angles.

Pick a character you like, join their community Discord (linked on each character page), and get games in.`,
  },
  {
    game: "ultimate",
    type: "tech",
    title: "Short hop, full hop and fast fall",
    description: "The movement basics behind almost every combo and approach in Ultimate.",
    guide_body: `SHORT HOP
A short hop is a small jump. It lets you do an aerial attack low to the ground, which is safer and lands faster.
- Tap the jump button quickly and let go.
- Or press two jump buttons at the same time: Ultimate always gives you a short hop.
- Or press jump and attack together for an instant short hop aerial.

FULL HOP
Hold the jump button a little longer for a full jump. Use it to get over projectiles, reach platforms or chase opponents above you.

FAST FALL
At the top of a jump (or any time you're falling), press down on the control stick. Your character falls faster.
- Short hop, aerial, fast fall gets you back on the ground quickly so you're ready for the next move.
- Fast falling too early can mess up your combo timing, so practice when to do it.

PUTTING IT TOGETHER
A classic drill: short hop, neutral air, fast fall, land, repeat. Do it in training until it's automatic, then try it with your character's other aerials.

AUTO-CANCEL WINDOWS
Some aerials have no landing lag if they finish before you land, or if you land during their very start. Your character's Discord and frame data sites list which ones.`,
  },
  {
    game: "ultimate",
    type: "tech",
    title: "Ledge options in Ultimate",
    description: "Your choices when you're holding the ledge, and how to stay unpredictable.",
    guide_body: `WHEN YOU GRAB THE LEDGE
Your character gets a short moment of invincibility when they grab the ledge. Grabbing it again and again without touching the stage gives you less invincibility each time.

YOUR OPTIONS
1. Neutral getup: press toward the stage. Your character climbs up.
2. Getup attack: press attack. Your character climbs up with a hit.
3. Ledge roll: press shield. Your character rolls onto the stage.
4. Ledge jump: press jump. Your character jumps up and over.
5. Drop and come back: press down or away to let go, then use your double jump, an aerial, or your recovery to get back onstage your own way.

WHY MIXING THEM UP MATTERS
Your opponent waits near the ledge to cover your getup. If you always do the same thing, they'll punish it every time. Change both what you do and when you do it: wait a moment, act right away, or drop down and jump back up.

LEDGE TRUMPING
If you grab the ledge while someone else is holding it, you take it from them and knock them off. Watch for opponents trying this when you're on the ledge.

PRACTICE TIP
Watch a replay and count which ledge option you picked most. If it's always the same one, your next opponent will notice.`,
  },
  {
    game: "ultimate",
    type: "tech",
    title: "Shielding, parrying and out of shield options",
    description: "How shield works in Ultimate, how to parry, and the best ways to hit back from shield.",
    guide_body: `SHIELD
Hold L or R to shield. Your shield blocks attacks but shrinks while you hold it and when it gets hit. If it breaks, you're stunned and open to a big punish.

PARRY (PERFECT SHIELD)
Release shield just as an attack is about to hit you. If you time it right, your character flashes and you can act sooner than after a normal block. It's tricky, so start by practicing against slow, obvious attacks.

OUT OF SHIELD (OOS) OPTIONS
After you block an attack, you can hit back right away. Common options:
- Grab: press attack while shielding (or grab). It beats opponents who stay close.
- Up special or up smash: both can come straight out of shield. Many characters have a fast one.
- Jump out of shield into an aerial: often your fastest attack from shield.

Your character's frame data (on sites like Ultimate Frame Data) shows which option is fastest.

SHIELD DROP
On a platform, press down while shielding to drop through it. Good for moving and catching opponents off guard.

DON'T OVER-SHIELD
Shielding too much lets your opponent grab you. Mix in rolling, spot dodging and simply moving away.`,
  },
  {
    game: "ultimate",
    type: "frame_data",
    title: "Ultimate Frame Data",
    url: "https://ultimateframedata.com",
    description: "Frame data for every Ultimate character: how fast each move starts, how safe it is on shield, and more.",
  },
  {
    game: "ultimate",
    type: "other",
    title: "Character Discords for every Ultimate character",
    url: "https://www.ssbwiki.com/Discord",
    description: "Most character guides and matchup notes live in each character's Discord. SmashWiki keeps the full list (each character page on Smashy links its Discord too).",
  },
];

// San Antonio scene and its rulesets. Melee (version 2) is the ruleset San Antonio Melee events
// run, as Matthew passed it on (2026-11-11). Ultimate is still a starter that follows common
// tournament defaults; the scene's admins should edit it to match what their events run.
export const SCENE = {
  slug: "san-antonio",
  name: "San Antonio",
  region: "TX",
  cities: ["San Antonio"],
  games: ["melee", "ultimate"],
  description: "Smash in San Antonio, Texas: weeklies, monthlies and the people who run them.",
};

export const RULESETS = [
  {
    game: "melee",
    name: "San Antonio Melee",
    was: ["San Antonio Melee (starter)"],
    // Version 2 replaced the starter with these rules; version 3 only added counterpick_bans_top.
    version: 3,
    changelog: "No bans after each game in best-of-5 sets (Top 8), as the rules say. The stage striker now follows it.",
    // Not in the TO's rules, so left unset: a stage re-pick rule (DSR) and gentleman's agreements.
    rules: {
      stocks: 4,
      timer: 8,
      best_of: 3,
      best_of_top: 5,
      best_of_top_from: "Top 8",
      starters: ["Battlefield", "Dream Land N64", "Fountain of Dreams", "Yoshi's Story", "Final Destination"],
      counterpicks: ["Pokémon Stadium"],
      game1_striking: "1-2-1",
      counterpick_bans: 1,
      counterpick_bans_top: 0,
      wobbling: false,
      ledge_grab_limit: 60,
      coaching: "not_allowed",
    },
    notes: [
      "How a set goes: both players choose characters and agree on who bans first. Game 1: the first player bans 1 starter, the other bans 2, the first bans 1 more, and the stage that is left is played.",
      "After each game in a best of 3: the winner bans 1 stage, the loser picks the stage, the winner picks a character, then the loser picks a character. Pokémon Stadium can only be picked after game 1.",
      "Best of 5 (Top 8): game 1 is the same. After that there are no bans: the winner picks a character, the loser picks a character, then the loser picks the stage.",
      "Report your score to the TO after every set. Depending on how many people enter, players who are out may be placed in a redemption bracket.",
      "No-shows: 5 minutes after a match is called, a player who isn't there is disqualified.",
      "Ledge grab limit: 60. If a player may have gone over it, the results screen after the game is checked, and a player over the limit loses that game whatever the result was.",
      "Wobbling is banned (the national standard for counting grabs and hits is used).",
      "Timeouts are decided by stocks, then by percent. If both players lose their last stock at once and it goes to sudden death, they play again on the same stage with 1 stock and a 3-minute timer to decide that game.",
      "Floaty rule: in a Peach, Jigglypuff or Samus ditto (the same character on both sides), Dream Land can't be picked. Otherwise Dream Land is allowed.",
      "No coaching during a set. Don't disrupt your opponent during a game (shouting at them, touching their controller, and the like, at the TO's discretion).",
      "Ask a TO if you have a question before, during or after a set. The TO has the last say on any ruling, written here or not.",
    ].join("\n"),
  },
  {
    game: "ultimate",
    name: "San Antonio Ultimate (starter)",
    rules: {
      stocks: 3,
      timer: 7,
      best_of: 3,
      best_of_top: 5,
      best_of_top_from: "Top 8",
      starters: ["Battlefield", "Small Battlefield", "Final Destination", "Pokémon Stadium 2", "Smashville"],
      counterpicks: ["Town and City", "Hollow Bastion", "Kalos Pokémon League"],
      game1_striking: "1-2-1",
      counterpick_bans: 3,
      dsr: "none",
      gentlemans: true,
      hazards: false,
      stage_morph: false,
      spirits: false,
      mii_fighters: "All move sets legal",
    },
    notes:
      "Starter ruleset based on common Ultimate tournament defaults. San Antonio TOs: edit this to match your events, then publish a new version.",
  },
];
