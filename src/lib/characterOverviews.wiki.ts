// MADE FROM SmashWiki (round 938): don't edit by hand; regenerate. A minimal overview for every character
// that has no community guide yet, so that every character page opens with something (Matthew's goal,
// 2026-11-26). Each is a short summary of the "Attributes" section of that character's SmashWiki page
// (https://www.ssbwiki.com, text under CC BY-SA 4.0), credited and linked on the page. A community guide's
// overview in characterOverviews.ts always wins over one of these.
import type { CharacterOverview } from "./characterOverviews";
import type { GameKey } from "./games";

export const WIKI_OVERVIEWS: Partial<Record<GameKey, Record<string, CharacterOverview>>> = {
  brawl: {
    "bowser": {
      source: { title: "SmashWiki: Bowser (SSBB)", url: "https://www.ssbwiki.com/Bowser_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Bowser is the largest and heaviest character in Brawl, built around KO power rather than speed. He hits very hard on the ground and in the air, but his attacks are slow to start and finish. Fire Breath racks up damage and stops approaches, and Flying Slam gives him a sacrificial KO when he is behind.",
      },
      traits: [],
      strengths: [{ en: "His weight lets him survive to late percentages." }, { en: "His forward smash is the most damaging smash attack in Brawl." }, { en: "Whirling Fortress is a very good out-of-shield move." }, { en: "His grab release is quick and leads into a jab, a tilt or another grab." }],
      weaknesses: [{ en: "His size, weight and gravity leave him open to chain grabs and combos." }, { en: "Whirling Fortress gives poor recovery distance and is easily gimped." }, { en: "Poor mobility makes approaching hard and lets many characters camp him." }, { en: "His aerials are laggy, and only forward aerial works for approaching and spacing." }],
    },
    "captain-falcon": {
      source: { title: "SmashWiki: Captain Falcon (SSBB)", url: "https://www.ssbwiki.com/Captain_Falcon_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Captain Falcon is a heavy, fast-falling character with strong attacks and the second fastest running speed. He fights at close quarters with hard-hitting kicks and punches, most of which are slow to start and hard to land. He relies on his weight, power and mobility to make up for a very poor approach.",
      },
      traits: [],
      strengths: [{ en: "He has the second fastest running speed in the game." }, { en: "Knee Smash, back aerial, down aerial and forward smash are all powerful finishers." }, { en: "His weight and fast falling speed help him survive, especially vertically." }],
      weaknesses: [{ en: "His attacks start slowly and have small hitboxes, so they are hard to land." }, { en: "He has no projectile and few disjointed hitboxes, so he is easily outcamped." }, { en: "His weight, size and falling speed make him easy to chain grab and combo." }, { en: "Falcon Dive is slow and easy to edgeguard." }],
    },
    "diddy-kong": {
      source: { title: "SmashWiki: Diddy Kong (SSBB)", url: "https://www.ssbwiki.com/Diddy_Kong_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Diddy Kong is a quick middleweight who can wall cling and crawl, with fast attacks of decent power. His game is built around Banana Peels, which trip opponents, combo into his other moves and set up KOs. Glide tossing bananas lets him approach and retreat rapidly and gives him excellent ground options and stage control.",
      },
      traits: [],
      strengths: [{ en: "Banana Peels trip opponents and lead into combos and KO setups." }, { en: "He has a quick dash attack, large grab range and powerful throws." }, { en: "Monkey Flip and Rocketbarrel Boost give him an above-average recovery." }, { en: "His forward aerial has good range and knockback for KOs and edgeguarding." }],
      weaknesses: [{ en: "His KO power is low, with few KO moves and weak smashes that stale quickly." }, { en: "Opponents can pick up his Banana Peels and use them against him." }, { en: "Rocketbarrel Boost leaves him vulnerable while charging." }],
    },
    "donkey-kong": {
      source: { title: "SmashWiki: Donkey Kong (SSBB)", url: "https://www.ssbwiki.com/Donkey_Kong_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Donkey Kong is a very heavy character with very powerful attacks, great range and high knockback. He is one of the fastest heavyweights, with fast running, walking and air speed. He relies on his power and range to limit the opponent's approaches, and he has many KO options and strong shield pressure.",
      },
      traits: [],
      strengths: [{ en: "His weight, long horizontal recovery and Spinning Kong make him extremely hard to KO." }, { en: "All of his smash attacks are powerful, and he has three reliable meteor smashes." }, { en: "Headbutt, fully charged Giant Punch and grounded Spinning Kong do high shield damage." }, { en: "He has a large grab range, powerful throws and a very short grab release animation." }],
      weaknesses: [{ en: "He has no projectile and no reliable way to deal with them." }, { en: "His large size makes him easy to hit and open to many chain grabs." }, { en: "His vertical recovery is very poor, so even weak meteor smashes can be devastating." }],
    },
    "falco": {
      source: { title: "SmashWiki: Falco (SSBB)", url: "https://www.ssbwiki.com/Falco_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Falco has quick attacks, strong follow-ups, a wall jump, the highest initial jump in the game and a very versatile projectile. His Blaster lets him camp, approach or shut down approaches, and he is also very good at close range. His down throw chain grab racks up damage easily and can end in a down aerial meteor smash.",
      },
      traits: [],
      strengths: [{ en: "Blaster has great range and leads straight into his other attacks." }, { en: "His down throw chains into itself on most characters and sets up many follow-ups." }, { en: "He has a very fast jab and one of the fastest spot dodges in the game." }, { en: "His down aerial is a fast, powerful meteor smash." }],
      weaknesses: [{ en: "Fire Bird covers very little distance and is easily edgeguarded." }, { en: "His KO moves are hard to land, especially against quick, mobile characters." }, { en: "His grab range is poor, so nimble characters are hard to grab." }, { en: "His falling speed leaves him open to Pikachu's chain grab." }],
    },
    "fox": {
      source: { title: "SmashWiki: Fox (SSBB)", url: "https://www.ssbwiki.com/Fox_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Fox is a lightweight glass cannon with impressive ground mobility and quick attacks that combo into each other. He has strong vertical KO moves in his up smash and up aerial, and his Blaster builds damage from a distance and can force approaches. He is very fragile and difficult to play and master.",
      },
      traits: [],
      strengths: [{ en: "He has the third fastest dashing speed and second fastest walking speed in the game." }, { en: "Up smash is a fast, powerful finisher, and up aerial also KOs well." }, { en: "His fast falling speed makes him hard to juggle." }, { en: "Reflector reflects projectiles and can semi-spike opponents when used in the air." }],
      weaknesses: [{ en: "His light weight, fast falling speed and high gravity give him extremely poor endurance." }, { en: "He is very susceptible to chain grabs and moves that string into themselves." }, { en: "Most of his attacks have small, short-reaching hitboxes, which makes approaching harder." }, { en: "His grab game is unreliable, and Fire Fox is easily edgeguarded." }],
    },
    "ganondorf": {
      source: { title: "SmashWiki: Ganondorf (SSBB)", url: "https://www.ssbwiki.com/Ganondorf_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ganondorf is a heavy, fast-falling character with strong attacks, short range and the slowest movement in the game. His attacks hit hard and his aerials are strong edgeguarding tools, but they are slow and easy to shield or dodge. His side special on the ground leaves opponents open to a quick follow-up attack.",
      },
      traits: [],
      strengths: [{ en: "His attacks have high knockback, and his aerials are strong edgeguarding tools." }, { en: "His down aerial is the strongest meteor smash in the game." }, { en: "Up smash is powerful and has very low ending lag." }, { en: "His weight and momentum canceling can let him live to very high percents." }],
      weaknesses: [{ en: "His mobility is very poor, and he has no projectile or easy answer to camping." }, { en: "His recovery is slow, predictable and easily gimped, among the worst in the game." }, { en: "His ground attacks are among the slowest in the game." }, { en: "He has the shortest standing grab range in the game and weak out of shield options." }],
    },
    "ice-climbers": {
      source: { title: "SmashWiki: Ice Climbers (SSBB)", url: "https://www.ssbwiki.com/Ice_Climbers_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "The Ice Climbers are lightweight characters who fight as two in one, with a leader and a slightly weaker follower. Together they deal damage well and have a grab game unique to them, with infinite chain grabs that lead into KO moves. Protecting the partner matters, because a lone Climber is much weaker.",
      },
      traits: [],
      strengths: [{ en: "Their infinite chain grabs work at any percent, on any character." }, { en: "When one Climber is grabbed the partner can counterattack, making them immune to chain grabs." }, { en: "Ice Shot slides along the ground and cannot be avoided by crouching." }, { en: "Desyncing lets the player control both Climbers for attacks that are hard to escape." }],
      weaknesses: [{ en: "Strong attacks separate them easily, and a lone Climber loses damage, KO power and recovery." }, { en: "Short grab range and low traction make grabbing after shielding an attack very hard." }, { en: "They move slowly, with slow falling, air and dash speed." }, { en: "Desync techniques are extremely difficult to perform in combat." }],
    },
    "ike": {
      source: { title: "SmashWiki: Ike (SSBB)", url: "https://www.ssbwiki.com/Ike_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ike is a moderately heavy character with very slow but powerful attacks that have outstanding range. He plays best at range, spacing with forward and back aerials and KOing at low damage. He depends on careful prediction and spacing to land hits, and can take most of a stock within seconds when he does.",
      },
      traits: [],
      strengths: [{ en: "Most of his attacks have high damage, great knockback and outstanding range." }, { en: "His forward aerial has the most horizontal range of any normal aerial in the game." }, { en: "He is an effective edge guarder with several meteor smash and aerial options." }, { en: "Forward smash and up smash punish rolls and air dodges." }],
      weaknesses: [{ en: "His attacks have massive starting and ending lag, so they are easy to dodge and punish." }, { en: "His recovery is predictable and vulnerable to edge guarding and gimps." }, { en: "He has no projectile and is extremely vulnerable to projectile camping." }, { en: "As a large, fast-falling heavyweight he is open to chain grabs." }],
    },
    "jigglypuff": {
      source: { title: "SmashWiki: Jigglypuff (SSBB)", url: "https://www.ssbwiki.com/Jigglypuff_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Jigglypuff is the lightest and floatiest character in the game, with six jumps, the second fastest air speed and the slowest falling speed. It dominates in the air, using forward aerial and back aerial to carry opponents off-screen for KOs at low percentages. Its attacks have very low range, so approaching is dangerous.",
      },
      traits: [],
      strengths: [{ en: "Its aerial mobility is excellent and helps it dodge many projectiles." }, { en: "Being light, floaty and small makes it immune to most chain grabs." }, { en: "Rest gives instant invincibility and KOs early when it hits." }, { en: "Its slow falling speed and Rollout help its recovery." }],
      weaknesses: [{ en: "It is sent flying easily in any direction, and vertical KOs on it are very easy." }, { en: "Its attacks have very low range." }, { en: "It has the slowest dash speed in the game." }, { en: "A missed Rest leaves it extremely vulnerable." }],
    },
    "king-dedede": {
      source: { title: "SmashWiki: King Dedede (SSBB)", url: "https://www.ssbwiki.com/King_Dedede_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "King Dedede is a heavyweight with high KO power, long range, large size and slow movement and attacks. He turns defense into offense, punishing approaches with his long grab and chain throws and then edgeguarding. He pressures from a distance with forward tilt and Waddle Dee Toss, and he is very hard to KO.",
      },
      traits: [],
      strengths: [{ en: "He has the longest non-tether grab reach in the game and among the best chain throws." }, { en: "His weight and fastest falling speed give him the best vertical endurance in the game." }, { en: "He excels at edge-guarding and gimping, with many options." }, { en: "His recovery goes far and is much harder to gimp than other heavyweights'." }],
      weaknesses: [{ en: "He is very slow, with the third slowest dash speed and the worst air speed." }, { en: "Almost every attack has some lag, so landing a KO move can be difficult." }, { en: "As a slow, large target he is susceptible to projectiles, air camping and meteor smashes." }],
    },
    "kirby": {
      source: { title: "SmashWiki: Kirby (SSBB)", url: "https://www.ssbwiki.com/Kirby_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Kirby is a small, lightweight character with a strong ground game, good combos and a safe, long recovery from five midair jumps and Final Cutter. His attacks reach further than his size suggests, and his back aerial is his most used and versatile move. Poor mobility and the lack of a solid projectile make approaching difficult.",
      },
      traits: [],
      strengths: [{ en: "His recovery is safe and one of the longest-reaching." }, { en: "Forward throw, forward tilt, up tilt and up aerial are great damage rackers and setups." }, { en: "He has good finishers in his smash attacks, back aerial, Hammer and Stone." }, { en: "His grab is fast with above average range, and his throws are useful." }],
      weaknesses: [{ en: "His mobility is poor on the ground and in the air." }, { en: "His light weight and poor momentum canceling make him easy to KO." }, { en: "He lacks a solid projectile, so characters who camp with projectiles are hard to face." }, { en: "Apart from back aerial his aerials are poor, leaving him prone to juggling." }],
    },
    "link": {
      source: { title: "SmashWiki: Link (SSBB)", url: "https://www.ssbwiki.com/Link_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Link is a moderately heavy character with poor speed who makes up for it with power. His tilts are fast and strong, and his bow, bombs and Gale Boomerang let him keep distance and rack up damage. He survives a long time onstage, but his recovery is one of the worst in the game.",
      },
      traits: [],
      strengths: [{ en: "His tilts are fast and powerful, and forward smash and down smash are good KO moves." }, { en: "His special moves are good for keeping distance and racking up damage." }, { en: "Good directional influence and momentum canceling help him survive a long time onstage." }, { en: "Neutral aerial and grab aerial are great options for approaching." }],
      weaknesses: [{ en: "His recovery is short, slow and predictable, and easy to edgeguard and gimp." }, { en: "His mobility is poor, giving him a poor approach." }, { en: "His weight makes him extremely vulnerable to chain grabs that force him offstage." }, { en: "His slow air speed, fast falling speed and small jumps give him a weak aerial game." }],
    },
    "lucario": {
      source: { title: "SmashWiki: Lucario (SSBB)", url: "https://www.ssbwiki.com/Lucario_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucario has fairly fast attacks, decent maneuverability and a very strong air game. Its aura makes its attacks stronger when it is at high damage or behind, and weaker when it is at low damage or ahead. This rewards it for falling behind and punishes it for pulling ahead, which encourages close matches and comebacks.",
      },
      traits: [],
      strengths: [{ en: "Its aerials are fast and strong, good for juggling, approaching and defending." }, { en: "Aura adds damage and hitbox size at high damage, giving it a better chance of a comeback." }, { en: "ExtremeSpeed can be bent for unpredictable recovery angles." }, { en: "Aura Sphere is a multi-purpose projectile that can bother approaches or KO at high percentages." }],
      weaknesses: [{ en: "At low damage or when ahead in stocks, its whole moveset is weakened." }, { en: "Its floatiness leaves it susceptible to juggling." }, { en: "Most of its ground attacks are slow, and its ground mobility is average at best." }, { en: "Its recovery deals no damage, so it is easier to interrupt." }],
    },
    "lucas": {
      source: { title: "SmashWiki: Lucas (SSBB)", url: "https://www.ssbwiki.com/Lucas_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucas has some slow but strong attacks with large hitboxes, average dashing speed and generally quick, disjointed aerials. His smash attacks are among the strongest in the game, and he has a long tether grab with powerful throws. Techniques such as Zap Jump and Magnet Pull give him a recovery that is hard to gimp.",
      },
      traits: [],
      strengths: [{ en: "His smash attacks are powerful, and forward smash also reflects projectiles." }, { en: "His grab range is long and his throws are strong, with good KO potential." }, { en: "His recovery has many options and is hard to gimp." }, { en: "The end of his down aerial sets up a down tilt lock into a finisher." }],
      weaknesses: [{ en: "He has extra lag after escaping grabs, so many characters can regrab or hit him." }, { en: "PK Freeze and PK Thunder leave him very vulnerable while he controls them." }, { en: "Up smash and down smash have enough ending lag to be punished easily." }, { en: "His grab is quite laggy if it misses." }],
    },
    "luigi": {
      source: { title: "SmashWiki: Luigi (SSBB)", url: "https://www.ssbwiki.com/Luigi_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Luigi is a surprisingly strong middleweight with very quick attacks but slow mobility and short range. He is a good juggler and works well on the ground and in the air. He is extremely dangerous once he gets close, but approaching is hard, and opponents who keep him out of range have a clear advantage.",
      },
      traits: [],
      strengths: [{ en: "Almost all his attacks are fast, and his smashes are unusually strong." }, { en: "Up tilt, neutral aerial and up aerial make him a good juggler." }, { en: "A sweetspotted Super Jump Punch becomes the Fire Jump Punch and KOs very early." }, { en: "He has the second highest initial jump in the game." }],
      weaknesses: [{ en: "Slow air speed, slow dash speed and the lowest traction make approaching very hard." }, { en: "His moves are short-ranged, so characters with speed and range can keep him away." }, { en: "King Dedede can infinitely chain grab him without a wall." }, { en: "A Super Jump Punch that misses the sweetspot is very punishable." }],
    },
    "mario": {
      source: { title: "SmashWiki: Mario (SSBB)", url: "https://www.ssbwiki.com/Mario_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mario is a straightforward, balanced character with average attributes and tools for any situation. He has fast options across his moveset on the ground and in the air, with Fireball to interrupt approaches and Cape to reflect and gimp. His short reach means he has to get up close to deal damage or land KOs.",
      },
      traits: [],
      strengths: [{ en: "He has quick attacks on the ground and in the air." }, { en: "His aerials are fairly quick with decent power, and up aerial is very useful in combos." }, { en: "Super Jump Punch is the fastest out of shield option in the game." }, { en: "His throws set up juggles, combos, offstage situations and KOs at high percentages." }],
      weaknesses: [{ en: "His KO potential is poor, with relatively weak forward and up smashes." }, { en: "Apart from Fireball his attacks are very short-ranged." }, { en: "Super Jump Punch follows a predictable path and does not go far, so he is gimped easily." }, { en: "He is extremely vulnerable to chain grabs from several characters." }],
    },
    "marth": {
      source: { title: "SmashWiki: Marth (SSBB)", url: "https://www.ssbwiki.com/Marth_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Marth is a quick-footed, far-reaching lightweight who is almost unparalleled in the air. His attacks are stronger at the tip of his blade, which shapes much of how he is played, and they are relatively weak otherwise. His speed and range let him pressure opponents aggressively, and he relies on edgeguarding to KO heavier characters.",
      },
      traits: [],
      strengths: [{ en: "Most of his attacks start quickly and have good reach." }, { en: "He has a great aerial moveset and air defense." }, { en: "Dolphin Slash escapes chain grabs and is a powerful out of shield option." }, { en: "He has good grab reach and can chain grab several characters with forward throw." }],
      weaknesses: [{ en: "He has no projectile." }, { en: "His attacks are easily punished if shielded and not spaced well." }, { en: "He has difficulty KOing heavier characters, especially those with good momentum canceling." }, { en: "His throws are extremely weak in damage and knockback." }],
    },
    "meta-knight": {
      source: { title: "SmashWiki: Meta Knight (SSBB)", url: "https://www.ssbwiki.com/Meta_Knight_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Meta Knight is a small, light character with fast ground movement and extremely fast attacks, many of them disjointed sword swings. His moves are very difficult to challenge or punish and chain into one another for strong combos. With five midair jumps, two glides and the best recovery in the game, he can play aggressively or defensively.",
      },
      traits: [],
      strengths: [{ en: "Almost all his moves have little startup and ending lag." }, { en: "He has the best recovery in the game." }, { en: "His offstage game is dominant, able to gimp and edge-guard almost any foe." }, { en: "Down smash and Shuttle Loop are quick, strong KO moves." }],
      weaknesses: [{ en: "Being a lightweight, he has very poor endurance." }, { en: "His air speed is very low." }, { en: "Many of his multi-hit moves can be escaped, and his damage output is average at best." }, { en: "He has trouble fighting competent campers." }],
    },
    "mr-game-and-watch": {
      source: { title: "SmashWiki: Mr. Game & Watch (SSBB)", url: "https://www.ssbwiki.com/Mr._Game_%26_Watch_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mr. Game & Watch is a small, very light character whose attacks generally have favorable hitboxes, low lag and high knockback. His tilts are quick, powerful and disjointed, and his smashes are very powerful. He is quick, hard to predict and difficult to hit, and he can negate energy and electric projectiles with Oil Panic.",
      },
      traits: [],
      strengths: [{ en: "All of his smashes can KO early, and down smash is very fast." }, { en: "His down throw can tech chase and leads into many follow-ups." }, { en: "Fire is a superior out of shield option." }, { en: "Bucket Braking and directional influence make him hard to KO despite his light weight." }],
      weaknesses: [{ en: "His roll and dash attack are rather poor." }, { en: "All of his aerials except neutral aerial are laggy." }, { en: "His throws other than down throw are not particularly effective." }, { en: "Chef has short range and a random trajectory." }],
    },
    "ness": {
      source: { title: "SmashWiki: Ness (SSBB)", url: "https://www.ssbwiki.com/Ness_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ness is a versatile character with three different projectiles, powerful throws and balanced weight, falling speed and air speed. His real strength is in his aerials, and he is one of very few characters who can do two aerials in one short hop. His ground game is underwhelming, with slow dash speed and short range tilts.",
      },
      traits: [],
      strengths: [{ en: "His throws are powerful, and back throw is a reliable KO move." }, { en: "His aerials cover combos, damage-racking, KOs and edgeguarding." }, { en: "A clean down aerial is among the best meteor smashes in the game." }, { en: "PK Thunder 2 is one of the strongest attacks in the game." }],
      weaknesses: [{ en: "His long grab release animation lets most characters follow up, including with chain grabs." }, { en: "His recovery is poor, as PK Thunder needs room and stops when it hits something." }, { en: "He has the shortest standing grab range in the game." }, { en: "Slow dash speed and short range tilts hurt him against disjointed hitboxes." }],
    },
    "olimar": {
      source: { title: "SmashWiki: Olimar (SSBB)", url: "https://www.ssbwiki.com/Olimar_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Olimar is a small, light, highly technical character whose attacks mostly rely on Pikmin, each type with its own strengths. He is about damage, throwing Pikmin constantly and guarding himself with long-lasting, long-reaching moves and a long grab. He is very hard to learn, and his recovery is his biggest problem.",
      },
      traits: [],
      strengths: [{ en: "With the right Pikmin he has the longest grab range in the game." }, { en: "Pikmin Throw racks up heavy damage from a distance." }, { en: "Forward smash has range and power and is difficult to punish." }, { en: "His small size and the armor on Pikmin Order make him hard to KO." }],
      weaknesses: [{ en: "His tether recovery is very poor and at the mercy of edge hogging." }, { en: "Without Pikmin most of his moveset does nothing, and he loses them all when KO'd." }, { en: "He is light and floaty, so most characters can juggle him easily." }, { en: "He is slow in the air and on the ground." }],
    },
    "peach": {
      source: { title: "SmashWiki: Peach (SSBB)", url: "https://www.ssbwiki.com/Peach_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Peach is a light to medium hitter who excels as an in-close brawler. She racks up damage easily at low percentages with down throw, down aerial and her floating ability, and relies on glide tossing Vegetables to approach. Finishing opponents is harder, and she leans on forward aerial for KOs.",
      },
      traits: [],
      strengths: [{ en: "She has plenty of ways to rack up damage, especially at low percentages." }, { en: "Forward aerial, down aerial and jab have large hitboxes that break through many attacks." }, { en: "Her horizontal recovery is excellent." }, { en: "She can pull turnips quickly for traps and a chance at powerful items." }],
      weaknesses: [{ en: "She struggles to KO, with forward aerial her only reliable KO move." }, { en: "She is light and floaty with the worst air dodge in the game, so she is easily juggled." }, { en: "Her recovery is predictable and poor vertically, with the shortest second jump in the game." }, { en: "Her attack range is short outside forward aerial, and her dash speed is slow." }],
    },
    "pikachu": {
      source: { title: "SmashWiki: Pikachu (SSBB)", url: "https://www.ssbwiki.com/Pikachu_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pikachu is a small, light character whose main feature is its speed. It plays best on the ground at medium range, using Thunder Jolt to keep opponents at bay and fast tilts and smashes up close. Up smash and down smash can be followed by Thunder for a KO, and its down throw chain grabs most characters.",
      },
      traits: [],
      strengths: [{ en: "Its up smash is one of the fastest in the game and excellent for KOs." }, { en: "Quick Attack makes its recovery unpredictable and hard to edgeguard." }, { en: "Its forward and down throws can chain grab." }, { en: "Thunder Jolt hugs the ground, so ducking or crawling does not avoid it." }],
      weaknesses: [{ en: "It is the 5th lightest character, so strong smash attacks knock it off-stage easily." }, { en: "It has the smallest shield in the game." }, { en: "Its aerials are its weakest area." }, { en: "A reflected Thunder deals its knockback to Pikachu." }],
    },
    "pit": {
      source: { title: "SmashWiki: Pit (SSBB)", url: "https://www.ssbwiki.com/Pit_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pit can play many roles. He moves fairly quickly, combines attacks well, has low lag smashes and a respectable aerial game, and Palutena's Arrow is a fast, long-range projectile. His moves have low lag and low knockback, so KOing can be difficult, and he has two moves that reflect projectiles.",
      },
      traits: [],
      strengths: [{ en: "Palutena's Arrow is fast, long-ranged and quick to start." }, { en: "He has one of the longest recoveries in the game, with three midair jumps and a glide." }, { en: "Mirror Shield and Angel Ring both reflect projectiles." }, { en: "His back aerial is a fast, solid KO move." }],
      weaknesses: [{ en: "His moves have low knockback and his smashes stale, making KOs difficult." }, { en: "His close-up game is held back by poor range." }, { en: "He is easily juggled." }, { en: "If hit out of Wings of Icarus, he cannot use it again before landing." }],
    },
    "pokemon-trainer": {
      source: { title: "SmashWiki: Pokémon Trainer (SSBB)", url: "https://www.ssbwiki.com/Pok%C3%A9mon_Trainer_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pokémon Trainer is three characters in one, switching between Squirtle, Ivysaur and Charizard with Pokémon Change. Squirtle and Ivysaur are excellent at racking up damage, and Charizard is heavier and finishes with high knockback moves. Switching to the right Pokémon at the right moment matters, and all three share a strong grab and throw game.",
      },
      traits: [],
      strengths: [{ en: "All three Pokémon have a strong grab and throw game." }, { en: "The Pokémon differ in weight and size, so each can be switched in at opportune moments." }, { en: "Pokémon Change gives invincibility that can avoid attacks on the ground." }, { en: "Charizard has the second longest non-tether grab range in Brawl." }],
      weaknesses: [{ en: "After 1 minute and 20 seconds, stamina significantly weakens a Pokémon's moves." }, { en: "Pokémon Change happens automatically after a KO, and switching back takes several seconds." }, { en: "The incoming Pokémon is somewhat vulnerable at the end of Pokémon Change." }, { en: "All three Pokémon are affected by type effectiveness." }],
    },
    "rob": {
      source: { title: "SmashWiki: R.O.B. (SSBB)", url: "https://www.ssbwiki.com/R.O.B._(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "R.O.B. is a heavy, floaty long-range attacker who keeps opponents away with two projectiles and attacks that mix moderate power and range with little lag. He builds damage by knocking opponents back again and again with superior range. Up close at his base he has a blind spot, so keeping foes at a distance matters.",
      },
      traits: [],
      strengths: [{ en: "Two projectiles with decent knockback disrupt the opponent's approach." }, { en: "His exceptional recovery uses Robo Burner and travels very far vertically." }, { en: "His moves link together fairly easily, so damage adds up quickly." }, { en: "He can easily set up an edge guard with a forward or back throw." }],
      weaknesses: [{ en: "His KO moves start slowly and go stale, so he sometimes cannot KO." }, { en: "His projectiles must be charged or recharged, so they cannot be spammed." }, { en: "He is a large, floaty target who can be juggled and KO'd vertically quite early." }, { en: "He cannot air dodge out of Robo Burner, which makes his recovery predictable." }],
    },
    "samus": {
      source: { title: "SmashWiki: Samus (SSBB)", url: "https://www.ssbwiki.com/Samus_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Samus is a floaty heavyweight who zones with a wide array of projectiles and long-range attacks, wearing opponents down from a safe distance. She works best moving from the air to the ground, since her aerials have no landing lag and lead into stronger moves. She has to play conservatively, because she has very few ways to finish.",
      },
      traits: [],
      strengths: [{ en: "Charge Shot, two kinds of Missile, Bombs and the Grapple Beam let her frustrate opponents from afar." }, { en: "None of her aerials have landing lag, so they lead into forward smash or down tilt." }, { en: "Her weight and above-average recovery keep her alive for a long time." }, { en: "A fully charged Charge Shot and her Missiles are strong for edgeguarding." }],
      weaknesses: [{ en: "She has an extreme lack of finishing moves and struggles to KO before high damage." }, { en: "Her height and weight make her easier to hit and very easy to chain grab." }, { en: "Her slow fall makes her recovery predictable and leaves her open to juggling." }, { en: "She has no reliable answer to opponents' projectiles, and the slowest shield roll in the game." }],
    },
    "sheik": {
      source: { title: "SmashWiki: Sheik (SSBB)", url: "https://www.ssbwiki.com/Sheik_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sheik is one of the fastest characters in the game, with quick attacks that have little lag and low knockback, so they chain together well. She racks up damage with many hits, especially forward tilt strings, then relies on edgeguarding or a sweetspotted up smash to finish. Transforming into Zelda can help cover her lack of KO power.",
      },
      traits: [],
      strengths: [{ en: "One of the best combo abilities; forward tilt links into itself and follows many other moves." }, { en: "Needle Storm is a fast projectile that is hard to dodge and can be charged." }, { en: "Her back and neutral aerials have good range and are useful for edgeguarding." }, { en: "Her forward aerial sends opponents at a low angle and KOs well at higher damage." }],
      weaknesses: [{ en: "Most of her moves lack KO power, and her strongest KO moves are hard to land." }, { en: "She is very light and tall for her weight, so she is easier to defeat." }, { en: "Her recovery is poor and often comes up short." }, { en: "She falls fast, so chain grabs that work on fast-fallers work on her." }],
    },
    "snake": {
      source: { title: "SmashWiki: Snake (SSBB)", url: "https://www.ssbwiki.com/Snake_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Snake is a super heavyweight with slow movement and very powerful attacks who controls the stage with explosives. He camps and defends behind grenades, mines and missiles, then punishes up close with fast, strong ground attacks. He survives to very high damage, but he is weak in the air and can struggle to escape once he is at a disadvantage.",
      },
      traits: [],
      strengths: [{ en: "His forward tilt and up tilt are fast, far-reaching and strong enough to KO." }, { en: "He has the most projectiles in the game, and nearly all of them can edgeguard." }, { en: "His very high weight lets him survive to high damage and trade blows at little risk." }, { en: "His down throw forces a tech chase that keeps opponents within range of his ground game." }],
      weaknesses: [{ en: "High falling speed and weight make him extremely vulnerable to juggling and chain grabs." }, { en: "His aerials have long ending and landing lag, and he has the slowest ground jump." }, { en: "Cypher is slow, predictable and cannot hurt edgeguarders, so recovering is difficult." }, { en: "Opponents can use his own explosives against him." }],
    },
    "sonic": {
      source: { title: "SmashWiki: Sonic (SSBB)", url: "https://www.ssbwiki.com/Sonic_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sonic is the fastest character in the game and uses that speed to stay close, since he has small hitboxes and no real projectile. He racks up damage easily with follow-ups, baits opponents by running in and out, and punishes their mistakes with grabs. Landing a KO is hard for him, and his running game takes practice to master.",
      },
      traits: [],
      strengths: [{ en: "The fastest dash speed by far, with excellent follow-up ability on practically every character." }, { en: "Tremendous vertical recovery and Homing Attack make him one of the harder characters to gimp." }, { en: "Good punish options and one of the best shields, with Spin Dash fake-outs." }, { en: "His down and side specials cancel momentum, letting him survive to very high damage." }],
      weaknesses: [{ en: "All of his KO moves are unreliable, with no guaranteed setups and no early KO move." }, { en: "Small hitboxes and no real projectile mean he must stay close to attack." }, { en: "He is easy to grab out of attacks that end right next to the opponent." }, { en: "He is difficult to play well, because his running game must be mastered." }],
    },
    "toon-link": {
      source: { title: "SmashWiki: Toon Link (SSBB)", url: "https://www.ssbwiki.com/Toon_Link_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Toon Link is a small, nimble, floaty middleweight who plays as a zoner. He keeps opponents out of his space with three projectiles and a grab aerial, building damage until he can land a KO. His sword attacks have decent range and little lag, and his bombs set up mindgames and combos into other attacks.",
      },
      traits: [],
      strengths: [{ en: "Three projectiles and a grab aerial give him a decently powerful ranged game." }, { en: "His attacks have decent range, disjointed hitboxes and minimal lag." }, { en: "He has an above-average aerial game and overall mobility." }, { en: "His bombs are great for mindgames and combo into other attacks." }],
      weaknesses: [{ en: "He has few reliable KO moves, and his best one, up smash, is predictable." }, { en: "His recovery is predictable and fairly easy to edge guard because he is floaty." }, { en: "His tether grab leaves him vulnerable if it misses." }],
    },
    "wario": {
      source: { title: "SmashWiki: Wario (SSBB)", url: "https://www.ssbwiki.com/Wario_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Wario is a short heavy character with by far the best aerial mobility in the game. He flies in and out, baiting attacks and punishing with fast aerials, and can camp well despite having no reliable projectile. He has to stay deceptive and slippery, because his range is poor and being grabbed is dangerous for him.",
      },
      traits: [],
      strengths: [{ en: "He changes direction and speed in the air almost instantly, and his short frame is hard to hit." }, { en: "His KO moves are brutal, including forward smash and a perfectly timed Wario Waft." }, { en: "A good grab game: down throw chain throws several characters, and Chomp beats sidesteps." }, { en: "One of the best recoveries in the game when the Wario Bike and Wario Waft are available." }],
      weaknesses: [{ en: "He has few KO moves, so he must avoid letting them go stale." }, { en: "Without the Wario Bike or Wario Waft his recovery is rather poor." }, { en: "His range is poor, which shows more when the bike is unavailable." }, { en: "Grab releases leave him open to being hit hard or regrabbed without end." }],
    },
    "wolf": {
      source: { title: "SmashWiki: Wolf (SSBB)", url: "https://www.ssbwiki.com/Wolf_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Wolf is a balanced character whose standard attacks start quickly, reach far and deal solid damage, letting him punish well on the ground and in the air. He runs slowly but moves fast through the air, and many of his attacks can KO. His recovery is easy to predict, so opponents who exploit his weaknesses give him trouble.",
      },
      traits: [],
      strengths: [{ en: "Most of his standard attacks are quick with good reach, and many can KO." }, { en: "A proficient air game; back aerial is quick, powerful and among his best finishers." }, { en: "Blaster lasers cause significant hitstun and cannot be ducked on level ground." }, { en: "Reflector deflects projectiles and gives him invincibility frames." }],
      weaknesses: [{ en: "Heavy weight and fast falling speed leave him vulnerable to chain grabs, juggling and some locks." }, { en: "His recovery is easily predicted and his ledge sweet spot is tiny, so he is easily gimped." }, { en: "The longest meteor cancel delay in the game makes meteor smashes very hard to survive." }, { en: "Many of his attacks have poor shield stun, so opponents can shield grab him easily." }],
    },
    "yoshi": {
      source: { title: "SmashWiki: Yoshi (SSBB)", url: "https://www.ssbwiki.com/Yoshi_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Yoshi is a heavy character who is small and fast for his weight, with the fastest air speed in the game and a slow fall. His midair jump goes farther than any other and resists knockback, which makes him an effective edge guarder. Many of his advantages come from grab-release tricks, and he is very hard to learn.",
      },
      traits: [],
      strengths: [{ en: "He has the fastest air speed in the game and is very maneuverable in the air." }, { en: "His midair jump is the farthest-reaching in the game and resists knockback as it rises." }, { en: "He has a grab-release on at least nineteen characters." }, { en: "He has arguably the best pivot grab and one of the best spot dodges in the game." }],
      weaknesses: [{ en: "His third jump is tiny, so being hit or grabbed during his second jump is devastating." }, { en: "He cannot jump out of shield and drops it slowly, so punishing from shield is nearly impossible." }, { en: "His grabs are slow, punishable and short for tether grabs." }, { en: "He has few effective ways to advance on the opponent, and his specials are situational." }],
    },
    "zelda": {
      source: { title: "SmashWiki: Zelda (SSBB)", url: "https://www.ssbwiki.com/Zelda_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Zelda is a floaty, lightweight glass cannon with very slow ground movement and strong, magic-boosted attacks. She relies on a solid defensive game and out-of-shield options to land powerful blows when the opponent comes to her. She has a hard time approaching, and does not survive long once she starts getting hit.",
      },
      traits: [],
      strengths: [{ en: "Her forward, back and up aerials are the strongest in the game." }, { en: "Her forward and up smashes start fast, hit several times and end with powerful knockback." }, { en: "A solid defensive game: good rolls and spot dodge, and up smash is quick out of shield." }, { en: "Nayru's Love reflects projectiles and deals serious damage." }],
      weaknesses: [{ en: "Very slow ground movement and poor approach options let campers easily outcamp her." }, { en: "She is light, tall and floaty, so she is easy to juggle and very easy to KO." }, { en: "Her strongest finishers have tiny sweetspots and are extremely difficult to land." }, { en: "One of the worst combo abilities in the game, with a slow grab and situational specials." }],
    },
    "zero-suit-samus": {
      source: { title: "SmashWiki: Zero Suit Samus (SSBB)", url: "https://www.ssbwiki.com/Zero_Suit_Samus_(SSBB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Zero Suit Samus is a tall lightweight with very strong mobility, fast attacks and long range, suited to a hit-and-run style. She pressures with large hitboxes while staying hard to catch, then juggles, edgeguards and finishes with her aerials. Her grounded attacks mostly start or extend pressure, so she depends on setups and careful spacing to take stocks.",
      },
      traits: [],
      strengths: [{ en: "She is very fast on the ground, with high jumps and strong air mobility." }, { en: "Forward, back and up aerials all KO at reasonable percentages and juggle well." }, { en: "Down smash paralyzes opponents and sets up aerials and other finishing moves." }, { en: "Her recovery is very long-ranged, with Flip Jump and two tether options." }],
      weaknesses: [{ en: "Her light weight makes her easier to KO than much of the cast." }, { en: "Her grounded attacks generally lack strong KO power." }, { en: "Her tether grab leaves her highly vulnerable if it misses, and her out-of-shield game is limited." }, { en: "Her unusually high short hop makes approaching with aerials awkward." }],
    },
  },
  melee: {
    "donkey-kong": {
      source: { title: "SmashWiki: Donkey Kong (SSBM)", url: "https://www.ssbwiki.com/Donkey_Kong_(SSBM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Donkey Kong is a heavyweight with surprisingly high speed for his power. He combos well using fast tilts, low-lag aerials and throws, especially the forward throw that lets him carry opponents around the stage. He backs this up with far-reaching smash attacks and strong aerial finishers, but he is easy to combo and simple to edgeguard.",
      },
      traits: [],
      strengths: [{ en: "An incredible combo game built on fast tilts and low-lag neutral, up and back aerials." }, { en: "His throws start combos, and the forward throw lets him carry opponents or stage spike them." }, { en: "All of his smash attacks reach far and are powerful enough to KO." }, { en: "Giant Punch can be one of the most powerful attacks in the game if it lands." }],
      weaknesses: [{ en: "His recovery is below average; Spinning Kong gains little height, so meteor smashes hurt him badly." }, { en: "He is large, heavy and fast-falling, so he is easy to chain throw and combo." }, { en: "His small shield leaves him vulnerable to shield stabbing." }, { en: "He has no projectile and a below-average grab range." }],
    },
    "dr-mario": {
      source: { title: "SmashWiki: Dr. Mario (SSBM)", url: "https://www.ssbwiki.com/Dr._Mario_(SSBM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Dr. Mario is essentially a stronger version of Mario, with the same dashing and falling speed but attacks that deal more damage and knockback. He uses Megavitamins to control the stage and start combos, approaches well through the air, and has several reliable finishers. He needs to stay on stage and keep opponents within arm's reach.",
      },
      traits: [],
      strengths: [{ en: "Megavitamins deal high damage and hitstun and form a defensive wall that deters approaches." }, { en: "Reliable finishers: a fast forward smash, a powerful forward aerial and a strong back throw." }, { en: "A good SHFFL thanks to a low short hop and low-lag aerials." }, { en: "Great edgeguarding, with back aerial and neutral aerial as strong options." }],
      weaknesses: [{ en: "His recovery is one of the worst in the game: predictable and short." }, { en: "The sweetspots on most of his attacks are short-ranged." }, { en: "His forward smash has among the worst reach of any, and his up smash is also short." }],
    },
    "yoshi": {
      source: { title: "SmashWiki: Yoshi (SSBM)", url: "https://www.ssbwiki.com/Yoshi_(SSBM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Yoshi is an unorthodox heavyweight with remarkable mobility, great survivability and an amazing air game. He cancels his armored midair jump into fast aerials for combos, shield pressure and counterattacks, and spaces with Egg Throw. He gives up options every other character has, so he must win the neutral game, and he is very hard to learn.",
      },
      traits: [],
      strengths: [{ en: "Double jump canceling lets him use fast, powerful aerials in rapid succession." }, { en: "His weight and the armor on his midair jump give him great survivability." }, { en: "Egg Throw is one of the most flexible projectiles in the game." }, { en: "Down smash is fast, hits on both sides and is one of the best in the game." }],
      weaknesses: [{ en: "He has no up special recovery, so an interrupted midair jump often costs him the stock." }, { en: "He cannot jump out of shield, and his rolls are among the worst in the game." }, { en: "He has arguably the worst grab in the game." }, { en: "He is very easy to combo or chain grab and has extreme difficulty dealing with pressure." }],
    },
    "young-link": {
      source: { title: "SmashWiki: Young Link (SSBM)", url: "https://www.ssbwiki.com/Young_Link_(SSBM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Young Link is a lighter, weaker and faster form of Link who relies on range and mobility. He attacks from a distance with bombs, boomerangs and Fire Arrows that start combos, and approaches well through the air with fast, low-lag aerials. With precise play, his projectiles, approach options and mobility are quite deadly.",
      },
      traits: [],
      strengths: [{ en: "His range and number of ranged attacks are among the highest in the game." }, { en: "His projectiles deal surprising damage and hitstun, and they start combos." }, { en: "An excellent SHFFL and high air speed give him a very good aerial approach." }, { en: "Recovery tools include a high third jump, boomerang glide, wall grapple and wall jump." }],
      weaknesses: [{ en: "He struggles to land his finishers and KO efficiently." }, { en: "Opponents can use DI to avoid the final hits of his forward smash and up smash." }, { en: "His light weight makes him considerably easier to KO." }],
    },
    "zelda": {
      source: { title: "SmashWiki: Zelda (SSBM)", url: "https://www.ssbwiki.com/Zelda_(SSBM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Zelda is an unusual character with powerful finishers, average weight and low mobility who plays a defensive game. She waits for openings to land grabs, dash attacks or Lightning Kicks, baiting opponents into mistakes rather than approaching. She needs precision to land her finishing moves, and should use wavedashing and platforms to make up for her slow movement.",
      },
      traits: [],
      strengths: [{ en: "Great KO power: her forward and back aerial Lightning Kicks can KO very early." }, { en: "Her down smash is the fastest in the game." }, { en: "A good grab game: up throw and down throw lead into follow-ups." }, { en: "Many of her attacks have transcendent priority, so they can stop others' attacks." }],
      weaknesses: [{ en: "One of the worst approach games in the game, with the slowest dashing speed." }, { en: "Many of her finishers are hard to land; the Lightning Kicks must be sweetspotted." }, { en: "Din's Fire is too laggy, weak and predictable to be an effective projectile." }, { en: "Her special moves are generally situational." }],
    },
  },
  pplus: {
    "captain-falcon": {
      source: { title: "SmashWiki: Captain Falcon (PM)", url: "https://www.ssbwiki.com/Captain_Falcon_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Captain Falcon plays as his Melee self with a few improvements: a fast, powerful character built around efficient combos that end with the Knee Smash. He easily overwhelms and combos semi-floaty characters. He is a glass cannon, because his high falling speed hurts his already poor recovery and leaves him open to combos and gimps.",
      },
      traits: [],
      strengths: [{ en: "He has speed, power and efficient combos." }, { en: "The Knee Smash is his main finisher and is easy to sweetspot." }, { en: "He easily overwhelms and combos semi-floaty characters." }, { en: "His sidestep is in line with everyone else's, so he is less susceptible to pressure." }],
      weaknesses: [{ en: "His recovery is poor, and his high falling speed makes it worse." }, { en: "His high falling speed makes him susceptible to combos and gimps." }],
    },
    "diddy-kong": {
      source: { title: "SmashWiki: Diddy Kong (PM)", url: "https://www.ssbwiki.com/Diddy_Kong_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Diddy Kong is a quick, unwieldy fighter who racks up damage fast, combos well and builds setups around his banana peels. The peels trip opponents, which helps him approach, harass and extend combos. He lacks quick, reliable finishers, so gimping opponents with Monkey Flip, dash attack and down air is almost a necessity.",
      },
      traits: [],
      strengths: [{ en: "Banana peels trip opponents and are fantastic for approaching, setting traps and extending combos." }, { en: "His aerials, tilts and up smash are solid for comboing." }, { en: "He is adept at gimping with Monkey Flip, dash attack and down air." }, { en: "He has a very deep and distinct item toolkit for outwitting opponents." }],
      weaknesses: [{ en: "He lacks ways to finish opponents quickly and reliably, so they survive much longer." }, { en: "His recovery options are somewhat limited." }, { en: "Rocketbarrel Boost flies in a mostly straight line, so some characters disrupt it easily." }],
    },
    "falco": {
      source: { title: "SmashWiki: Falco (PM)", url: "https://www.ssbwiki.com/Falco_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Falco has an above-average on-stage game built on a powerful and formidable combo game. Most of his weaknesses are about survival: he is among the lightest characters in the game, and his recovery is one of the worst. He remains a significant threat to most of the roster.",
      },
      traits: [],
      strengths: [{ en: "He has a powerful and formidable combo game." }, { en: "His on-stage game is above average." }],
      weaknesses: [{ en: "He is among the lightest characters in the game, so he is easy to knock off stage horizontally." }, { en: "His recovery is one of the worst in the game, with low air speed and very fast falling." }, { en: "Fire Bird and Falco Phantasm do not provide enough distance." }],
    },
    "fox": {
      source: { title: "SmashWiki: Fox (PM)", url: "https://www.ssbwiki.com/Fox_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Fox plays much like he does in Melee: a character with incredible mobility, disjointed hitboxes, deadly combos and good options on both offense and defense. Most of his moves are built for comboing, with aerials and tilts that have almost no lag, and his blaster can camp out opponents who refuse to approach. He is very light and easy to edge guard.",
      },
      traits: [],
      strengths: [{ en: "He has incredible mobility and heavily disjointed hitboxes." }, { en: "His aerials and tilts are largely lag free and great for hitting opponents repeatedly." }, { en: "Up smash reliably KOs at reasonable percentages." }, { en: "Up throw sets up up aerial, back aerial or a tech chase." }],
      weaknesses: [{ en: "The highest falling speed and gravity in the game make him very susceptible to combos and chain grabs." }, { en: "His extremely low weight makes him very easy to KO horizontally." }, { en: "Fire Fox and Fox Illusion travel in straight lines, so he is easy to edge guard or gimp." }],
    },
    "ganondorf": {
      source: { title: "SmashWiki: Ganondorf (PM)", url: "https://www.ssbwiki.com/Ganondorf_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ganondorf is a slower, stronger and heavier version of Captain Falcon with more reach. He is one of the strongest characters: his attacks launch very hard, his short combos pile up damage quickly, and many of his aerials are excellent for killing and edgeguarding. He is slow on foot, easily comboed and normally has trouble recovering.",
      },
      traits: [],
      strengths: [{ en: "His attacks deal dangerously high knockback, and some KO at relatively low percentages." }, { en: "His down aerial is the most powerful meteor smash, and aerial Wizard's Foot is a strong spike." }, { en: "Dead Man's Volley & Drift reflects projectiles at double speed and helps him recover." }, { en: "Aerial Wizard's Foot restores his midair jump, greatly lengthening his horizontal recovery." }],
      weaknesses: [{ en: "He is large, tall and heavy with high gravity, so he is easily comboed." }, { en: "One of the slowest dashing speeds makes it hard to catch opponents on foot." }, { en: "His recovery is mostly linear and somewhat predictable, and Dark Dive is easy to edgeguard." }, { en: "He often still has trouble against characters with a strong projectile game." }],
    },
    "ice-climbers": {
      source: { title: "SmashWiki: Ice Climbers (PM)", url: "https://www.ssbwiki.com/Ice_Climbers_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "The Ice Climbers are a duo, Popo and Nana, in which the partner copies the player's movements and attacks. While both are alive, the partner's copied attacks can double their damage, so together they deal substantial amounts. Many of their attacks are much better with both present, so losing one limits the player's options.",
      },
      traits: [],
      strengths: [{ en: "The partner copies each attack with the same damage, effectively doubling damage when both hit." }, { en: "They are capable of dealing substantial amounts of damage." }],
      weaknesses: [{ en: "When one climber is KO'd, the player's options are limited." }, { en: "With the partner gone, recovery is poor: Belay gains only a small fraction of its normal height." }, { en: "Squall Hammer travels a fair distance, but its hitbox does not make up for edgehoggers." }],
    },
    "ivysaur": {
      source: { title: "SmashWiki: Ivysaur (PM)", url: "https://www.ssbwiki.com/Ivysaur_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ivysaur is a mid-range zoning and anti-air character that fights with self-healing moves and status effects. It heals with Synthesis to force opponents to approach, charges a one-time SolarBeam, and combos or walls out anyone coming in through the air. It is at its best when it keeps foes at mid-range or in the air.",
      },
      traits: [],
      strengths: [{ en: "Synthesis heals it and charges SolarBeam, giving it a completely unique way to camp." }, { en: "Its up-smash is the most powerful in the game." }, { en: "Opponents approaching from the air risk being comboed or pushed offstage." }, { en: "SolarBeam is a long-ranged finishing blow that also works as a zoning threat." }],
      weaknesses: [{ en: "Its moves all have some startup, which close-range fighters can take advantage of." }, { en: "Razor Leaf and Seed Bomb are not enough to reach ranged fighters." }, { en: "It is a lightweight, which hurts its survivability." }, { en: "Its grab is laggy and short, and it can be knocked out of Vine Whip." }],
    },
    "jigglypuff": {
      source: { title: "SmashWiki: Jigglypuff (PM)", url: "https://www.ssbwiki.com/Jigglypuff_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Jigglypuff plays almost exactly as it does in Melee, drifting around opponents and moving into their space, and it is not technically demanding. Many opponents have disjointed attacks, projectiles and KO confirms that make this much harder and riskier. Small, cramped stages and low ceilings also work against its survivability.",
      },
      traits: [],
      strengths: [{ en: "It is not a technically demanding character." }],
      weaknesses: [{ en: "Opponents' disjoints, projectiles and KO confirms make drifting around them harder and riskier." }, { en: "Small, cramped stages are a huge detriment to its survivability." }],
    },
    "kirby": {
      source: { title: "SmashWiki: Kirby (PM)", url: "https://www.ssbwiki.com/Kirby_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Kirby is a small, lightweight close-range fighter with quick attacks and up to six jumps. He combos up close, spaces with down tilt and forward tilt, and uses his many jumps to edgeguard opponents far offstage and still get back. He is difficult to combo but easy to KO, and his limited approach leaves him open to camping.",
      },
      traits: [],
      strengths: [{ en: "Six jumps and some of the fastest aerials in the game make his edgeguarding especially dangerous." }, { en: "His small size and very low crouch make him hard to hit or grab." }, { en: "Down tilt and forward tilt push opponents away and are safe on shield." }, { en: "Down throw leads to a tech-chase on most characters, and back throw sets up edgeguards." }],
      weaknesses: [{ en: "Poor dash speed, limited approach options and no proper projectile leave him open to camping." }, { en: "He lacks reliable finishers and can rely too much on gimping." }, { en: "Characters with strong recoveries are difficult for him to take stocks from." }, { en: "He is light, so he is easy to KO once a hit lands." }],
    },
    "knuckles": {
      source: { title: "SmashWiki: Knuckles (P+)", url: "https://www.ssbwiki.com/Knuckles_(P%2B)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Knuckles fights mostly with punches, including a forward smash with an explosive sweetspot and meteor smashes on his down aerial and the late hit of his forward aerial. He can dig underground to become totally invincible and get around projectiles, and in the air he can glide, cling to walls and climb them.",
      },
      traits: [],
      strengths: [{ en: "Dig makes him totally invincible underground and gets him around projectiles." }, { en: "His glide cancels directly into aerials, and he can cling to and climb walls." }, { en: "Down aerial and the late hit of forward aerial are meteor smashes." }, { en: "The spring from Spring Jump launches upwards, giving it good combo potential." }],
      weaknesses: [{ en: "Spring Jump goes lower than Sonic's, so it is weaker for recovery and juggling." }, { en: "Spin Charge is slower than Sonic's and can only be used once per airtime." }, { en: "Only the first Spring Jump per airtime can be acted out of; after that he is helpless." }],
    },
    "link": {
      source: { title: "SmashWiki: Link (PM)", url: "https://www.ssbwiki.com/Link_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Link is a well-ranged heavyweight with three projectiles and long disjointed sword attacks. He zones opponents out, heckles them from far away and starts combos from a distance before moving in, using Bombs and Boomerangs to create openings. His Hylian Shield and Spin Attack also give him a stellar defensive game.",
      },
      traits: [],
      strengths: [{ en: "Three projectiles and long sword reach let him control the fight from a distance." }, { en: "Spin Attack is one of the most potent out of shield options in the game." }, { en: "His smash attacks are fast and among the most powerful." }, { en: "A fast grab, with up and down throws that start combos." }],
      weaknesses: [{ en: "Large size, heavy weight and fairly high gravity make him vulnerable to combos." }, { en: "His up and down aerials have long ending lag." }, { en: "His recovery does not give much distance, and attacks with good horizontal reach can edgeguard it." }, { en: "His bomb recovery damages him." }],
    },
    "lucario": {
      source: { title: "SmashWiki: Lucario (PM)", url: "https://www.ssbwiki.com/Lucario_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucario is a close-range combo character built on mechanics from traditional fighting games. Its magic series lets it cancel attacks into later ones in a set order, and landing hits builds aura charges that it spends to power up special moves. If it can get close, it deals massive damage over extended combos.",
      },
      traits: [],
      strengths: [{ en: "Attacks cancel into each other in a set chain, which suits extensive combos." }, { en: "Aura charges power up Aura Sphere and Force Palm, or make ExtremeSpeed and Double Team cancellable." }, { en: "Stored aura is kept even after losing a stock." }, { en: "Neutral aerial starts quickly and can KO at reasonably low percentages." }],
      weaknesses: [{ en: "Average movement speed outside of its combos." }, { en: "Struggles to approach, as Aura Sphere is short-ranged and easily intercepted." }, { en: "Lacks power, so it needs more damage than other characters to secure a KO." }, { en: "Has trouble with faster close-range fighters and with disjointed reach that keeps it out." }],
    },
    "luigi": {
      source: { title: "SmashWiki: Luigi (PM)", url: "https://www.ssbwiki.com/Luigi_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Luigi is a middleweight with fast, powerful aerials, rapid approach methods and spontaneous power. He has the longest wavedash in the game, which lets him slide in and immediately put out one of his deadly smash attacks. He spaces opponents out with Fireballs and has a very potent combo game, especially in the air.",
      },
      traits: [],
      strengths: [{ en: "The longest wavedash in the game, which pairs well with his smash attacks." }, { en: "Fast and powerful aerials with a very potent combo game in the air." }, { en: "Fireballs let him space opponents out." }],
      weaknesses: [{ en: "Very low traction and low ground speed." }, { en: "Low aerial and falling speeds can hinder his aerials." }, { en: "His recovery is fairly predictable and easy to edge hog." }, { en: "His floatiness makes him among the easiest characters to KO vertically." }],
    },
    "marth": {
      source: { title: "SmashWiki: Marth (PM)", url: "https://www.ssbwiki.com/Marth_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Marth plays mostly as he does in Melee, with a few buffs such as a slightly improved recovery, a more reliable up smash and less lag on his down aerial. He relies on the disjointed range of his sword, fantastic spacing tools and great edgeguarding. He remains a strong pick for competitive play.",
      },
      traits: [],
      strengths: [{ en: "His sword gives him disjointed range." }, { en: "Fantastic spacing tools." }, { en: "Great edgeguarding capabilities." }],
      weaknesses: [{ en: "Poor horizontal recovery." }, { en: "Difficulty landing safely." }, { en: "No projectile or lingering hitboxes." }, { en: "Struggles to KO on large stages such as Delfino Secret." }],
    },
    "ness": {
      source: { title: "SmashWiki: Ness (PM)", url: "https://www.ssbwiki.com/Ness_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ness is a flexible character who suits both aggressive and zoning playstyles. His aerials lead into each other well, and double jump cancelling lets him use several in quick succession close to the ground, giving him a strong combo game once the opponent is in the air. PK Fire lets him control space and stop reckless approaches.",
      },
      traits: [],
      strengths: [{ en: "Aerials lead into each other well, helped by double jump cancelling." }, { en: "PK Fire controls space and prevents opponents from approaching recklessly." }, { en: "Down aerial is a powerful, quick meteor smash that is effective for edgeguarding." }, { en: "Back throw is a very reliable KO move at higher percents." }],
      weaknesses: [{ en: "His recovery is long but can be intercepted before and after it starts." }, { en: "Floaty falling speed makes him vulnerable to many vertical finishers." }, { en: "Very short grab range." }, { en: "Limited options against pressure, so fast, aggressive characters give him trouble." }],
    },
    "olimar": {
      source: { title: "SmashWiki: Olimar (PM)", url: "https://www.ssbwiki.com/Olimar_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Olimar is reworked to suit Project M's more offensive gameplay, rather than the defensive camping with Pikmin he excelled at in Brawl. His Pikmin are stronger and tougher, and their strength depends on the type of flower on their heads. His tilts, smash attacks and throws hit harder, and Ionium Jet gives him a more useful recovery.",
      },
      traits: [],
      strengths: [{ en: "Pikmin are stronger and have more endurance than before." }, { en: "More powerful tilts, smash attacks and throws." }, { en: "Up and down aerials are potential KO moves." }, { en: "Ionium Jet is a more useful recovery than Pikmin Chain." }],
      weaknesses: [{ en: "He is still fairly light, so he is KOed earlier than other characters." }],
    },
    "peach": {
      source: { title: "SmashWiki: Peach (PM)", url: "https://www.ssbwiki.com/Peach_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Peach is a methodical fighter with several intimidating tricks. Her float lets her use her fast, powerful aerials while approaching or falling back, and lets her go for very deep edgeguards that most characters cannot. Her vegetables deal heavy damage, edgeguard or cover her approach, and she often has to go for gimps to take stocks.",
      },
      traits: [],
      strengths: [{ en: "Down smash has long reach and duration, high damage and knockback, and low lag." }, { en: "Float lets her use fast, powerful aerials and edgeguard very deep." }, { en: "Vegetables deal heavy damage, edgeguard and cover her approach." }, { en: "Jab, dash attack and throws are great combo starters." }],
      weaknesses: [{ en: "Slow dash speed and one of the shortest wavedashes in the game." }, { en: "Few reliable kill moves besides down smash and forward air." }, { en: "Low falling speed means she dies off the top blast line easily." }],
    },
    "pikachu": {
      source: { title: "SmashWiki: Pikachu (PM)", url: "https://www.ssbwiki.com/Pikachu_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pikachu is mostly its Melee version, with a few techniques and moves kept from Brawl and Smash 64. It was strengthened overall, gaining favorable attributes from Brawl while keeping others from Melee, which gives it more leverage against the strongest characters.",
      },
      traits: [],
      strengths: [{ en: "Keeps its powerful up smash from Melee." }, { en: "Keeps its crawl and wall jump from Brawl." }],
      weaknesses: [],
    },
    "pit": {
      source: { title: "SmashWiki: Pit (PM)", url: "https://www.ssbwiki.com/Pit_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pit is a versatile, very maneuverable fighter with a fast, long dash dance, multiple double jumps, steerable arrows and a slightly disjointed bow that splits into two blades. He has an impressive neutral game and potent edge guarding, but struggles to find kills and relies on DI mixups and reading the opponent's habits.",
      },
      traits: [],
      strengths: [{ en: "Very maneuverable, with a fast and long dash dance and multiple double jumps." }, { en: "His arrows can be steered, giving him a strong projectile." }, { en: "A long recovery and potent edge guarding." }, { en: "Up air combos are devastating on airborne opponents or those at moderate percent." }],
      weaknesses: [{ en: "Lacks kill power and struggles to combo into his few kill moves." }, { en: "Low weight, poor tech rolls and a long jump squat." }, { en: "His recovery can be gimped if he is hit out of Wings of Icarus." }, { en: "Weak combo game at low percents against heavies and space animals." }],
    },
    "rob": {
      source: { title: "SmashWiki: R.O.B. (PM)", url: "https://www.ssbwiki.com/R.O.B._(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "R.O.B. is a heavy character built around long juggles into aerial followups and deep offstage edge-guarding. He has more success going for low-percentage edge guards off stage than brawling on stage. His heavy weight and flexible Robo-Booster recovery make him durable, which somewhat makes up for his difficulty winning neutral.",
      },
      traits: [],
      strengths: [{ en: "Offstage edge guarding is very strong against linear or slow recoveries." }, { en: "Heavy weight makes him durable and lets him crouch cancel very effectively." }, { en: "Up throw and down throw have chaingrab opportunities on many characters." }, { en: "Anti-air tools do well against fast fallers and characters who approach from above." }],
      weaknesses: [{ en: "Has difficulty winning neutral, and his slow movement hurts when he is forced to approach." }, { en: "Does poorly against characters with multiple jumps or who outmaneuver him in the air." }, { en: "Lack of options out of shield leaves him vulnerable under shield pressure." }, { en: "His boosts only return on landing, so one successful edgeguard can stop him recovering." }],
    },
    "samus": {
      source: { title: "SmashWiki: Samus (PM)", url: "https://www.ssbwiki.com/Samus_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Samus is a heavy fighter who is unusually floaty for her weight. She fights with a unique array of powerful projectiles: Charge Shot beams, missiles and bombs. Her side taunt switches her between fire and ice, which changes the element of her forward smash, forward air, up smash, down tilt and missiles.",
      },
      traits: [],
      strengths: [{ en: "A unique array of powerful projectiles: Charge Shot, missiles and bombs." }, { en: "Her side taunt switches her attacks between fire and ice elements." }, { en: "Her aerials generally have little to no ending lag." }, { en: "Bomb recovery and her grappling beam tether can improve her recovery." }],
      weaknesses: [{ en: "Very slow falling speed gives her the worst vertical endurance of the heavyweights." }, { en: "She is easily juggled." }, { en: "Screw Attack offers very little horizontal and vertical distance." }, { en: "Low air and falling speed give her a below average aerial approach." }],
    },
    "sheik": {
      source: { title: "SmashWiki: Sheik (PM)", url: "https://www.ssbwiki.com/Sheik_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sheik is a lightweight fastfaller with quick but weak attacks made for comboing. Her attacks are among the fastest in the game, with very little lag, and her very fast ground movement lets her chase opponents down easily. Her Needles are a great projectile that lets her camp very well.",
      },
      traits: [],
      strengths: [{ en: "Among the fastest frame data in the game, especially on her tilts." }, { en: "Needles are a great projectile that lets her camp very well." }, { en: "Very fast ground movement." }, { en: "Fast falling speed gives her excellent vertical endurance despite her light weight." }],
      weaknesses: [{ en: "One of the easiest characters to KO horizontally, with a poor recovery move in Vanish." }, { en: "Very easy to combo." }, { en: "Has significant trouble KOing, with only three noteworthy KO moves." }, { en: "Her very high short hop limits how many aerials she can use in one." }],
    },
    "snake": {
      source: { title: "SmashWiki: Snake (PM)", url: "https://www.ssbwiki.com/Snake_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Snake is a fairly tall, heavy character with a wide array of projectiles and explosives. He excels at high-damage combos, setting traps, juggling airborne opponents and KOing off the top, and he survives and recovers from very long distances. He lacks reliable ways to approach, but C4 attached to an opponent lets him break a stalemate at any range.",
      },
      traits: [],
      strengths: [{ en: "Many normal attacks start quickly and have powerful hitboxes that lead into each other." }, { en: "Strong defensive tools: long grab range, quick moves out of shield and a strong crouch cancel." }, { en: "Survives and recovers from incredibly long distances." }, { en: "C4 can be placed on an opponent, then detonated or faked to limit their options." }],
      weaknesses: [{ en: "No reliable tools to approach opponents with." }, { en: "Struggles against characters who are faster, have longer range or can out-camp his projectiles." }, { en: "He is easily comboed if the opponent lands a clean hit." }, { en: "His recovery is fairly predictable and often costs him damage from C4 or grenades." }],
    },
    "sonic": {
      source: { title: "SmashWiki: Sonic (PM)", url: "https://www.ssbwiki.com/Sonic_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sonic is the fastest character in the game, with the fastest dash speed and a fast air speed. He uses extremely fast and tricky movement to open opponents up, rack up damage and carry combos across the stage. His short range and lack of projectiles mean he has to come close rather than harass from afar.",
      },
      traits: [],
      strengths: [{ en: "The fastest dash speed in the game and a fast air speed." }, { en: "A great combo game and good edgeguards." }, { en: "One of the best recoveries in the game, with all four special moves able to help." }],
      weaknesses: [{ en: "Poor range on most moves and no projectiles." }, { en: "Poor hitbox placements." }, { en: "Light with only an average falling speed, so he is very easy to KO at lower percents." }, { en: "Very susceptible to juggles." }],
    },
    "squirtle": {
      source: { title: "SmashWiki: Squirtle (PM)", url: "https://www.ssbwiki.com/Squirtle_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Squirtle's kit puts a strong emphasis on movement. It out-maneuvers most opponents and plays evasively while looking for an opening, then launches into fast-paced combos that carry opponents to the side blastzones or kill off the top. Fast burst movement and low friction on the ground let it chase escaping opponents, even offstage.",
      },
      traits: [],
      strengths: [{ en: "Out-maneuvers most opponents with fast burst movement options such as shellshift." }, { en: "Fast-paced combos carry opponents to the side blastzones or kill off the top." }, { en: "Its up-special gimps opponents and returns to stage from practically anywhere." }, { en: "A powerful up smash." }],
      weaknesses: [{ en: "Generally unimpressive range on attacks and grab." }, { en: "Light weight." }],
    },
    "toon-link": {
      source: { title: "SmashWiki: Toon Link (PM)", url: "https://www.ssbwiki.com/Toon_Link_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Toon Link is a light, fast swordfighter with strong camping tools. He relies on his bombs, fiery arrows and boomerang to soften opponents up from any range, then uses his fast movement and attacking speed to overwhelm them. He has to finish foes quickly and accurately up close, because his predictable recovery and light weight make him easy to KO.",
      },
      traits: [],
      strengths: [{ en: "Bombs, arrows and boomerang give him coverage options for foes at any range." }, { en: "Approaching him is a difficult task." }, { en: "His sword moves and projectiles together give him a fierce edgeguarding game." }, { en: "Fast movement and attacking speed." }],
      weaknesses: [{ en: "His aerial up-special lacks the recovery capabilities it used to have." }, { en: "Light weight means he can be KOed in just a few hits." }, { en: "Getting back on stage is slow and easy for edgeguarding opponents to predict." }],
    },
    "wario": {
      source: { title: "SmashWiki: Wario (PM)", url: "https://www.ssbwiki.com/Wario_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Wario is a very heavy but very mobile character. He has incredible aerial mobility and the notorious kill move Wario Waft. Chomp, combined with his aerial mobility, gives him one of the best grabs in the game, and his high weight makes it harder to knock him off the stage.",
      },
      traits: [],
      strengths: [{ en: "Incredible aerial mobility." }, { en: "Wario Waft is a notorious kill move." }, { en: "Chomp and his aerial mobility give him one of the best grabs in the game." }, { en: "High weight makes it more difficult to knock him off the stage." }],
      weaknesses: [{ en: "Lacks a strong recovery." }, { en: "No projectile or significant disjoint, so characters with those traits are somewhat difficult for him." }],
    },
    "yoshi": {
      source: { title: "SmashWiki: Yoshi (PM)", url: "https://www.ssbwiki.com/Yoshi_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Yoshi is a heavy yet very mobile fighter with many great offensive and defensive options, a solid combo game and a versatile projectile. His egg shield cannot be shield stabbed and lets him parry, and his armored, delayed midair jump allows double jump canceling and rising aerials. He relies heavily on that jump for many maneuvers on stage.",
      },
      traits: [],
      strengths: [{ en: "His shield cannot be shield stabbed and lets him parry and counter instantly." }, { en: "His midair jump has armor and enables double jump canceling." }, { en: "Many attacks use his long tail, giving them great reach." }, { en: "Egg Throw has great range and is a great edge guarding or comboing tool." }],
      weaknesses: [{ en: "No recovery special move, so he is very easy to gimp once his jump is gone." }, { en: "He does not get his double jump back after being put into hitstun." }, { en: "Among the weakest of the heavyweights, with few finishers." }],
    },
    "zero-suit-samus": {
      source: { title: "SmashWiki: Zero Suit Samus (PM)", url: "https://www.ssbwiki.com/Zero_Suit_Samus_(PM)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Zero Suit Samus is a powerful character with great movement: a high top speed, a large dash dance and very high horizontal air acceleration, giving her strong mixups when jumping in. Her back air, down smash and up tilt create a wall that is tough to get in on, and her flipping down B adds flexible movement and recovery.",
      },
      traits: [],
      strengths: [{ en: "Great movement on the ground and in the air." }, { en: "Large, safe back air, huge down smash and extremely quick up tilt wall opponents out." }, { en: "Down B is a flexible jump with a strong dive kick for edgeguarding and ending combos." }, { en: "Can easily make it back from nearly any position off stage." }],
      weaknesses: [{ en: "Being so tall, she finds it difficult to hit short crouching opponents." }, { en: "Short enough opponents duck under her blaster." }, { en: "Poor, slow descending options can give opponents extremely long juggles." }],
    },
  },
  smash4: {
    "bayonetta": {
      source: { title: "SmashWiki: Bayonetta (SSB4)", url: "https://www.ssbwiki.com/Bayonetta_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Bayonetta is a combo-heavy fighter with many multi-hitting attacks designed to link into each other. Her defining strength is her punishment game: combo starters launch opponents into the air, where her aerials, Witch Twist and After Burner Kick deal massive damage. Her approach is poor, so she depends on reading the opponent and exploiting their mistakes.",
      },
      traits: [],
      strengths: [{ en: "Her combos deal massive damage and can even take a stock from zero." }, { en: "Arguably the best and most flexible recovery in the game." }, { en: "Witch Time slows opponents, leaving them wide open to combos or a smash attack." }, { en: "Bat Within lets her escape situations that are impossible for other characters." }],
      weaknesses: [{ en: "Tall frame and light weight make her rather easy to combo and KO." }, { en: "Many grounded attacks are laggy and unsafe on shield, especially her smash attacks." }, { en: "Her approach is poor, linear and predictable." }, { en: "Using After Burner Kick and Witch Twist in the air adds landing lag." }],
    },
    "bowser": {
      source: { title: "SmashWiki: Bowser (SSB4)", url: "https://www.ssbwiki.com/Bowser_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Bowser is the heaviest character in the game and a surprisingly speedy powerhouse. He relies on a defensive, bait-and-punish playstyle, timing his attacks carefully and punishing opponents' mistakes with highly damaging moves, great range and a formidable grab game. His endurance makes him very difficult to KO without a strong attack.",
      },
      traits: [],
      strengths: [{ en: "Immense power, with highly damaging attacks and numerous KOing options." }, { en: "The heaviest character in the game, with the best horizontal endurance." }, { en: "His grabs have among the longest ranges in the game." }, { en: "Whirling Fortress is his fastest attack and a phenomenal out of shield option." }],
      weaknesses: [{ en: "All his aerials have heavy landing lag, making it very difficult to return to the ground." }, { en: "Vulnerable to combos and juggling, worsened by his large size." }, { en: "Slow rolls and sidestep leave Whirling Fortress as his only real answer to pressure." }, { en: "His recovery is among the slowest, so aggressive edgeguarding can KO him." }],
    },
    "bowser-jr": {
      source: { title: "SmashWiki: Bowser Jr. (SSB4)", url: "https://www.ssbwiki.com/Bowser_Jr._(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Bowser Jr. is a heavyweight powerhouse with decent mobility who suits a defensive bait-and-punish playstyle, but can also pressure and zone with Clown Kart Dash and Mechakoopa. Nearly all his attacks are disjointed, and his smash attacks are his go-to KO options. Hits on Bowser Jr. himself deal more damage than hits on the Clown Car.",
      },
      traits: [],
      strengths: [{ en: "Clown Kart Dash gives him quick movement, an excellent approach and a way into aerial combos." }, { en: "Mechakoopa is extremely useful for zoning, combos and blocking projectiles." }, { en: "His smash attacks all deal high knockback and damage." }, { en: "Abandon Ship! gives considerable vertical distance and does not leave him helpless." }],
      weaknesses: [{ en: "Extremely gimpable recovery, as even a weak hit can leave him without his Clown Car." }, { en: "Most attacks have high lag, and he has a poor out-of-shield game." }, { en: "His neutral game is predictable, relying on Mechakoopa and Clown Kart Dash." }, { en: "He is KO'd earlier than most heavyweights, because hits on him deal extra damage." }],
    },
    "captain-falcon": {
      source: { title: "SmashWiki: Captain Falcon (SSB4)", url: "https://www.ssbwiki.com/Captain_Falcon_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Captain Falcon is a tall heavyweight with excellent mobility, including the 2nd fastest dashing speed. Without a projectile, he uses his speed, dash grab and back aerial to get in, then racks up damage with combos from his down and forward throws and up aerial. He often has to rely on edgeguarding to score his kills.",
      },
      traits: [],
      strengths: [{ en: "Excellent mobility, with the 2nd fastest dashing speed and very high jumps." }, { en: "His combo ability is arguably his greatest strength." }, { en: "Excellent KO power, including Knee Smash and a powerful down aerial meteor smash." }, { en: "Formidable edgeguarding ability." }],
      weaknesses: [{ en: "His recovery is linear, short and easily intercepted." }, { en: "Most of his hard-hitting moves are difficult or slow to land." }, { en: "No projectile, which leaves him susceptible to camping." }, { en: "Vulnerable to combos, with no fast options to break them." }],
    },
    "charizard": {
      source: { title: "SmashWiki: Charizard (SSB4)", url: "https://www.ssbwiki.com/Charizard_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Charizard is a super heavyweight that works as an all-rounder for its weight class, with very high damage output and endurance, fast dashing speed and multiple double jumps. It needs patience and a balance of offense and defense. Reads and baits help it land its strongest punishes, particularly its smash attacks and sweetspotted back aerial.",
      },
      traits: [],
      strengths: [{ en: "KO potential is its greatest strength, with many KOing options on the ground and in the air." }, { en: "Up throw is the second strongest throw of any kind in the game." }, { en: "Flare Blitz and Fly are highly protective recovery options." }, { en: "Its wings and most of its tail cannot be hit." }],
      weaknesses: [{ en: "Lacks reliable landing options." }, { en: "Its attacks are not safe on shield, which limits its neutral game." }, { en: "Below-average frame data, with considerable lag on several of its best attacks." }, { en: "Its traction is the second lowest in the game and its rolls are among the slowest." }],
    },
    "cloud": {
      source: { title: "SmashWiki: Cloud (SSB4)", url: "https://www.ssbwiki.com/Cloud_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Cloud is a middleweight swordfighter with quick mobility and the second longest disjointed range in the game. He spaces opponents out, stops their approaches and punishes careless attacks, especially with his aerials. A full Limit Break boosts his movement and gives each special move a single-use power boost. He must avoid being thrown off the stage.",
      },
      traits: [],
      strengths: [{ en: "The Buster Sword gives his attacks the second longest disjointed range in the game." }, { en: "Quick ground and air mobility, which gets even better under Limit Break." }, { en: "Limit Break specials deal high knockback, and Finishing Touch KOs very early." }, { en: "His aerials cover wide areas, are fast and autocancel easily." }],
      weaknesses: [{ en: "Poor recovery, which makes him prone to edgeguarding and gimping." }, { en: "Very short grab range, and throws with almost no combo or KO potential." }, { en: "A linear, below-average approach." }, { en: "No reliable means of escaping pressure, so he is fairly easy to combo." }],
    },
    "corrin": {
      source: { title: "SmashWiki: Corrin (SSB4)", url: "https://www.ssbwiki.com/Corrin_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Corrin is a swordfighter with good disjointed range and quick startup on most moves. His fast tilts and aerials combo into each other for burst damage, and Dragon Fang Shot and Dragon Lunge help him keep opponents at a distance. His finishers need precise tipper spacing, so he keeps a good distance once opponents are at KO percentage.",
      },
      traits: [],
      strengths: [{ en: "Disjointed range is arguably his greatest strength." }, { en: "A dependable combo game that can start from nearly any aerial or tilt." }, { en: "Tippers on his smash attacks and Dragon Lunge give finishers immensely stronger knockback." }, { en: "The fastest dash to shield speed in the game, which aids his approach." }],
      weaknesses: [{ en: "Struggles when an opponent is close, since most moves are punishable at close range." }, { en: "Finishers deal much lower knockback without careful tipper positioning." }, { en: "A lacking grab game, with poor reach and throws that prevent follow-ups." }, { en: "Tall frame and moderate gravity make him susceptible to aerial combos and juggling." }],
    },
    "dark-pit": {
      source: { title: "SmashWiki: Dark Pit (SSB4)", url: "https://www.ssbwiki.com/Dark_Pit_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Dark Pit is almost identical to Pit, sharing his mobility, three double jumps and standard attacks, with only five attacks differing. He is a solid all-rounder who leans towards edgeguarding and recovery. His Silver Bow arrows are stronger but far less steerable than Pit's, and Electroshock Arm gives him a powerful finishing tool for hard punishes.",
      },
      traits: [],
      strengths: [{ en: "Electroshock Arm is a powerful KOing and edgeguarding tool, especially at the edges of a stage." }, { en: "Silver Bow arrows deal slightly more damage and knockback than Pit's." }, { en: "Forward tilt can lock floored opponents, starting combos at low percentages." }],
      weaknesses: [{ en: "Arrows only shift slightly up and down, so they are worse for gimping offstage opponents." }, { en: "Forward tilt does not KO easily, weakening his grounded KO ability." }, { en: "His neutral infinite's finisher has a smaller hitbox and is easier to escape." }, { en: "He shares Pit's inferior KO potential." }],
    },
    "diddy-kong": {
      source: { title: "SmashWiki: Diddy Kong (SSB4)", url: "https://www.ssbwiki.com/Diddy_Kong_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Diddy Kong is an agile middleweight with fast ground movement, quick attacks and limbs that stretch for surprising range. He builds damage through combos and controls the stage with Banana Peel and Peanut Popgun, then finishes with fast smash attacks. His damage per hit is below average, so he needs to extend his combos.",
      },
      traits: [],
      strengths: [{ en: "One of the best combo abilities in the game, built on quick, low-knockback moves." }, { en: "Banana Peel and his other special moves give excellent stage control." }, { en: "Smash attacks are fast and strong, with many set-ups into up smash." }, { en: "Fast walking, dashing and falling speed, with a wall cling and crawl." }],
      weaknesses: [{ en: "Below-average damage output overall." }, { en: "Vulnerable to combos because of his fast falling speed and high gravity, with no reliable combo breaker." }, { en: "Recovery is only average; Rocketbarrel Boost needs charging and any hit during it can be costly." }, { en: "Aerials are easy to punish on shield and rarely KO until very high percentages." }],
    },
    "donkey-kong": {
      source: { title: "SmashWiki: Donkey Kong (SSB4)", url: "https://www.ssbwiki.com/Donkey_Kong_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Donkey Kong is the second-heaviest character in the game, yet he has surprisingly good mobility and fast attack start-up for a super heavyweight. He approaches well, racks up damage and KOs quickly with long-reaching, powerful moves, and his grabs lead into cargo throws, including cargo up throw into up aerial for KOs.",
      },
      traits: [],
      strengths: [{ en: "Many reliable KO moves, including his smash attacks, aerials, back throw and Giant Punch." }, { en: "Excellent endurance, with the second-best vertical and horizontal endurance in the game." }, { en: "Long grab range and cargo throws that set up combos and KOs." }, { en: "Spinning Kong has super armor and gives a very long horizontal recovery." }],
      weaknesses: [{ en: "Large size and a small shield make him easy to hit, combo and juggle." }, { en: "Vertical recovery is almost nonexistent, so even weak meteor smashes are hard to survive." }, { en: "Moves have slow ending lag and are punishable without careful spacing." }, { en: "Slow rolls and edge options, and no good combo breaker." }],
    },
    "dr-mario": {
      source: { title: "SmashWiki: Dr. Mario (SSB4)", url: "https://www.ssbwiki.com/Dr._Mario_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Dr. Mario is a stronger but slower version of Mario: a middleweight whose attacks deal more damage while his walking, dashing, air speed and jumps are all lower. His fast attacks make him hard to punish and good at punishing, so he plays a bait-and-punish game at close range rather than balancing offense and defense.",
      },
      traits: [],
      strengths: [{ en: "Excellent frame data; his normal moves have the fifth fastest overall start-up in the game." }, { en: "Higher damage output than Mario, making him more efficient at KOing." }, { en: "Down tilt and down throw start reliable combos." }, { en: "His pummel is the most damaging in the game by default." }],
      weaknesses: [{ en: "Sub-par mobility on the ground and in the air." }, { en: "Predictable recovery with little vertical distance, leaving him very vulnerable to meteor smashes." }, { en: "Short range, which hurts against characters with long or disjointed attacks." }, { en: "KO potential is inconsistent; up smash only KOs reliably near the edge." }],
    },
    "duck-hunt": {
      source: { title: "SmashWiki: Duck Hunt (SSB4)", url: "https://www.ssbwiki.com/Duck_Hunt_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Duck Hunt are a dog-and-duck team of light middleweights with fairly average mobility. Their special moves, Trick Shot, Clay Shooting and Wild Gunman, are built for zoning, stage control and mindgames, and can also block opposing projectiles. They need to combine these projectiles with their useful air game to keep up a varied, pressuring offense.",
      },
      traits: [],
      strengths: [{ en: "Projectiles give strong zoning, stage control and edge-guarding." }, { en: "Trick Shot's can, the clay pigeon and the gunmen can block opposing projectiles." }, { en: "Strong air game; neutral aerial, back aerial and up aerial can KO." }, { en: "Up tilt starts combos and is their most consistent KO option." }],
      weaknesses: [{ en: "Poor KO potential because of low damage output and very low base knockback." }, { en: "Smash attacks are inconsistent; opponents can escape before the final hit." }, { en: "Mediocre recovery; Duck Jump is slow and unprotected." }, { en: "Heavy reliance on projectiles leaves them vulnerable to characters who can reflect them." }],
    },
    "falco": {
      source: { title: "SmashWiki: Falco (SSB4)", url: "https://www.ssbwiki.com/Falco_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Falco is a light character with polarized movement: the strongest jumping ability and fast falling, but slow dashing and below-average air speed. His moves come out quickly and combo well, and he has strong smash attacks, aerials and throws. His slow horizontal movement and short reach make it hard for him to approach and pressure.",
      },
      traits: [],
      strengths: [{ en: "Very fast moveset with a versatile combo game." }, { en: "Powerful smash attacks and aerials, with back aerial his strongest aerial." }, { en: "Strong grab game; down throw and up throw combo into aerials." }, { en: "Blaster pressures and gimps recoveries, and Reflector counters camping." }],
      weaknesses: [{ en: "Below-average neutral game; slow horizontal movement makes approaching difficult." }, { en: "Poor reach, with most sweetspots close to his body." }, { en: "Long but linear and predictable recovery that is fairly easy to gimp." }, { en: "Susceptible to combos, with below-average survivability from low weight and high gravity." }],
    },
    "fox": {
      source: { title: "SmashWiki: Fox (SSB4)", url: "https://www.ssbwiki.com/Fox_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Fox is a hit-and-run character with very fast ground movement, quick attacks and the fastest falling speed in the game, while being one of the lightest characters. He pressures and pokes with tilts, aerials and Blaster, builds damage through combos, and looks for a set-up or read into up smash, his most potent KO move.",
      },
      traits: [],
      strengths: [{ en: "Powerful neutral game from fast movement, quick attacks and Blaster." }, { en: "Strong combo game; all of his tilts and aerials can start combos." }, { en: "Up smash is fast and powerful, with set-ups from neutral aerial and down aerial." }, { en: "Up aerial and back aerial are quick, strong and auto-cancel in a short hop." }],
      weaknesses: [{ en: "Terrible endurance: he is light, has the highest gravity and is extremely susceptible to combos." }, { en: "Linear, predictable recovery; meteor smashes usually KO him." }, { en: "KO moves are predictable and hard to land without a read or set-up." }, { en: "Mediocre grab game with no reliable KO throw, and short reach on most moves." }],
    },
    "ganondorf": {
      source: { title: "SmashWiki: Ganondorf (SSB4)", url: "https://www.ssbwiki.com/Ganondorf_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ganondorf is the archetypal heavyweight: he gives up speed and mobility for power and endurance, and is the least mobile character in the game. He deals huge damage in a few hits and can KO with one well-placed attack, so he plays patiently, relying on reads, punishes and mindgames while staying on stage.",
      },
      traits: [],
      strengths: [{ en: "Raw power; almost his whole moveset can KO easily, and earlier still with rage." }, { en: "Among the best edgeguarding in the game; down aerial is the game's most powerful meteor smash." }, { en: "Several attacks deal huge shield damage or break shields outright." }, { en: "Heavy weight gives him respectable survivability." }],
      weaknesses: [{ en: "The least mobile character in the game, with poor approach options and no projectile." }, { en: "Slow attacks with high ending lag, short range and poorly placed hitboxes." }, { en: "One of the worst recoveries in the game: short, slow and easy to edgeguard." }, { en: "Very easy to combo and juggle, with poor out of shield options." }],
    },
    "greninja": {
      source: { title: "SmashWiki: Greninja (SSB4)", url: "https://www.ssbwiki.com/Greninja_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Greninja is a hit-and-run character with fast walking, dashing and air speed, the second highest jumps, and a wall jump and wall cling. It mixes speed with consistent KO power, building damage with quick attacks and combos and using Water Shuriken, Shadow Sneak and Substitute for set-ups and mindgames. Many of its moves have long ending lag, so openings must be kept small.",
      },
      traits: [],
      strengths: [{ en: "Fast mobility and relatively fast attacks give it a strong neutral game and damage-racking." }, { en: "Consistent KO power from up smash, forward aerial and up throw." }, { en: "Strong recovery; Hydro Pump covers a very long distance and can be angled." }, { en: "A fully charged Water Shuriken can trap opponents and lead into follow-ups." }],
      weaknesses: [{ en: "High ending lag on several aerials, smash attacks and special moves makes them easy to punish." }, { en: "Finishers are hard to land because of hitbox placement or slow start-up." }, { en: "No aerial is good at interrupting combos, and none auto-cancel in a short hop." }, { en: "Slow standing grab and one of the worst pummels in the game." }],
    },
    "ike": {
      source: { title: "SmashWiki: Ike (SSB4)", url: "https://www.ssbwiki.com/Ike_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ike is a heavyweight swordsman with below-average ground speed and low jumps, but a very long, disjointed reach. Unlike most heavyweights he approaches well, mainly with his aerials, and he plays by spacing and punishing, using short but damaging combos to build damage and set up KOs.",
      },
      traits: [],
      strengths: [{ en: "Very long, disjointed sword range." }, { en: "Neutral, forward and back aerials are good approach options that auto-cancel in a short hop." }, { en: "Short, damaging combos; up throw sets up KOs with forward aerial or up aerial." }, { en: "Smash attacks are among the strongest of their kinds, and his endurance is excellent." }],
      weaknesses: [{ en: "Vulnerable to combos and rushdown, with no quick, reliable way to break out." }, { en: "No projectile, which puts him at a disadvantage against camping." }, { en: "Predictable recovery; Aether is strictly vertical and Quick Draw strictly horizontal." }, { en: "Weak out of shield options, and a predictable grounded approach." }],
    },
    "jigglypuff": {
      source: { title: "SmashWiki: Jigglypuff (SSB4)", url: "https://www.ssbwiki.com/Jigglypuff_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Jigglypuff is a character of extremes: very mobile in the air with five midair jumps, but slow on the ground and the lightest character in the game. It fights mainly with its long-lasting aerials, edgeguards far off stage, and threatens Rest as a very early KO. It must play extremely cautiously because it is KO'd so easily.",
      },
      traits: [],
      strengths: [{ en: "Formidable air game; its aerials have long-lasting hitboxes and are hard to challenge." }, { en: "Fearsome edgeguarding, including the wall of pain from repeated forward aerials." }, { en: "Rest KOs very early and can be comboed into from forward aerial or up aerial." }, { en: "The second fastest air speed and the highest air acceleration in the game." }],
      weaknesses: [{ en: "The lowest endurance in the game; it can be KO'd extremely early." }, { en: "A shield break launches it to a KO unless a ceiling stops it." }, { en: "Problematic ground game with short range, slow movement and very short grab range." }, { en: "Its special moves are situational, and Rest is easy to punish afterwards." }],
    },
    "king-dedede": {
      source: { title: "SmashWiki: King Dedede (SSB4)", url: "https://www.ssbwiki.com/King_Dedede_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "King Dedede is the third heaviest character and an archetypal slow heavyweight with the slowest air speed. He has great endurance, four midair jumps and a hammer that gives disjointed range. His sluggish attacks, risky neutral game and poor approach push him towards a defensive style of zoning, baiting and punishing.",
      },
      traits: [],
      strengths: [{ en: "Impressive endurance, with the best vertical endurance in the game." }, { en: "Great recovery from four midair jumps and Super Dedede Jump, which has super armor." }, { en: "His hammer gives most of his moves long, disjointed range." }, { en: "Strong punishes; down throw combos into up tilt, up smash and most aerials." }],
      weaknesses: [{ en: "Frame data is among the worst in the game, so his moves are easy to punish." }, { en: "Very slow horizontal movement and a poor approach." }, { en: "Struggles against camping, and his Gordo can be reflected back by weak attacks." }, { en: "Vulnerable to combos and juggles, with a hard time escaping them." }],
    },
    "kirby": {
      source: { title: "SmashWiki: Kirby (SSB4)", url: "https://www.ssbwiki.com/Kirby_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Kirby is a small lightweight with six jumps and poor overall mobility. He is a simple character suitable for beginners, with fast attacks that combo well and strong smash attacks. He does impressive damage once he gets close, but getting close is hard, so he works well with a bait and punish playstyle.",
      },
      traits: [],
      strengths: [{ en: "Fast attacks with a potent combo game; up tilt combos into itself." }, { en: "Smash attacks are strong without being particularly slow." }, { en: "Effective grab game; forward throw starts long combos and up throw can KO." }, { en: "Inhale copies an opponent's neutral special, which can greatly improve his kit." }],
      weaknesses: [{ en: "Poor endurance; he is light, floaty and very vulnerable to juggling." }, { en: "Poor mobility makes it hard for him to approach and pressure." }, { en: "Mediocre range, and his strongest moves are his slowest." }, { en: "Long but very slow recovery that suffers against aggressive edge-guarding." }],
    },
    "link": {
      source: { title: "SmashWiki: Link (SSB4)", url: "https://www.ssbwiki.com/Link_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Link is a heavyweight with a sword that gives disjointed range and above-average strength, plus a Hylian Shield that blocks projectiles while he stands still or walks. He is very capable at spacing and camping with Hero's Bow, Gale Boomerang and Bombs, and he also has impressive power and a deceptively useful combo game.",
      },
      traits: [],
      strengths: [{ en: "Strong projectiles for spacing and pressure; Bomb is his most versatile weapon." }, { en: "Disjointed sword range with powerful forward tilt, smash attacks and Spin Attack." }, { en: "Clawshot has impressive range and helps his recovery, zoning and combos." }, { en: "Down throw has impressive combo potential and up throw can KO." }],
      weaknesses: [{ en: "Sub-par mobility, and a recovery that limits how far he can safely go offstage." }, { en: "Susceptible to combos from faster characters." }, { en: "His tether grab is quite slow and punishable when it misses." }, { en: "Lag on forward tilt, dash attack, forward aerial and down aerial hinders his KO potential." }],
    },
    "little-mac": {
      source: { title: "SmashWiki: Little Mac (SSB4)", url: "https://www.ssbwiki.com/Little_Mac_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Little Mac is a lightweight who is extremely strong on the ground and poor in the air. He has very fast ground movement, the fastest rolls and sidestep, and quick, powerful grounded attacks with super armor on his smash attacks. He plays like a boxer: holding the middle of the stage, reacting to small openings and staying out of the air.",
      },
      traits: [],
      strengths: [{ en: "Very fast, hard-to-interrupt ground attacks; his neutral attack is tied for fastest in the game." }, { en: "Outstanding KO power; his smash attacks are fast, strong and have super armor." }, { en: "Very fast walking and dashing, with the fastest rolls and sidestep in the game." }, { en: "A full Power Meter gives KO Uppercut, which KOs very early." }],
      weaknesses: [{ en: "Has the most difficulty recovering of any character; his recovery moves travel little and are easily gimped." }, { en: "Weak air game; his aerials have very short range and the lowest damage output in the game." }, { en: "Extremely susceptible to combos and juggling, with low endurance." }, { en: "Short grab range, and throws that are unreliable for KOs or combos." }],
    },
    "lucario": {
      source: { title: "SmashWiki: Lucario (SSB4)", url: "https://www.ssbwiki.com/Lucario_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucario is a middleweight with average mobility and a unique Aura mechanic: its attacks grow stronger as it takes damage and when it is behind on stocks. At low Aura it combos well but struggles to KO; at high Aura its moves become extremely powerful. This usually means a careful, methodical bait and punish playstyle.",
      },
      traits: [],
      strengths: [{ en: "At high Aura its attacks are incredibly powerful, and rage boosts them further." }, { en: "Aura Sphere is a strong projectile that grows in size and power with Aura." }, { en: "Extreme Speed covers extremely long distances at high damage, making it very hard to gimp." }, { en: "Strong grab game with the fastest pummel in the game and useful throws." }],
      weaknesses: [{ en: "With low Aura its powerful moves are too weak to KO." }, { en: "Its fastest moves are its weakest and its strongest moves are its slowest." }, { en: "Vulnerable to most combos, and strong hits can KO it before Aura builds up." }, { en: "Extreme Speed has very high landing lag and can overshoot the stage at high Aura." }],
    },
    "lucas": {
      source: { title: "SmashWiki: Lucas (SSB4)", url: "https://www.ssbwiki.com/Lucas_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucas is a middleweight with unimpressive movement speed but quick attacks and good range from disjointed hitboxes. He relies on a strong zoning game with PK Fire and his grab aerial, racks up damage through combos, and has one of the strongest sets of throws in the game. His approach is predictable.",
      },
      traits: [],
      strengths: [{ en: "His grab game is his greatest strength; up and back throws are powerful KO options." }, { en: "Down throw is a reliable combo starter and sets up a KO with up aerial." }, { en: "Smash attacks are disjointed and among the strongest in the game." }, { en: "Fast attacks and a strong zoning game with PK Fire and grab aerial." }],
      weaknesses: [{ en: "Sub-par mobility gives him a difficult time against fast characters." }, { en: "Predictable approach with a slow dash attack, and reliance on zoning tools that can be overcome." }, { en: "Can struggle to score KOs outside of edgeguarding; his smash attacks need good reads." }, { en: "His non-tether recovery can be gimped, reflected or absorbed." }],
    },
    "lucina": {
      source: { title: "SmashWiki: Lucina (SSB4)", url: "https://www.ssbwiki.com/Lucina_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucina is a clone of Marth with identical attributes, including the fastest walking speed in the game. Her sword deals the same damage along the whole blade instead of having a stronger tip, so she is a lower-risk, lower-reward version of Marth with a straightforward playstyle built on spacing, steady damage and consistent KO moves.",
      },
      traits: [],
      strengths: [{ en: "Consistent damage and KO potential without needing precise spacing." }, { en: "Good range, fast start-up and wide arcs on many moves." }, { en: "Strong edgeguarding with forward aerial, back aerial and down aerial." }, { en: "A low learning curve thanks to her straightforward playstyle." }],
      weaknesses: [{ en: "Without a tipper she cannot secure the early KOs that Marth can." }, { en: "Poor grab game; her throws deal low damage and have little utility." }, { en: "No projectile, so she struggles against projectile-oriented characters." }, { en: "Susceptible to combos, juggling and edgeguarding; Dolphin Slash is her only reliable recovery option." }],
    },
    "luigi": {
      source: { title: "SmashWiki: Luigi (SSB4)", url: "https://www.ssbwiki.com/Luigi_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Luigi is a floaty middleweight with slow overall mobility and the lowest traction in the game. His attacks have the fastest start-up in the game, making him very hard to punish, and his down throw leads into versatile, consistent combos. His slow movement makes approaching hard, so he relies on short-hopped aerials to approach or Fireball to force approaches.",
      },
      traits: [],
      strengths: [{ en: "The fastest start-up frame data in the game, excluding special moves." }, { en: "Down throw is his most useful move, with versatile and consistent combos." }, { en: "Smash attacks are fast, reliable finishers that are hard to punish on shield." }, { en: "Super Jump Punch's sweetspot has devastating power as a punish." }],
      weaknesses: [{ en: "Recovery is his biggest weakness; he relies on his double jump and is easily gimped." }, { en: "Slow mobility makes it hard to approach or keep up with faster opponents." }, { en: "Short range and no reflection move, so disjointed hitboxes and projectiles are hard to fight." }, { en: "Very low traction hinders his shield grab and his dash." }],
    },
    "mario": {
      source: { title: "SmashWiki: Mario (SSB4)", url: "https://www.ssbwiki.com/Mario_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mario has balanced attributes with high air speed and very quick attacks, and in practice he plays as a rushdown character. He shines at close range, applying constant pressure and racking up damage with some of the most reliable combos in the game. His low range means he must almost always fight up close.",
      },
      traits: [],
      strengths: [{ en: "Very quick attacks with low lag make him strong in close-quarters combat." }, { en: "Combo ability among the most reliable in the game, with down throw a notorious combo starter." }, { en: "Versatile edgeguarding with Cape, F.L.U.D.D. and fast aerials." }, { en: "Fast grabs, and a back throw that reliably KOs near the ledge." }],
      weaknesses: [{ en: "Poor reach forces him to approach and fight up close." }, { en: "Inconsistent KO ability, with very few guaranteed KO set-ups." }, { en: "Limited recovery; Super Jump Punch is fairly linear and does not travel far." }, { en: "Other characters outperform him in individual areas such as power, mobility and reach." }],
    },
    "marth": {
      source: { title: "SmashWiki: Marth (SSB4)", url: "https://www.ssbwiki.com/Marth_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Marth is a sword character with high mobility, the fastest walking speed in the game and long, disjointed range. His attacks deal much more damage and knockback at the tip of the sword, which rewards proper spacing. He aims to fight a step away from danger, pressuring opponents without leaving himself open.",
      },
      traits: [],
      strengths: [{ en: "Hits with the tip of his sword deal significantly more damage and knockback." }, { en: "One of the longest overall ranges in the game, with fast, wide-arcing attacks." }, { en: "The first hit of his jab is fast, hard to challenge and leads into combos." }, { en: "Strong edgeguarding, and Dolphin Slash is an excellent out of shield option." }],
      weaknesses: [{ en: "KO power is very inconsistent without proper tipper spacing." }, { en: "Weak throws that are poor for combos, damage and KOs." }, { en: "No projectile, so he can struggle against projectile-heavy characters." }, { en: "Susceptible to combos and juggling; Dolphin Slash is his only reliable combo-breaker." }],
    },
    "mega-man": {
      source: { title: "SmashWiki: Mega Man (SSB4)", url: "https://www.ssbwiki.com/Mega_Man_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mega Man is a heavyweight who relies on projectiles throughout his moveset, including his neutral attack and forward tilt. He works best at mid-range, spacing with Mega Buster shots, Metal Blade and Crash Bomber, turning the reactions they force into grabs and combos, then using slow but powerful finishers once the opponent is damaged.",
      },
      traits: [],
      strengths: [{ en: "Fantastic spacing; his jab, Metal Blades and Crash Bombs make him difficult to approach." }, { en: "Fast grab with many attacks that connect reliably after a throw." }, { en: "Many finishers, including a very fast up tilt and a projectile forward smash." }, { en: "Heavy enough to survive strong hits, with a good recovery move in Rush Coil." }],
      weaknesses: [{ en: "Suffers against reflectors and other ways of making his projectiles ineffective." }, { en: "Lacks a melee jab or quick standard attacks to push away opponents up close." }, { en: "Low speed and ending lag on non-projectile moves limit his approach." }, { en: "His strongest attacks have noticeable start-up or ending lag, making his finishers somewhat predictable." }],
    },
    "meta-knight": {
      source: { title: "SmashWiki: Meta Knight (SSB4)", url: "https://www.ssbwiki.com/Meta_Knight_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Meta Knight is a very small, light swordsman with fast overall mobility, multiple midair jumps and very quick attacks. He is a high-risk, high-reward character: he plays patiently in the neutral game, then turns an opening into long combos, early KOs and strong edge-guarding. His best combos need precise spacing and timing.",
      },
      traits: [],
      strengths: [{ en: "Very fast attacks with little start-up or ending lag, and disjointed sword range." }, { en: "Incredible combo potential, including up aerial chains into Shuttle Loop for very early KOs." }, { en: "Outstanding recovery with five midair jumps and a special moveset full of recovery options." }, { en: "Edge-guarding potential among the greatest in the game." }],
      weaknesses: [{ en: "Linear neutral game; only dash attack and dash grab are effective approach options." }, { en: "No projectile, leaving him susceptible to camping." }, { en: "Poor endurance, and surprisingly susceptible to combos with no reliable combo breaker." }, { en: "KO combos are difficult to master, and Shuttle Loop is highly punishable if it misses." }],
    },
    "mewtwo": {
      source: { title: "SmashWiki: Mewtwo (SSB4)", url: "https://www.ssbwiki.com/Mewtwo_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mewtwo is tall yet the second lightest character in the game, with fast dashing, the third fastest air speed and the highest double jump. It is a glass cannon with a powerful air game, grab game and Shadow Ball, but it usually relies on bait and punish tactics and reads because it is so frail and vulnerable to pressure.",
      },
      traits: [],
      strengths: [{ en: "Highly potent air game; its aerials are powerful and also useful in combos." }, { en: "Up throw and back throw are among the strongest throws in the game." }, { en: "Shadow Ball zones when uncharged and is one of the strongest, fastest projectiles when fully charged." }, { en: "Confusion is a command grab and reflector, and Teleport is a safe recovery." }],
      weaknesses: [{ en: "Very light and tall, so it is easy to KO, combo and juggle." }, { en: "Lacks an effective aerial attack for interrupting combos." }, { en: "Most grounded moves have noticeable ending lag and are risky when they miss." }, { en: "Most KO options apart from forward aerial and fully charged Shadow Ball are difficult to land." }],
    },
    "mii-brawler": {
      source: { title: "SmashWiki: Mii Brawler (SSB4)", url: "https://www.ssbwiki.com/Mii_Brawler_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "The Mii Brawler is a quick, nimble rushdown character of average weight who combines speed and power with reliable combos. They have the best mobility of the three Mii Fighter types and one of the best ground games, with little lag on most attacks. Their aerials work best for finishing combos or scoring KOs.",
      },
      traits: [],
      strengths: [{ en: "Among the best ground games in the game: good mobility, serious damage and little lag." }, { en: "Good combo ability; many attacks and throws keep opponents close for follow-ups." }, { en: "Fast, strong aerials; up aerial juggles and KOs off the top, and down aerial meteor smashes." }, { en: "Where allowed, custom moves and Mii size choices can cover most of their flaws." }],
      weaknesses: [{ en: "Poor range on most attacks." }, { en: "Subpar grab game with short range and a weak pummel." }, { en: "Abysmal vertical recovery that is easy to gimp." }, { en: "No projectile apart from Shot Put, giving them a poor approach game." }],
    },
    "mii-gunner": {
      source: { title: "SmashWiki: Mii Gunner (SSB4)", url: "https://www.ssbwiki.com/Mii_Gunner_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "The Mii Gunner is a long-range fighter: the slowest runner of the three Mii Fighter types, but with the longest range. They keep opponents at a distance with a wide range of projectiles, force them to approach, build up damage and send them offstage to finish. They can struggle against up-close pressure.",
      },
      traits: [],
      strengths: [{ en: "A wide range of projectiles for keeping opponents away and forcing approaches." }, { en: "Grenade Launch, Flame Pillar and Bomb Drop are good at guarding edges." }, { en: "Forward smash and up aerial have very long range, high knockback and multiple hits." }, { en: "Echo Reflector reflects projectiles and Absorbing Vortex absorbs them to heal." }],
      weaknesses: [{ en: "Low running speed and ending lag on attacks make approaching difficult." }, { en: "Trouble with up-close pressure, with generally poor out-of-shield options." }, { en: "Weak grab game; throws deal little damage and lack KO potential." }, { en: "Recoveries are largely vertical." }],
    },
    "mii-swordfighter": {
      source: { title: "SmashWiki: Mii Swordfighter (SSB4)", url: "https://www.ssbwiki.com/Mii_Swordfighter_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "The Mii Swordfighter has average mobility and disjointed sword hitboxes for keeping opponents at a distance. They are more at home in the air, where their aerials are quicker, and their special moves offer projectiles, a reflector and a counterattack. They are a flexible fighter whose playstyle depends on the custom moves chosen.",
      },
      traits: [],
      strengths: [{ en: "Versatile special moves, including projectiles, a reflector and a counterattack." }, { en: "Disjointed hitboxes that keep opponents at a distance." }, { en: "Quick aerials for low-percentage combos and gimping; up and back aerials can KO." }, { en: "One of the fastest grabs in the game." }],
      weaknesses: [{ en: "KO moves are unusually weak and punishable for a sword character, with no KO setups." }, { en: "Low mobility and laggy attacks make their ground moves easy to punish." }, { en: "Combos lose viability once the opponent is above a certain percentage." }, { en: "Apart from Airborne Assault, their horizontal recovery moves give mediocre distance." }],
    },
    "mr-game-and-watch": {
      source: { title: "SmashWiki: Mr. Game & Watch (SSB4)", url: "https://www.ssbwiki.com/Mr._Game_%26_Watch_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mr. Game & Watch is a small, very light character with good mobility for a lightweight and disjointed attacks. He is a glass cannon: he racks up heavy damage from only a few hits through his combo and air games and has strong finishers, but he is himself KO'd earlier than most characters.",
      },
      traits: [],
      strengths: [{ en: "Down throw is a reliable combo starter that leads into many follow-ups." }, { en: "Damaging, versatile aerials, including a down aerial that meteor smashes." }, { en: "Many powerful finishers for his weight, including all of his smash attacks." }, { en: "Fire gives great vertical distance and a recovery that is hard to edgeguard." }],
      weaknesses: [{ en: "The third-lightest character in the game, so he is KO'd early, especially vertically." }, { en: "Slow, short-reaching dodges and a short-range grab with a slow pummel." }, { en: "Mediocre range overall, so swordfighters outrange him and stop his approaches." }, { en: "High ending and landing lag makes missed or shielded attacks easy to punish." }],
    },
    "ness": {
      source: { title: "SmashWiki: Ness (SSB4)", url: "https://www.ssbwiki.com/Ness_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ness is a short, average-weight character with three projectiles and a versatile moveset, but below average speed on the ground and in the air. His biggest strength is his aerial game, used to space, combo and KO at close quarters, backed by a potent grab game. He can struggle to pressure from afar.",
      },
      traits: [],
      strengths: [{ en: "Most aerials can space, combo or KO, and all but down aerial auto-cancel from a short hop." }, { en: "Back throw is the strongest in the game and his most used KO option." }, { en: "PK Fire holds opponents in place for guaranteed follow-ups such as a grab." }, { en: "PSI Magnet heals him when hit by energy-based attacks." }],
      weaknesses: [{ en: "Recovery is his biggest flaw and is easy to gimp." }, { en: "Below average speed makes it hard to chase most opponents." }, { en: "Weak ground game with short-ranged tilt attacks." }, { en: "Vulnerable to characters who use his poor mobility and low range to zone him out." }],
    },
    "olimar": {
      source: { title: "SmashWiki: Olimar (SSB4)", url: "https://www.ssbwiki.com/Olimar_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Olimar is a small, floaty lightweight with slow mobility who relies on his Pikmin for almost all of his moves. The Pikmin act as both projectiles and disjointed hitboxes, making him an unusual zoner with long range for his size who camps, spaces and racks up damage quickly. He must keep at least one Pikmin with him.",
      },
      traits: [],
      strengths: [{ en: "One of the best camping and spacing abilities in the game." }, { en: "Pikmin Throw racks up damage quickly and hinders approaches." }, { en: "Disjointed grab range gives him an excellent shield grab." }, { en: "Winged Pikmin give a long, maneuverable recovery." }],
      weaknesses: [{ en: "Slow mobility lets fast characters outpace him and punish him when he plucks Pikmin." }, { en: "Without Pikmin, most of his best attacks do nothing." }, { en: "Light and floaty, so he is easy to juggle and KO early." }, { en: "Pikmin count as projectiles and can be reflected." }],
    },
    "pac-man": {
      source: { title: "SmashWiki: Pac-Man (SSB4)", url: "https://www.ssbwiki.com/Pac-Man_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pac-Man is a floaty middleweight who relies on his item-producing special moves, Bonus Fruit and Fire Hydrant, to control the flow of battle. He excels at mind games, traps, zoning and damage racking, and has a good combo game and recovery. His low knockback and poor range make it hard for him to KO.",
      },
      traits: [],
      strengths: [{ en: "Bonus Fruit and Fire Hydrant give mix-ups for spacing, combos, edge-guarding and KOs." }, { en: "Good combo game with fast tilts and aerials that chain together." }, { en: "Pac-Jump is an effective vertical recovery that is hard to gimp." }, { en: "Neutral aerial and back aerial are effective off-stage finishers." }],
      weaknesses: [{ en: "Struggles to KO early because most of his moves have low base knockback." }, { en: "Grabs are extremely laggy and risky, and only down throw has combo potential." }, { en: "All of his special moves can be turned against him by opponents." }, { en: "Below-average movement speed makes it hard to chase opponents or make space to charge Bonus Fruit." }],
    },
    "palutena": {
      source: { title: "SmashWiki: Palutena (SSB4)", url: "https://www.ssbwiki.com/Palutena_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Palutena is a tall, fairly light middleweight with fast ground movement and an impressive air game, but the laggiest moves in the game. She is a frail yet defensive character who relies on spacing, shielding, her grab game and punishes instead of approaching. A single opening lets her rack up damage or KO early from down throw.",
      },
      traits: [],
      strengths: [{ en: "Fast walking and dashing speeds and quick changes of direction in the air." }, { en: "Long grab range and a down throw that combos into her aerials, including KO combos." }, { en: "Aerials start quickly and are useful; up aerial is arguably her best KOing option." }, { en: "Forward and up smashes have excellent range and high power." }],
      weaknesses: [{ en: "Overall the laggiest frame data in the game, so missed attacks are easily punished." }, { en: "Almost no grounded approach." }, { en: "Poor out-of-shield options, and she is prone to juggling, combos and early vertical KOs." }, { en: "Default special moves have limited utility; Counter is the least effective counterattack in the game." }],
    },
    "peach": {
      source: { title: "SmashWiki: Peach (SSB4)", url: "https://www.ssbwiki.com/Peach_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Peach is a tall, light character who is slow on the ground and in the air, but her unique float lets her hover at any height. She plays an effective keep-away game with Vegetable and controls space by floating low with retreating aerials, backed by a potent aerial moveset. She has a very high learning curve.",
      },
      traits: [],
      strengths: [{ en: "Floating makes her hard to punish and lets her attack shields with little risk." }, { en: "Forward aerial is her best finishing move and can be used while floating." }, { en: "Down throw leads into a variety of moves and back throw is a good KO option." }, { en: "Floating allows effective edgeguarding." }],
      weaknesses: [{ en: "Slow movement lets faster opponents overwhelm her." }, { en: "Has difficulty landing and, with her low weight, is prone to juggling and vertical KOs." }, { en: "Struggles to approach characters with long reach and disjoints." }, { en: "Vertical recovery is average at best, predictable and slow, so she can be gimped." }],
    },
    "pikachu": {
      source: { title: "SmashWiki: Pikachu (SSB4)", url: "https://www.ssbwiki.com/Pikachu_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pikachu is a small, agile lightweight with fast walking and dashing speeds and quick attacks. It has a flexible approach through Quick Attack and Thunder Jolt, a formidable combo game, and a superb recovery that lets it edge-guard far off-stage. It has a high learning curve and relies heavily on reads to score KOs.",
      },
      traits: [],
      strengths: [{ en: "Strong neutral game built on Quick Attack, Thunder Jolt and fast movement." }, { en: "Most attacks come out very quickly, giving it a formidable combo game." }, { en: "Superb recovery; Quick Attack is unpredictable and hard to intercept." }, { en: "Strong edge-guarding, able to go far off-stage and still recover." }],
      weaknesses: [{ en: "Light weight and above-average gravity make it prone to being KO'd." }, { en: "Poor range, with most hitboxes very close to its body." }, { en: "Low damage output and significant trouble KOing, with few reliable set-ups." }, { en: "Aerials have abnormally high landing lag." }],
    },
    "pit": {
      source: { title: "SmashWiki: Pit (SSB4)", url: "https://www.ssbwiki.com/Pit_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pit is a middleweight with average overall mobility, three double jumps and a balanced moveset with no glaring strengths or weaknesses. He is beginner-friendly, with quick attacks and the Palutena Bow for zoning and edge-guarding, and a very effective neutral game. He keeps opponents at a disadvantage to rack up damage but struggles to KO.",
      },
      traits: [],
      strengths: [{ en: "Most of his normal moves start quickly." }, { en: "Palutena Bow can be charged and steered for zoning, edge-guarding and mindgames." }, { en: "Down throw is a very reliable combo starter, and forward throw can KO near the edge." }, { en: "Forward smash is his strongest KOing option and among the fastest of its kind." }],
      weaknesses: [{ en: "KO potential is his most noticeable weakness, with no guaranteed KO set-ups." }, { en: "All of his aerials have a large amount of landing lag." }, { en: "Recovery is long but linear and predictable." }, { en: "Most characters outperform him in single areas such as combos, mobility, range or power." }],
    },
    "rob": {
      source: { title: "SmashWiki: R.O.B. (SSB4)", url: "https://www.ssbwiki.com/R.O.B._(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "R.O.B. is a heavyweight with respectable mobility, almost as mobile as a middleweight, and strong jumps. He is a defensive, zoning-oriented character who keeps opponents at bay with Robo Beam and Gyro, and he also has a strong air game and improved close-range offense with respectable KO power.",
      },
      traits: [],
      strengths: [{ en: "Versatile projectiles in Robo Beam and Gyro, plus some of the strongest item throws." }, { en: "Arm Rotor reflects projectiles and can KO." }, { en: "Aerials have excellent, disjointed range; up aerial is one of his best attacks." }, { en: "Down throw combos reliably into up aerial, and up throw is a viable KOing option." }],
      weaknesses: [{ en: "KOing options can be hard to land because of lag or unimpressive range." }, { en: "The shortest-ranged grab in the game." }, { en: "Large hurtbox and faster falling speed make him prone to combos; his aerials cannot reliably break them." }, { en: "Struggles against characters with better projectiles or attacks that counteract his own." }],
    },
    "robin": {
      source: { title: "SmashWiki: Robin (SSB4)", url: "https://www.ssbwiki.com/Robin_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Robin is a tall middleweight with the slowest dashing speed in the game. He is a tactical character who uses his tomes for spacing, pressure and damage and the Levin Sword for KO power. His weapons have limited durability, so he must keep track of them and act precisely, as he is vulnerable to pressure and combos.",
      },
      traits: [],
      strengths: [{ en: "Thunder and Arcfire disrupt opponents, rack up damage and set up further attacks." }, { en: "The Levin Sword is powerful and fairly long-ranged, with high KO power." }, { en: "Nosferatu heals him and cannot be shielded." }, { en: "Back throw can KO near the edge and down throw is a reliable combo starter." }],
      weaknesses: [{ en: "Overall the slowest mobility in the game, so very fast characters trouble him." }, { en: "Lacks defensive options and is prone to rushdowns and juggles." }, { en: "Smash attacks and special moves have significant ending lag." }, { en: "Losing the Levin Sword or a tome greatly weakens him; without Elwind he is nearly helpless recovering." }],
    },
    "rosalina-and-luma": {
      source: { title: "SmashWiki: Rosalina & Luma (SSB4)", url: "https://www.ssbwiki.com/Rosalina_%26_Luma_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Rosalina is a tall, very floaty lightweight who fights alongside Luma as a tag team. Luma can attack beside her or be sent away with Luma Shot to attack from a distance. They are largely defensive characters with many disjointed attacks, and players must protect both Rosalina and Luma, which gives them a high learning curve.",
      },
      traits: [],
      strengths: [{ en: "Many disjointed attacks; up aerial has outstanding range and can KO very early." }, { en: "Gravitational Pull nullifies nearby projectiles and is very hard to punish." }, { en: "Luma can attack from a distance, including smash attacks away from Rosalina." }, { en: "Lunar Landing and the dash grab with Luma add mix-ups and safer approaches." }],
      weaknesses: [{ en: "Drastically weaker without Luma, which takes 13 seconds to return once KO'd." }, { en: "Tall and light, so attacks are hard to avoid and she is KO'd early." }, { en: "Very poor disadvantage state; she does not deal with juggling well." }, { en: "Launch Star has no hitbox, leaving her open to meteor smashes." }],
    },
    "roy": {
      source: { title: "SmashWiki: Roy (SSB4)", url: "https://www.ssbwiki.com/Roy_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Roy is a speedy fast-faller whose sword is strongest near the hilt, so he fights up close instead of spacing at a distance. Almost all of his attacks start quickly and his sweetspots hit hard. He plays best with limited aggression: capitalizing on openings with his mobility while approaching cautiously, since his recovery is poor.",
      },
      traits: [],
      strengths: [{ en: "Fast dashing, air and falling speeds let him close the gap quickly." }, { en: "Sweetspotted attacks KO impressively early; forward smash is one of the strongest of its kind." }, { en: "Strong damage racking at low percents from neutral aerial, neutral attack and throws." }, { en: "Blazer is an excellent out of shield option, and his Counter is among the strongest." }],
      weaknesses: [{ en: "Recovery is poor: Blazer covers little vertical distance and is predictable." }, { en: "Very quick falling speed makes him extremely prone to combos." }, { en: "Below-average range for a swordsman, with weak sourspots at the tip." }, { en: "Lacks KO setups, leaving him only with hard punishes to end stocks." }],
    },
    "ryu": {
      source: { title: "SmashWiki: Ryu (SSB4)", url: "https://www.ssbwiki.com/Ryu_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ryu is a heavyweight of average size and mobility with amazing frame data and high damage output. Tapping or holding the attack button gives him fast, weak attacks or slow, strong ones, in effect two movesets: one for combos and one for KOs. He is a combo-oriented fighter with a notably high learning curve.",
      },
      traits: [],
      strengths: [{ en: "True combos from nearly any move that chain directly into KO options." }, { en: "Shoryuken has high knockback and intangibility; the input version has fearsome KO power." }, { en: "Focus Attack tanks a hit and is a dependable combo breaker." }, { en: "Excellent shield pressure." }],
      weaknesses: [{ en: "Mediocre neutral game: very slow walk, short range and a telegraphed Hadoken." }, { en: "Fixed-arc jumps force him to commit when approaching through the air." }, { en: "Poor grab game with no effective follow-up or KO throws." }, { en: "Few moves KO without a prior combo, and vertical recovery is easy to predict." }],
    },
    "samus": {
      source: { title: "SmashWiki: Samus (SSB4)", url: "https://www.ssbwiki.com/Samus_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Samus is an unusually floaty heavyweight with high jumps and a defensive moveset. She uses her projectiles and grab aerial to space, rack up damage from a distance and pressure shields, then sets up combos and finishes opponents off-stage or with Charge Shot. She is hard to master but rewards patient, calculated play.",
      },
      traits: [],
      strengths: [{ en: "Charge Shot is her most consistent KOing special move." }, { en: "Strong air game with low landing lag; back aerial is one of her best moves." }, { en: "The longest grab range in the game, and down throw starts damaging combos." }, { en: "Screw Attack is a decent out of shield option and combo finisher." }],
      weaknesses: [{ en: "Easily juggled, with few reliable landing options." }, { en: "Grabs have long ending lag and are easy to punish when missed." }, { en: "Mediocre ground game with punishable smash attacks and a weak neutral attack." }, { en: "Recovery is linear and predictable." }],
    },
    "sheik": {
      source: { title: "SmashWiki: Sheik (SSB4)", url: "https://www.ssbwiki.com/Sheik_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sheik is a hit-and-run character with some of the best mobility and frame data in the game. She has an outstanding neutral game and can play defensively with Needle Storm or aggressively with fast, safe attacks. Her low-power moves give her one of the best combo games, but she is frail and struggles to secure KOs.",
      },
      traits: [],
      strengths: [{ en: "Moves have very little startup and ending lag, so she is extremely hard to punish." }, { en: "Needle Storm is a fast, long-ranged projectile that gives her strong camping." }, { en: "Among the best combo abilities in the game from throws and tilts." }, { en: "Versatile recovery with Vanish and Bouncing Fish that is hard to edge-guard." }],
      weaknesses: [{ en: "Frail on stage and easy to combo." }, { en: "Poor damage output, needing very long strings of attacks to build damage." }, { en: "Struggles to KO; her smash attacks are hard to land and mostly weak." }, { en: "No throws that KO reliably." }],
    },
    "shulk": {
      source: { title: "SmashWiki: Shulk (SSB4)", url: "https://www.ssbwiki.com/Shulk_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Shulk is a heavyweight swordsman with the longest overall disjointed range in the game and relatively good mobility for his weight. He adapts to each situation with Monado Arts, which change his attributes for a short time at a cost. He plays patiently, warding off pressure and exploiting openings, and has an extremely high learning curve.",
      },
      traits: [],
      strengths: [{ en: "The longest overall disjointed range in the game." }, { en: "Monado Arts boost his jumping, speed, defense, damage or knockback as needed." }, { en: "Powerful aerials; neutral and forward aerials are his best approach options." }, { en: "Vision is one of the most effective counters of any character." }],
      weaknesses: [{ en: "Among the slowest attacks in the game, so a missed attack is easily punished." }, { en: "Cannot auto-cancel any aerial, and all have high ending lag." }, { en: "Easy to combo and juggle, with no quick combo breaker." }, { en: "No projectile or anti-projectile options, and each Monado Art has a drawback." }],
    },
    "sonic": {
      source: { title: "SmashWiki: Sonic (SSB4)", url: "https://www.ssbwiki.com/Sonic_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sonic is a middleweight with outstanding mobility, including the fastest dashing speed in the game, which suits a hit-and-run playstyle. Spin Dash and Spin Charge are his best neutral options and lead into fast chains of attacks. He must force opponents into mistakes to rack up damage safely and use his mobility to avoid punishment.",
      },
      traits: [],
      strengths: [{ en: "The fastest dashing speed in the game and high speed all over the stage." }, { en: "Spin Dash and Spin Charge deal damage, chain into attacks and look extremely similar." }, { en: "Spring Jump covers great vertical distance and does not leave him helpless." }, { en: "Strong air game; neutral aerial is a great combo starter." }],
      weaknesses: [{ en: "KO potential is his most noticeable weakness; his reliable KO moves need good positioning." }, { en: "Trouble landing and prone to juggling." }, { en: "Ground-level projectiles limit his movement, so camping is hard to deal with." }, { en: "Recovery is predictable if Spring Jump is his only option." }],
    },
    "toon-link": {
      source: { title: "SmashWiki: Toon Link (SSB4)", url: "https://www.ssbwiki.com/Toon_Link_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Toon Link is a fairly quick but floaty middleweight with a sword that gives him disjointed range. He is a zoning-oriented character who uses Hero's Bow, Boomerang and Bomb to force approaches and camp. His combo game revolves around Bomb, and he racks up damage with projectiles and combos before going for a KO.",
      },
      traits: [],
      strengths: [{ en: "Three projectiles let him force approaches and camp effectively." }, { en: "Bomb is his most varied combo starter and can lead into KO moves." }, { en: "Up tilt combos into many moves across a wide range of percentages." }, { en: "Back throw is one of the strongest throws in the game." }],
      weaknesses: [{ en: "Floatiness makes him prone to strong vertical attacks and his recovery predictable." }, { en: "Combo game relies heavily on Bomb, up tilt and grab aerial." }, { en: "Grabs have considerable start-up and ending lag." }, { en: "Aerials have considerable ending lag, and his short size offsets his range." }],
    },
    "villager": {
      source: { title: "SmashWiki: Villager (SSB4)", url: "https://www.ssbwiki.com/Villager_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Villager is an unorthodox character with several unique moves, including standard attacks that are projectiles. He has a strong camping game built on his slingshot aerials, Lloid Rocket, Pocket and Timber, and his projectiles also help him approach. He has arguably the best recovery in the game and is a very potent edgeguarder, but has below-average mobility.",
      },
      traits: [],
      strengths: [{ en: "Strong camping with long-ranged slingshot aerials and Lloid Rocket." }, { en: "Pocket catches opposing projectiles and can steal items such as R.O.B.'s Gyro." }, { en: "Balloon Trip flies a great distance and is hard to gimp." }, { en: "Many edgeguarding options, including dropping the forward smash bowling ball from the ledge." }],
      weaknesses: [{ en: "Below-average mobility, with the fourth slowest dashing speed in the game." }, { en: "One of the laggiest grabs in the game, making it very punishable." }, { en: "Powerful KO moves are hard to land from a neutral situation." }],
    },
    "wario": {
      source: { title: "SmashWiki: Wario (SSB4)", url: "https://www.ssbwiki.com/Wario_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Wario is a short heavyweight with some of the best aerial mobility of any character but slow ground speed. He dips in and out of the fray with versatile aerial attacks to bait and punish. His unorthodox special moves take practice, and he must play unpredictably, relying on deception and mindgames to earn KOs.",
      },
      traits: [],
      strengths: [{ en: "Some of the best aerial mobility of any character." }, { en: "Chomp is one of the best command grabs, with long range and almost no lag." }, { en: "Wario Bike is a solid approach option and works as a third jump for recovery." }, { en: "Many ground attacks are fast, deal good damage and set up follow-ups." }],
      weaknesses: [{ en: "Lackluster reach and no true projectile." }, { en: "Struggles against characters with disjointed attacks." }, { en: "Relative lack of reliable KO moves compared with other heavyweights." }, { en: "Almost no reliable way to counteract camping." }],
    },
    "wii-fit-trainer": {
      source: { title: "SmashWiki: Wii Fit Trainer (SSB4)", url: "https://www.ssbwiki.com/Wii_Fit_Trainer_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Wii Fit Trainer is a middleweight with good overall mobility and fast dodges. Her yoga-pose attacks have unusual hitboxes, some hitting behind her, which help with mindgames and punishes. She performs best with a hit-and-run playstyle, using her air game to edge-guard and her projectiles to camp or zone. She has a steep learning curve.",
      },
      traits: [],
      strengths: [{ en: "Neutral aerial is her best combo starter and leads into forward and up tilts." }, { en: "Forward, back and down aerials make her a potent edge-guarder." }, { en: "Deep Breathing raises her damage and knockback and slightly heals her." }, { en: "Header is an extremely useful projectile, especially for edge-guard breaking." }],
      weaknesses: [{ en: "Hitbox placements make it hard to hit smaller characters." }, { en: "Unimpressive grab game with poor range and unrewarding throws." }, { en: "Most moves have considerable ending lag." }, { en: "Inconsistent KO potential outside Deep Breathing; Super Hoop is easy to gimp." }],
    },
    "yoshi": {
      source: { title: "SmashWiki: Yoshi (SSB4)", url: "https://www.ssbwiki.com/Yoshi_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Yoshi is a heavyweight with strong mobility, especially in the air: the fastest air speed in the game by default and the second highest double jump, which also grants armor. He is very floaty despite being heavy. He plays as a heavyweight all-rounder with fast, useful attacks and a versatile air game, and has a low learning curve.",
      },
      traits: [],
      strengths: [{ en: "The fastest air speed in the game by default, and a double jump with armor." }, { en: "Neutral attack and tilts are very fast and set up combos or edge-guards." }, { en: "Versatile aerials; down aerial is the most damaging aerial in the game." }, { en: "Egg Lay is a command grab that immobilizes opponents for free hits." }],
      weaknesses: [{ en: "Poor vertical recovery that relies on his double jump, leaving him open to meteor smashes." }, { en: "Grabs are very laggy and his throws neither KO nor combo reliably." }, { en: "Slow, short rolls and sidesteps and the smallest shield in the game." }, { en: "KOing options have short durations and punishable ending lag." }],
    },
    "zelda": {
      source: { title: "SmashWiki: Zelda (SSB4)", url: "https://www.ssbwiki.com/Zelda_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Zelda is a tall, floaty lightweight with largely slow mobility. Her playstyle is largely defensive, built on strong out of shield options and punishes, with reads, baits and edge-guards setting up KOs. Her strongest attacks need precise sweetspots, making her akin to a glass cannon, and she struggles to approach or escape pressure.",
      },
      traits: [],
      strengths: [{ en: "Farore's Wind is a long-ranged, intangible teleport for recovery and a strong KO move." }, { en: "Sweetspotted Lightning Kicks and down aerial easily KO even super heavyweights." }, { en: "Down throw combos into up aerial for a KO." }, { en: "Fairly long grab range and one of the most damaging pummels." }],
      weaknesses: [{ en: "Tall, light and floaty, so she is prone to combos and early KOs." }, { en: "Sub-par mobility, approach and neutral game." }, { en: "Inconsistent KO potential: strong attacks have weak sourspots, punishable lag or both." }, { en: "Special moves lack pressure; Din's Fire is very easy to evade." }],
    },
    "zero-suit-samus": {
      source: { title: "SmashWiki: Zero Suit Samus (SSB4)", url: "https://www.ssbwiki.com/Zero_Suit_Samus_(SSB4)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Zero Suit Samus is a tall lightweight with excellent mobility on the ground and in the air, plus very quick falling speed. Her greatest asset is her superb air game, and her punishment potential is one of the most potent in the game, with reliable set-ups into combos and KOs. Her own neutral game is weak.",
      },
      traits: [],
      strengths: [{ en: "Excellent mobility, with several attributes among the top ten." }, { en: "Superb air game; back aerial is her most reliable aerial KOing option." }, { en: "Paralyzer and down smash paralyze opponents for follow-ups." }, { en: "Down throw has guaranteed follow-ups and can lead to very early KOs with Boost Kick." }],
      weaknesses: [{ en: "Light, tall and fast-falling, so she is KO'd fairly early and prone to combos." }, { en: "Grabs are very laggy, and only down throw has guaranteed follow-ups." }, { en: "Most attacks hit high above the ground, so short characters avoid them easily." }, { en: "Weak neutral game with a limited approach against defensive and zoning characters." }],
    },
  },
  smash64: {
    "captain-falcon": {
      source: { title: "SmashWiki: Captain Falcon (SSB)", url: "https://www.ssbwiki.com/Captain_Falcon_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Captain Falcon is a tall heavyweight who focuses on speed and power. He has the fastest dashing speed and highest falling speed in the game, the best dash-dance, and a very strong aerial game with strong combos. He approaches very quickly with short hopped aerials, but his recovery is short and he is vulnerable to combos and camping.",
      },
      traits: [],
      strengths: [{ en: "The fastest dashing speed in the game by quite a margin." }, { en: "Up aerial is his most versatile move, chaining into itself and Falcon Dive for KOs." }, { en: "Down aerial is a powerful meteor smash and a very effective edgeguarder." }, { en: "Forward smash has great range and is a powerful, reliable KO move." }],
      weaknesses: [{ en: "Short, predictable recovery makes him one of the easiest characters to edgeguard." }, { en: "Very vulnerable to combos." }, { en: "No projectile and no reliable way to avoid them, so camping troubles him." }, { en: "Limited effective ground options." }],
    },
    "donkey-kong": {
      source: { title: "SmashWiki: Donkey Kong (SSB)", url: "https://www.ssbwiki.com/Donkey_Kong_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Donkey Kong is the heaviest and largest character in the game. He takes many hits before being KO'd and deals lots of damage with strong knockback, though his attacks are generally slow and most KOs need setup. He has a great grab and throw game, and uses throws and Spinning Kong to gimp opponents.",
      },
      traits: [],
      strengths: [{ en: "Great grab game: the longest non-tether grab range, terrific throw combos and a KO back throw." }, { en: "Extremely powerful finishers in forward smash and a charged Giant Punch." }, { en: "Spinning Kong is a strong gimping move that out-prioritizes every recovery in the game." }, { en: "Good reach allows decent combos despite slow attacks." }],
      weaknesses: [{ en: "Extremely vulnerable to combos because he is very large and heavy." }, { en: "No projectile and no reliable way to deal with them, so his approach is poor." }, { en: "Spinning Kong gains little height, leaving him very vulnerable to meteor smashes." }, { en: "Poor shield game makes him vulnerable to shield break combos." }],
    },
    "fox": {
      source: { title: "SmashWiki: Fox (SSB)", url: "https://www.ssbwiki.com/Fox_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Fox is all about speed, with fast movement and fast attacks. He camps with his Blaster Shot to keep opponents away, uses his quick movement to get around the stage, and starts a combo when the opponent is left open. Low knockback on most of his moves gives him long combos but can make KOing onstage hard.",
      },
      traits: [],
      strengths: [{ en: "Amazing combo potential, with the ability to zero-death many characters." }, { en: "Blaster Shot covers a very large distance and stops opponents approaching." }, { en: "Strong edgeguarding with forward and back aerials, down smash and the shine." }, { en: "Up smash is a strong KO move that he can combo into in many ways." }],
      weaknesses: [{ en: "Most of his attacks have low knockback, so he can have trouble KOing onstage." }, { en: "His recovery is predictable and linear, which makes him easy to edgeguard." }, { en: "Fire Fox needs charge-up time and leaves him vulnerable while it charges." }, { en: "Vulnerable to combos that work on fastfallers." }],
    },
    "jigglypuff": {
      source: { title: "SmashWiki: Jigglypuff (SSB)", url: "https://www.ssbwiki.com/Jigglypuff_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Jigglypuff has the second slowest dash speed but great aerial mobility, and most of its attacks have low knockback. It relies on good aerials, edgeguarding and a few surprisingly powerful finishers such as up smash and Rest. Its special moves are extreme, each pairing incredible strengths with terrible weaknesses.",
      },
      traits: [],
      strengths: [{ en: "Rest is an excellent combo finisher with incredible strength." }, { en: "Up smash is one of the strongest in the game." }, { en: "Recovers from almost any distance horizontally." }, { en: "Its floatiness, low weight and small size make long combos hard to land on it." }],
      weaknesses: [{ en: "Vertical recovery is very bad, leaving it open to meteor smashes and semi-spikes." }, { en: "Very easy to juggle, and very vulnerable to powerful vertical finishers." }, { en: "Its light weight means it is often knocked out earlier than any other character." }, { en: "If its shield breaks with no ceiling above, it is Star KOed." }],
    },
    "kirby": {
      source: { title: "SmashWiki: Kirby (SSB)", url: "https://www.ssbwiki.com/Kirby_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Kirby is a small, light and somewhat floaty character with quick yet powerful moves. His long-reaching up tilt and forward and back aerials space well, which makes a defensive Kirby hard to punish. He also has an excellent recovery and offstage game, with a down aerial that is a strong meteor smash.",
      },
      traits: [],
      strengths: [{ en: "Up tilt and forward and back aerials have high range and space well." }, { en: "Forward smash is the most powerful in the game and starts quickly." }, { en: "Excellent recovery, with five midair jumps and Final Cutter." }, { en: "Down aerial is a strong meteor smash for edgeguarding." }],
      weaknesses: [{ en: "Light and floaty, so he is easy to juggle and open to vertical KOs." }, { en: "Few reliable combo options outside up tilt and forward aerial." }, { en: "Few ways to KO onstage outside forward smash." }, { en: "His recovery is somewhat predictable because it is on the slow side." }],
    },
    "link": {
      source: { title: "SmashWiki: Link (SSB)", url: "https://www.ssbwiki.com/Link_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Link's attacks are slow, long-ranged and powerful, and he is rather slow himself, with very short jumps. He relies on his Boomerang and bombs to keep opponents away and stop them approaching, and those projectiles can lead to combos and edgeguards. He is heavy, so he is harder to KO but easier to combo.",
      },
      traits: [],
      strengths: [{ en: "Good KOing ability, with down aerial and forward smash as especially powerful finishers." }, { en: "Two projectiles keep opponents away and help him edgeguard." }, { en: "Heavy, so he is harder to KO than normal." }, { en: "Up tilt, back aerial and up aerial work as combo moves." }],
      weaknesses: [{ en: "The worst recovery in the game, and he is easily edgeguarded and gimped." }, { en: "His moves are laggy and easy to punish if they miss." }, { en: "His weight and size make him very easy to combo." }, { en: "Trouble dealing with projectile camping because of his poor mobility and jumps." }],
    },
    "luigi": {
      source: { title: "SmashWiki: Luigi (SSB)", url: "https://www.ssbwiki.com/Luigi_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Luigi is a full clone of Mario, with many similar attacks, strengths and weaknesses. His physics give him very poor mobility and big trouble approaching, even with his Fireballs. In return he has a very good recovery, many strong KO moves led by Fire Jump Punch, and good edgeguarding.",
      },
      traits: [],
      strengths: [{ en: "Fire Jump Punch is a very powerful KO move he can combo into from most aerials." }, { en: "Very good recovery, with a high jump, Super Jump Punch and Luigi Cyclone." }, { en: "Down aerial is an excellent combo move that deals very high damage." }, { en: "A good edgeguarder." }],
      weaknesses: [{ en: "Slow dashing, very slow air speed, low traction and low falling speed give him very poor mobility." }, { en: "Generally cannot combo well because of his very low air speed." }, { en: "Short range." }, { en: "His high, rather slow short hop hinders some of his combo ability." }],
    },
    "mario": {
      source: { title: "SmashWiki: Mario (SSB)", url: "https://www.ssbwiki.com/Mario_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mario is the balanced character, with stats that are average to slightly subpar. He has a good mix of low power and high power attacks, which gives him a strong combo ability with many options and a variety of KO moves. He also has one of the best offstage games and a good recovery.",
      },
      traits: [],
      strengths: [{ en: "Down aerial is an excellent damage racker that combos straight into up aerial." }, { en: "Up smash and back throw are very powerful KO moves." }, { en: "One of the best offstage games, with incredible edgeguarding." }, { en: "Good recovery, especially vertically." }],
      weaknesses: [{ en: "His attacks generally have short range, so many characters outspace and outcamp him." }, { en: "No reliable way to deal with projectiles." }, { en: "Poor mobility makes approaching and dealing with pressure hard." }, { en: "His attacks are not very fast, and up smash has major ending lag." }],
    },
    "ness": {
      source: { title: "SmashWiki: Ness (SSB)", url: "https://www.ssbwiki.com/Ness_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ness is a fairly small, fairly light character who is very slow on the ground and has short range, so he has trouble approaching. His aerial game is his strongest aspect: double jump canceling gives him quick aerials for combos and shield pressure. He performs well when his game plan gets going but struggles when he does not have the advantage.",
      },
      traits: [],
      strengths: [{ en: "Strong combos and shield pressure from double jump canceled aerials." }, { en: "Down aerial is the fastest and strongest meteor smash in the game." }, { en: "Forward and back throws are among the strongest in the game." }, { en: "Strong edgeguarding." }],
      weaknesses: [{ en: "Very poor mobility and very short range give him a very hard time approaching." }, { en: "His recovery is one of the worst in the game and is easy to exploit." }, { en: "Light, so he is fairly easy to combo and KO." }, { en: "Poor special moves, with projectiles too slow for camping." }],
    },
    "pikachu": {
      source: { title: "SmashWiki: Pikachu (SSB)", url: "https://www.ssbwiki.com/Pikachu_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pikachu is a small lightweight with great mobility and a strong set of moves on the ground and in the air. It can approach easily to start its strong punish game, and it can also play more defensively when it needs to. Quick Attack gives Pikachu the best recovery and escape options in the game.",
      },
      traits: [],
      strengths: [{ en: "Quick Attack is the best recovery move in the game by far." }, { en: "Great mobility, with a great ground game and aerial game." }, { en: "Incredible edgeguarding, going very deep and still returning safely." }, { en: "Thunder can KO at very low percents after an up smash." }],
      weaknesses: [{ en: "Very light, so it is moderately easy to combo and KO." }, { en: "Quick Attack is punishable if it does not reach the edge, and is hard to master." }, { en: "Its tech options are rather slow and punishable." }],
    },
    "samus": {
      source: { title: "SmashWiki: Samus (SSB)", url: "https://www.ssbwiki.com/Samus_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Samus is a tall, floaty heavyweight with decent range and two projectiles. Charge Shot covers a great distance and helps keep opponents at bay, and spacing with forward tilt and back aerial works well for her. Most of her moves have a lot of ending lag, so she lacks KO options that are easy to land.",
      },
      traits: [],
      strengths: [{ en: "Charge Shot covers a great distance and is fairly powerful." }, { en: "Down aerial is an extremely fast meteor smash and a great edgeguarding move." }, { en: "Back throw is a powerful KO throw." }, { en: "Her floatiness and Screw Attack let her escape many zero-to-death combos." }],
      weaknesses: [{ en: "Cannot perform a zero-to-death combo with her regular moves." }, { en: "Most of her moves have high ending lag, so she is heavily punished for misses." }, { en: "Very poor vertical recovery, and her recovery is slow and predictable." }, { en: "Struggles to start combos at low percents, especially against heavy characters." }],
    },
    "yoshi": {
      source: { title: "SmashWiki: Yoshi (SSB)", url: "https://www.ssbwiki.com/Yoshi_(SSB)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Yoshi is a heavy yet relatively quick character with the fastest air speed in the game. He has many KO moves and a huge number of combo moves, and double jump canceling lets him use aerials quicker and break shields. His large double jump has armor, but he has no third jump.",
      },
      traits: [],
      strengths: [{ en: "The fastest air speed in the game." }, { en: "Many KO moves and a huge number of combo moves." }, { en: "His double jump has armor, letting him escape combos and counterattack." }, { en: "Breaks shields quickly with double jump canceled aerials." }],
      weaknesses: [{ en: "A lot of trouble dealing with pressure." }, { en: "Left basically helpless if hit out of his double jump, as he has no third jump." }, { en: "His grab is slow, laggy and short compared to other ranged grabs." }, { en: "His reliable approach options lack range." }],
    },
  },
  ultimate: {
    "banjo-and-kazooie": {
      source: { title: "SmashWiki: Banjo & Kazooie (SSBU)", url: "https://www.ssbwiki.com/Banjo_%26_Kazooie_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Banjo & Kazooie are a heavyweight duo who fit the heavyweight trapper type. Their game plan centres on keeping stage control with their projectiles, while they are also capable up close with a few strong finishers, most notably Wonderwing. They are versatile and can adapt to several playstyles, but they suit turtling or more methodical play best.",
      },
      traits: [],
      strengths: [{ en: "Wonderwing is invincible, hits hard and beats nearly every other move." }, { en: "Egg Firing and Rear Egg are versatile projectiles for zoning, approaching and ledge trapping." }, { en: "Most attacks that use Kazooie are disjointed." }, { en: "Back throw is an incredibly powerful KO throw." }],
      weaknesses: [{ en: "Wonderwing has only five uses per stock and is very easy to punish when read." }, { en: "A fairly limited combo game, and unremarkable KO power for a heavyweight." }, { en: "Susceptible to combos and juggles, with no fast escape options." }, { en: "Poor initial dash, slow air speed and the lowest traction in the game." }],
    },
    "bayonetta": {
      source: { title: "SmashWiki: Bayonetta (SSBU)", url: "https://www.ssbwiki.com/Bayonetta_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Bayonetta is a tall, light, air-based combo character who racks up damage quickly and pressures opponents. Her poor ground moves force a very defensive, bait-and-punish style, and she has few reliable KO options, so she often earns stocks through edgeguards or Witch Time reads. Her complex combos and high-risk playstyle give her a high skill cap.",
      },
      traits: [],
      strengths: [{ en: "A strong aerial combo game that racks up damage quickly." }, { en: "An excellent recovery that is very hard to edgeguard." }, { en: "Bat Within gives her the fastest combo-breaking defensive option on the roster." }, { en: "Bullet Arts cannot be reflected and are a solid pressuring tool." }],
      weaknesses: [{ en: "Very few reliable KO options until very high percentages." }, { en: "Very poor frame data on the ground, making her approach among the worst." }, { en: "Tall, light and fast-falling, so she is easily comboed and KO'd." }, { en: "Her landing lag grows with each special move she uses in the air." }],
    },
    "bowser": {
      source: { title: "SmashWiki: Bowser (SSBU)", url: "https://www.ssbwiki.com/Bowser_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Bowser is the heaviest character in the game, with immensely powerful attacks and surprisingly good mobility. His playstyle is largely bait-and-punish: he needs only four or five good hits to rack up high damage and score KOs, and his pressure is very hard to break once he is ahead. He lacks options to approach properly or to fight off heavy pressure.",
      },
      traits: [],
      strengths: [{ en: "Endurance among the best in the game, helped by armor and Tough Guy." }, { en: "Among the highest damage output and KO power of any character." }, { en: "Excellent at breaking shields." }, { en: "Flying Slam is the fastest command grab in the game." }],
      weaknesses: [{ en: "A poor disadvantage state: his weight, size and fast falling speed make him easy to combo." }, { en: "Somewhat sluggish frame data, so missed or shielded attacks get punished." }, { en: "No true projectile, so strong zoners and disjointed weapons are hard to approach." }, { en: "His recovery is rather slow and vulnerable to edgeguards." }],
    },
    "bowser-jr": {
      source: { title: "SmashWiki: Bowser Jr. (SSBU)", url: "https://www.ssbwiki.com/Bowser_Jr._(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Bowser Jr. is a heavyweight whose Junior Clown Car has its own hurtbox and takes less damage than he does. He does well with a bait-and-punish playstyle, and he can also pressure opponents with Clown Cannon, Clown Kart Dash and Mechakoopa. His moveset is fully disjointed, but his mobility is somewhat poor except in the air.",
      },
      traits: [],
      strengths: [{ en: "Two good projectiles in Clown Cannon and Mechakoopa." }, { en: "Clown Kart Dash is extremely fast and makes up for his poor approach." }, { en: "Above-average survivability from his heavy weight and the Clown Car." }, { en: "Forward and back aerials are great for edgeguarding, spacing and KOing." }],
      weaknesses: [{ en: "After Abandon Ship!, any weak hit leaves him without the Clown Car and very vulnerable." }, { en: "A poor out-of-shield game." }, { en: "Very few reliable KO options, and those have considerable ending lag." }, { en: "Takes more damage when he is hit instead of the Clown Car, and is vulnerable to grabs." }],
    },
    "byleth": {
      source: { title: "SmashWiki: Byleth (SSBU)", url: "https://www.ssbwiki.com/Byleth_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Byleth is a tall, middleweight swordsman with poor mobility, long range and very strong but slow attacks. He plays best at mid-range, using his four weapons to zone opponents out. His game plan is very patient: learn the opponent's habits, then cover their options and punish mistakes with hard-hitting moves.",
      },
      traits: [],
      strengths: [{ en: "Long, disjointed range across his weapons." }, { en: "Very strong attacks for a middleweight, with many KO options." }, { en: "His up special is a very long tether recovery that can also meteor smash." }, { en: "Up aerial drags opponents down into extended combos." }],
      weaknesses: [{ en: "Mobility among the worst in the game, so his approach is very committed." }, { en: "Sluggish frame data, with high startup and ending lag on many moves." }, { en: "A lackluster grab game with a rather short grab range." }, { en: "Short horizontal recovery and poor air speed leave him open to gimps." }],
    },
    "captain-falcon": {
      source: { title: "SmashWiki: Captain Falcon (SSBU)", url: "https://www.ssbwiki.com/Captain_Falcon_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Captain Falcon is a tall heavyweight with some of the best overall mobility in the game, pairing speed with power. He is a hit and run character who also plays bait and punish, stringing very long combos for huge damage. His KO moves are hard to land, so he often relies on edgeguarding and needs precise, patient play.",
      },
      traits: [],
      strengths: [{ en: "The second fastest dashing speed and excellent overall mobility." }, { en: "Long combos from grounded Raptor Boost, neutral aerial and up aerial." }, { en: "Excellent KO power, with the strongest forward aerial in the game." }, { en: "Formidable edgeguarding." }],
      weaknesses: [{ en: "His recovery is his biggest flaw: linear and easily intercepted." }, { en: "Most of his KO moves are slow and tough to land." }, { en: "No projectile, which leaves him susceptible to camping." }, { en: "Vulnerable to combos, with little to no fast options to break them." }],
    },
    "corrin": {
      source: { title: "SmashWiki: Corrin (SSBU)", url: "https://www.ssbwiki.com/Corrin_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Corrin is a middleweight swordfighter with below-average mobility who excels at range and spacing. His mostly disjointed, fast moves give him a respectable neutral game, and his quick, long-reaching tilts and aerials rack up damage and juggle well once he is ahead. His special moves add a projectile and ranged kill options.",
      },
      traits: [],
      strengths: [{ en: "Most of his moves are disjointed and fast, giving him strong spacing." }, { en: "Forward smash has incredible range and kills early at the tip." }, { en: "A potent air game for combos, juggling and kills." }, { en: "The fastest dash to shield in the game, which helps against projectiles." }],
      weaknesses: [{ en: "Below-average speed, so he slightly struggles to keep up with fast opponents." }, { en: "A below-average disadvantage state, with committal and laggy landing options." }, { en: "His recovery is fairly linear and hindered by slow air mobility." }, { en: "A below-average grab game with no combo throws." }],
    },
    "daisy": {
      source: { title: "SmashWiki: Daisy (SSBU)", url: "https://www.ssbwiki.com/Daisy_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Daisy is Peach's Echo Fighter and shares her moveset and attributes. She is somewhat light and extremely floaty, with the second-best air acceleration in the game and the ability to float at any height. Her aerial game is one of her greatest strengths: floating low with well-spaced aerials lets her control space and attack shields with little risk.",
      },
      traits: [],
      strengths: [{ en: "Floating lets her control space and attack shields with little fear of punishment." }, { en: "Neutral aerial is fast, damaging and an incredibly good combo tool at lower percents." }, { en: "She can travel a great deal of horizontal distance when recovering." }, { en: "Vegetable is a versatile item projectile." }],
      weaknesses: [{ en: "Susceptible to juggling and vertical combos, and she can have difficulty landing." }, { en: "Her approach suffers against swordfighters and zoners." }, { en: "Her vertical recovery is average at best and predictable." }, { en: "Opponents can pick up her vegetables and use them against her." }],
    },
    "dark-pit": {
      source: { title: "SmashWiki: Dark Pit (SSBU)", url: "https://www.ssbwiki.com/Dark_Pit_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Dark Pit is Pit's Echo Fighter, with identical mobility and standard attacks. Both are traditional all-rounders with a preference for edgeguarding and recovery. His differences are in his special moves: Silver Bow arrows are stronger and faster but fly in a straight line, and Electroshock Arm is a surprise KO and edgeguarding tool.",
      },
      traits: [],
      strengths: [{ en: "Silver Bow arrows deal more damage and knockback than Pit's and can KO offstage when charged." }, { en: "Electroshock Arm is a powerful KO tool, especially at the edges of a stage." }, { en: "Electroshock Arm sends opponents at an effective edgeguarding angle." }],
      weaknesses: [{ en: "Silver Bow arrows can only be shifted slightly, so they are far less useful for sniping offstage." }, { en: "Electroshock Arm is very unsafe on shield." }],
    },
    "dark-samus": {
      source: { title: "SmashWiki: Dark Samus (SSBU)", url: "https://www.ssbwiki.com/Dark_Samus_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Dark Samus is a floaty heavyweight who plays defensively, using her projectiles to space, rack up damage from a distance and pressure shields. She performs best when she spaces with projectiles and her grab aerial to set up combos, then finishes opponents off-stage or with Charge Shot. She rewards patient, calculated play and has a relatively low learning curve.",
      },
      traits: [],
      strengths: [{ en: "A fully charged Charge Shot is a fast, powerful KO option." }, { en: "A strong air game, with back aerial as one of her best moves." }, { en: "Down throw starts combos that deal respectable damage." }, { en: "Grapple Beam has impressive range and doubles as a tether recovery." }],
      weaknesses: [{ en: "A mediocre ground game with punishable smash attacks." }, { en: "Juggled rather easily, with few reliable landing options." }, { en: "Her recovery is slightly slow, linear and predictable." }],
    },
    "diddy-kong": {
      source: { title: "SmashWiki: Diddy Kong (SSBU)", url: "https://www.ssbwiki.com/Diddy_Kong_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Diddy Kong is a small, fast middleweight with a quick, bait-and-punish heavy playstyle. He controls the neutral game with his Banana Peel and great ground moves, then punishes mistakes by juggling opponents or getting them offstage. His very fast moves give him a strong, flexible combo game, though his air mobility is lacking.",
      },
      traits: [],
      strengths: [{ en: "Very fast walk and run speeds, and very fast frame data." }, { en: "A strong, flexible combo game with many reliable combo starters." }, { en: "Banana Peel trips opponents, setting up combos and KO confirms into smash attacks." }, { en: "Monkey Flip works as a movement option, an approach and a horizontal recovery." }],
      weaknesses: [{ en: "A lackluster disadvantage state, made worse by his poor air mobility." }, { en: "A predictable recovery, and a weak hit during Rocketbarrel Boost leaves him helpless." }, { en: "Opponents can catch the Banana Peel and use it against him." }, { en: "A lack of range." }],
    },
    "donkey-kong": {
      source: { title: "SmashWiki: Donkey Kong (SSBU)", url: "https://www.ssbwiki.com/Donkey_Kong_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Donkey Kong is a large super-heavyweight and one of the fastest heavy characters, in both mobility and attack speed. KOing and pressuring opponents are his biggest strengths, backed by high power, fairly long range and a grab game built around his cargo throws. He has to use his power and range to limit opponents' approaches.",
      },
      traits: [],
      strengths: [{ en: "Excellent kill power from many strong moves with decent range." }, { en: "Some of the best overall endurance in the game." }, { en: "Fast mobility for a heavy character." }, { en: "A long grab and cargo throws that lead to combos and KOs." }],
      weaknesses: [{ en: "His size makes him vulnerable to combos and juggling, with few combo breakers." }, { en: "An extremely poor recovery, with almost no vertical distance from Spinning Kong." }, { en: "Ending lag makes many of his moves punishable." }, { en: "With no projectiles, he has frequent trouble against disjointed attacks." }],
    },
    "duck-hunt": {
      source: { title: "SmashWiki: Duck Hunt (SSBU)", url: "https://www.ssbwiki.com/Duck_Hunt_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Duck Hunt are a lightweight duo with three projectile special moves who excel at zoning and stage control. They control the neutral game by managing themselves and their projectiles at once to create setups, frame traps and pressure. Good air mobility and fast aerials also let them edgeguard, but they rely heavily on crafty use of their projectiles.",
      },
      traits: [],
      strengths: [{ en: "Three versatile projectiles for zoning, setups and stage control." }, { en: "Clay Shooting is their most potent combo starter." }, { en: "Back aerial is a fast, powerful finisher, even deadlier when edgeguarding." }, { en: "Trick Shot can be used as a combo breaker." }],
      weaknesses: [{ en: "Their ground attacks are mediocre, and their dash attack is slow and weak." }, { en: "Low weight and an exploitable recovery hurt their endurance." }, { en: "Their throws do not lead to consistent combos or KO at reasonable percentages." }, { en: "Their smash attacks start slowly and have awkward hitboxes." }],
    },
    "falco": {
      source: { title: "SmashWiki: Falco (SSBU)", url: "https://www.ssbwiki.com/Falco_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Falco is a lightweight with the highest jump in the game and mediocre horizontal movement. He pressures opponents defensively, then capitalises on their errors with strong combos, juggles and edgeguards. He can struggle against opponents who outmaneuver or outrange him, and he has trouble securing KOs.",
      },
      traits: [],
      strengths: [{ en: "Strong combo, juggling and edgeguarding ability, led by his aerials." }, { en: "Up tilt and up throw start combos into any of his aerials." }, { en: "Back aerial is very strong and can reliably KO even from center-stage." }, { en: "Blaster is a fast projectile that pressures and halts approaches." }],
      weaknesses: [{ en: "Vulnerable to combos because of his fast falling speed and lack of reliable escape options." }, { en: "His recovery is very linear, slow and predictable." }, { en: "He struggles to secure KOs, as his strongest moves are also his slowest." }, { en: "Up smash, up tilt and neutral aerial can fail to connect properly." }],
    },
    "fox": {
      source: { title: "SmashWiki: Fox (SSBU)", url: "https://www.ssbwiki.com/Fox_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Fox is a lightweight, hit-and-run glass cannon with excellent ground mobility and fast attacks. He approaches with his movement and attack speed, deals serious damage quickly through combos, and finishes with a handful of fast KO moves. He has to stay unpredictable, because he suffers high-damaging combos and gets KO'd very early himself.",
      },
      traits: [],
      strengths: [{ en: "Incredibly mobile, with the highest falling speed in the game." }, { en: "Nearly all of his moves start quickly, which helps him approach and combo." }, { en: "Great combo potential, including several KO confirms." }, { en: "Up smash is a quick, strong primary KO move." }],
      weaknesses: [{ en: "Very light and fast-falling, so he is comboed easily and KO'd early." }, { en: "His recovery is linear and predictable." }, { en: "He can struggle to KO, as his finishers are hard to land and no throw KOs." }, { en: "Edgeguarding is risky for him." }],
    },
    "ike": {
      source: { title: "SmashWiki: Ike (SSBU)", url: "https://www.ssbwiki.com/Ike_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ike is a tall heavyweight swordsman with great power, long disjointed reach and generally poor mobility. He uses his excellent punish game and spacing tools to overwhelm opponents, racking up large amounts of damage with little warning. Players must be cautious of his susceptibility to combos and his weak recovery.",
      },
      traits: [],
      strengths: [{ en: "Some of the strongest attacks in the game, with fearsome KO potential." }, { en: "Great, disjointed reach throughout his moveset." }, { en: "Neutral aerial is his best combo starter and leads to KO confirms." }, { en: "Aether's descending hit is an incredibly powerful meteor smash." }],
      weaknesses: [{ en: "Slow movement, especially on the ground, so he struggles against quick, agile characters." }, { en: "Some of the worst frame data in the game, with severe ending lag." }, { en: "A terrible disadvantage state, and he is easy to combo and juggle." }, { en: "Linear, predictable recovery moves and no projectiles." }],
    },
    "incineroar": {
      source: { title: "SmashWiki: Incineroar (SSBU)", url: "https://www.ssbwiki.com/Incineroar_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Incineroar is a grappler: a tall super heavyweight and the slowest character in the game, with hard-hitting attacks that are quicker than its movement suggests. It relies on bait-and-punish play to get close, then wins with throws, down tilt and down throw combos, and Revenge-boosted hits. Getting in against opponents who run away is its biggest hurdle.",
      },
      traits: [],
      strengths: [{ en: "One of the best sets of throws in the game, with a KO throw for any situation." }, { en: "Fast attacks for their damage, and weaker moves that start combos reliably." }, { en: "Revenge stores a power boost that makes its next hit extremely strong." }, { en: "Heavy weight, fast falling speed and high gravity give it impressive endurance." }],
      weaknesses: [{ en: "The slowest walking and dashing speeds in the game and no projectile make it easy to zone out." }, { en: "Its recovery is linear and predictable, and very vulnerable without its double jump." }, { en: "Poor disadvantage state: its few escape options are easy to predict and punish." }, { en: "KO power is inconsistent and leans on throws, sweetspots and Alolan Whip." }],
    },
    "isabelle": {
      source: { title: "SmashWiki: Isabelle (SSBU)", url: "https://www.ssbwiki.com/Isabelle_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Isabelle is a short, floaty lightweight with slow overall mobility and quick, disjointed ground moves. She is a risk-averse character built around stage control: she plants Lloid Trap to cover options at the ledge, edgeguards with her slingshot aerials and Fishing Rod, and uses Pocket to discourage projectile camping. Many of her strengths depend on already being in an advantageous position.",
      },
      traits: [],
      strengths: [{ en: "Edgeguarding is a focal point, with fast and long-ranged aerials and a floaty offstage presence." }, { en: "Lloid Trap makes her ledge trapping strong and can combo into up aerial." }, { en: "Pocket steals an opponent's projectile and sends it back." }, { en: "Balloon Trip and Fishing Rod cover great distance, making her hard to gimp." }],
      weaknesses: [{ en: "Floaty and light, she struggles to land safely and is vulnerable to juggling and early KOs." }, { en: "Balloon Trip has no hitbox and its balloons can be popped, so her recovery is easily edgeguarded." }, { en: "Fishing Rod and Lloid Trap are slow and punishable, and Lloid is easily destroyed." }, { en: "Slow movement, below-average damage output and much weaker zoning than Villager." }],
    },
    "joker": {
      source: { title: "SmashWiki: Joker (SSBU)", url: "https://www.ssbwiki.com/Joker_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Joker is a fast, slender middleweight with quick attacks and a strong, varied combo game. Without Arsène he plays hit-and-run, conditioning opponents to shield and punishing with grab combos to build damage. Taking damage or using Rebel's Guard fills his Rebellion Gauge, which summons Arsène and makes his attacks far stronger, letting him play a rushdown style and KO early.",
      },
      traits: [],
      strengths: [{ en: "Very quick mobility and a thin hurtbox make him hard to hit and hard to punish." }, { en: "Fast frame data and some of the best grab speed give him a strong combo game." }, { en: "Arsène greatly boosts damage, knockback and his special moves, giving a powerful comeback factor." }, { en: "Grappling Hook has very high vertical reach for recovering and for edgeguarding far below the stage." }],
      weaknesses: [{ en: "Without Arsène his hits lack KO power and his knife has short range." }, { en: "He has few ways to deal with projectiles, so projectile pressure troubles him." }, { en: "Grappling Hook lacks horizontal range, and Wings of Rebellion has no hitbox and is easy to intercept." }, { en: "Being hit drains the Rebellion Gauge faster, and he is vulnerable to combos." }],
    },
    "kazuya": {
      source: { title: "SmashWiki: Kazuya (SSBU)", url: "https://www.ssbwiki.com/Kazuya_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Kazuya is a heavy, ground-focused brawler with slow movement and a huge moveset of punches, kicks and throws that deal astounding damage. He is a bait-and-punish character: he closes the gap with tools like his Crouch Dash, then overwhelms the opponent with combo routes and mixups. He has one of the highest technical learning curves in the game.",
      },
      traits: [],
      strengths: [{ en: "Extreme damage from many combo starters, with even simple combos dealing heavy damage." }, { en: "Electric Wind God Fist paralyses opponents for follow-ups and forces them out of shield." }, { en: "Rage raises his damage and gives him Rage Drive, a command grab that KOs early." }, { en: "Several shield-breaking options and ground moves that are safe on shield when spaced." }],
      weaknesses: [{ en: "Very slow movement and slow attack startup limit his approach and make pressure hard to escape." }, { en: "His weight and height make him very susceptible to combos, and his out-of-shield game is lackluster." }, { en: "Poor horizontal recovery: very slow air speed and a short, laggy Devil Fist." }, { en: "Precise inputs and timings make him prone to misinputs and take a lot of practice." }],
    },
    "ken": {
      source: { title: "SmashWiki: Ken (SSBU)", url: "https://www.ssbwiki.com/Ken_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ken is a combo-oriented heavyweight with fearsome offence. Tapped attacks start combos and held attacks finish them, and many of his moves can be cancelled into special moves such as Shoryuken for KOs. He has to play patiently and take advantage of any opening, and his command inputs take much practice to use reliably.",
      },
      traits: [],
      strengths: [{ en: "A very effective punish game: almost any hit leads to heavy damage or a KO." }, { en: "Strong shield pressure from lengthy blockstrings and moves that deal heavy shield damage." }, { en: "Shoryuken is both a powerful KO option and a potent anti-air." }, { en: "Long-distance recovery and good ways to escape combos, unusual for a heavyweight." }],
      weaknesses: [{ en: "Slow walking speed, short range and fixed-arc jumps make his approach predictable and weak against camping." }, { en: "Recovering from below the stage is difficult, as Shoryuken is almost strictly vertical and easy to interrupt." }, { en: "His grab game is lacking: no throw has effective follow-up or KO potential." }, { en: "KOs rely heavily on executing combos, and a slipped input can be costly." }],
    },
    "kirby": {
      source: { title: "SmashWiki: Kirby (SSBU)", url: "https://www.ssbwiki.com/Kirby_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Kirby is a small, slow and floaty lightweight with very quick attacks and a strong combo game. He is a glass cannon: he deals impressive damage once he is close, but getting close is hard because of his poor approach. He works well with a bait-and-punish style, and Inhale lets him copy an opponent's neutral special.",
      },
      traits: [],
      strengths: [{ en: "Quick attacks, with tilts among the fastest in the game, and high combo potential." }, { en: "Small size and a very low crouch make him hard to hit and let him avoid most grabs." }, { en: "Smash attacks with good range, high power and great speed for scoring KOs." }, { en: "Five midair jumps and Final Cutter give his recovery good stalling and decent safety." }],
      weaknesses: [{ en: "Poor approach: fast characters, projectile campers and long disjointed attacks can wall him out." }, { en: "Poor endurance, as his low weight means he is KO'd earlier." }, { en: "Slow falling and air speeds leave him vulnerable to juggling." }, { en: "His special moves are laggy and situational." }],
    },
    "link": {
      source: { title: "SmashWiki: Link (SSBU)", url: "https://www.ssbwiki.com/Link_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Link is a heavyweight swordsman and a flexible zoner with powerful attacks and long range from the Master Sword. He plays somewhat defensively for much of the match behind his arrows, Boomerang and Remote Bomb, then closes in at the right time with strong out-of-shield options and KO power. He should not be played recklessly, as faster characters can shut down his options.",
      },
      traits: [],
      strengths: [{ en: "Three projectiles: Bow and Arrows, Boomerang and Remote Bomb, which also start combos." }, { en: "Long sword range and smash attacks that all deal high damage and knockback." }, { en: "Reliable KO aerials, including a down aerial meteor smash that KOs very early." }, { en: "The Hylian Shield blocks projectiles while he stands still, walks or crouches." }],
      weaknesses: [{ en: "Generally poor mobility, with a sluggish dash and very poor air speed and air acceleration." }, { en: "His recovery is held back by low jumps, a high falling speed and no tether." }, { en: "Below-average frame data lets faster characters make it hard to use his options." }],
    },
    "little-mac": {
      source: { title: "SmashWiki: Little Mac (SSBU)", url: "https://www.ssbwiki.com/Little_Mac_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Little Mac is a lightweight boxer with a simple but polarized style: excellent on the ground and poor in the air. He plays a defensive bait-and-punish game, holding the middle of the stage, staying grounded as much as possible and using his speed to punish mistakes. His severe disadvantage state means he has to be played extremely carefully.",
      },
      traits: [],
      strengths: [{ en: "Very fast ground movement, with the 3rd fastest dashing speed and the fastest rolls and sidestep." }, { en: "Fast, powerful ground attacks, including a neutral attack tied for the fastest move in the game." }, { en: "Smash attacks have super armor, letting him take a hit and retaliate." }, { en: "A full Power Meter gives him KO Uppercut, which is unblockable and KOs extremely early." }],
      weaknesses: [{ en: "One of the worst recoveries in the game, and very easy to gimp and edgeguard." }, { en: "His aerials have short range, poor damage and awful KO potential." }, { en: "Very vulnerable to combos and juggling, so one mistake can cost him a stock." }, { en: "No projectile, short range and low jumps make camping and platform camping hard to deal with." }],
    },
    "lucario": {
      source: { title: "SmashWiki: Lucario (SSBU)", url: "https://www.ssbwiki.com/Lucario_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucario is a somewhat floaty middleweight built around Aura, which makes its attacks stronger the more damage it has taken and when it is behind in stocks. This makes it a very high-risk, high-reward character that is most powerful when most vulnerable. It can stay in the air for a long time and has versatile special moves, including Aura Sphere.",
      },
      traits: [],
      strengths: [{ en: "Aura lets it KO very early and come back when it has taken a lot of damage." }, { en: "Versatile specials: a chargeable projectile, a command grab in Force Palm and a strong counter in Double Team." }, { en: "Good edgeguarding, with very high air speed and one of the safest neutral aerials in the game." }, { en: "Disjointed smash attacks and aerials that serve as KO options." }],
      weaknesses: [{ en: "At low damage Aura weakens its attacks, so it must win neutral many times." }, { en: "Aura makes its combos and KO confirms inconsistent as knockback keeps changing." }, { en: "Somewhat sluggish attacks hinder its approach." }, { en: "Extreme Speed is slow to start, does not always grab the ledge and can overshoot." }],
    },
    "lucas": {
      source: { title: "SmashWiki: Lucas (SSBU)", url: "https://www.ssbwiki.com/Lucas_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucas is a middleweight mix-up character with slow walking speed, fast air speed and quick, low-lag attacks. He can zone with PK Fire, forward aerial and his Rope Snake, or fight up close with dangerous combos and strong KO moves. He aims to force opponents offstage and finish them with one of the best edgeguarding games in the game.",
      },
      traits: [],
      strengths: [{ en: "Extremely dangerous edgeguarding with PK Freeze, PK Thunder, PSI Magnet and down smash." }, { en: "One of the longest and most flexible recoveries in the game." }, { en: "An excellent combo game built on moves that loop into themselves." }, { en: "Some of the most powerful smash attacks and throws for early KOs." }],
      weaknesses: [{ en: "A horrible defensive game, with out of shield options among the worst in the cast." }, { en: "Floaty with no good hitbox under him, so he is extremely susceptible to juggling." }, { en: "He over-relies on a few zoning moves, so his approach becomes predictable." }, { en: "His grab is slow and punishable, and his combos are very hard to master." }],
    },
    "lucina": {
      source: { title: "SmashWiki: Lucina (SSBU)", url: "https://www.ssbwiki.com/Lucina_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Lucina is Marth's Echo Fighter: a tall, rather light middleweight swordfighter with the fastest walking speed in the game. Her sword has no tipper, so it deals the same damage along the whole blade. That makes her a lower-risk version of Marth who can play more aggressively, rack up damage with combos and KO reliably without precise spacing.",
      },
      traits: [],
      strengths: [{ en: "Consistent damage and knockback across her blade give her reliable KOs and a strong up-close game." }, { en: "Above-average mobility and frame data, with good range for spacing." }, { en: "Strong juggling and edgeguarding." }, { en: "Dolphin Slash is fast and intangible on startup, working as recovery, combo breaker and out of shield option." }],
      weaknesses: [{ en: "She struggles to escape juggles, with a tall hurtbox, low gravity and laggy aerials." }, { en: "Lackluster grab game: her throws cannot KO at realistic percents and combo little." }, { en: "No projectile, so projectile-heavy characters can give her trouble." }, { en: "Her recovery is linear and predictable, and dangerous without her double jump or air dodge." }],
    },
    "luigi": {
      source: { title: "SmashWiki: Luigi (SSBU)", url: "https://www.ssbwiki.com/Luigi_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Luigi is a floaty middleweight with sluggish mobility, especially in the air, but some of the fastest attacks in the game. He fights at close quarters, where his tether grab and down throw lead into devastating combos and KO setups. He tends to run hot and cold, so mastering his combos and recovery mix-ups is crucial.",
      },
      traits: [],
      strengths: [{ en: "Outstanding frame data makes him very difficult to punish and gives him an excellent punish game." }, { en: "Down throw starts highly damaging combos and sets up KOs, even zero-to-death combos." }, { en: "A fantastic set of fast, low-lag aerials." }, { en: "Fast smash attacks that are strong enough to be reliable finishers." }],
      weaknesses: [{ en: "The 2nd slowest air speed and floaty physics make landing hard and leave him open to juggling." }, { en: "Well below-average range makes it hard to approach ranged or disjointed attacks." }, { en: "No reflector, so projectile camping is hard for him to deal with." }, { en: "His recovery is long but linear, slow, predictable and easy to gimp." }],
    },
    "mario": {
      source: { title: "SmashWiki: Mario (SSBU)", url: "https://www.ssbwiki.com/Mario_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mario is a short middleweight with balanced attributes and very quick attacks. Although his stats suggest a jack-of-all-trades, in practice he is more of a rushdown character who shines in close-quarters combat, applying constant pressure and racking up damage with combos. His low range means he must almost always fight up close and often relies on reads to secure KOs.",
      },
      traits: [],
      strengths: [{ en: "Very quick attacks with low lag give him a great neutral game and constant pressure." }, { en: "Fantastic combo ability from many combo starters, including up tilt, down tilt and his throws." }, { en: "Grabs tied for the fastest in the game, and one of the strongest back throws." }, { en: "Versatile edgeguarding with Cape, F.L.U.D.D. and fast aerials; Cape also reflects projectiles." }],
      weaknesses: [{ en: "Poor range forces him to approach and makes him struggle against large or disjointed attacks." }, { en: "Few strong, reliable finishers, so he leans on forward smash, up smash or reads." }, { en: "His recovery is predictable and easy to gimp, especially without his double jump." }, { en: "Slow, predictable ledge options leave him vulnerable to ledge-trapping." }],
    },
    "marth": {
      source: { title: "SmashWiki: Marth (SSBU)", url: "https://www.ssbwiki.com/Marth_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Marth is a low-middle weight swordfighter with high mobility and the fastest walking speed in the game. His playstyle revolves around spacing: the tip of his sword deals much more damage and knockback, while the weaker inner part of the blade sets up combos and tech-chases. One well-spaced hit can end an opponent's stock very early, especially near the edge.",
      },
      traits: [],
      strengths: [{ en: "Tippered attacks have impressive damage and knockback and can KO very early." }, { en: "High mobility, long disjointed range and above-average frame data." }, { en: "Strong juggling and edgeguarding with fast, wide attacks." }, { en: "Dolphin Slash is an excellent out-of-shield option, combo breaker and KO move." }],
      weaknesses: [{ en: "Extreme reliance on tippers and spacing makes his KO power inconsistent and his up-close game subpar." }, { en: "He struggles to escape juggles, with a tall hurtbox, low gravity and laggy aerials." }, { en: "Weak throws that cannot KO at realistic percents and are poor for combos." }, { en: "No projectile, and a linear, predictable recovery that is dangerous without his double jump." }],
    },
    "mega-man": {
      source: { title: "SmashWiki: Mega Man (SSBU)", url: "https://www.ssbwiki.com/Mega_Man_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mega Man is a short heavyweight and a versatile, medium-ranged projectile fighter. He spaces opponents with his Mega Buster shots, Metal Blade and Crash Bomber, punishes their reactions with grabs to rack up damage, and keeps his distance until they are weak enough for one of his slow but powerful finishers. He has to be patient and wait for an opening.",
      },
      traits: [],
      strengths: [{ en: "A fantastic spacer whose projectiles make him difficult to approach." }, { en: "Metal Blade and Crash Bomber force predictable reactions that lead to grab punishes." }, { en: "A great grab and throw game, with a fast grab, combo throws and a strong back throw." }, { en: "Fairly heavy, with a good recovery move in Rush Coil that does not leave him helpless." }],
      weaknesses: [{ en: "Reflectors and moves like Pocket make his projectiles ineffective." }, { en: "He lacks quick close-range attacks to keep nearby opponents away." }, { en: "Most of his strongest attacks are slow to start or end, making finishers risky and predictable." }],
    },
    "meta-knight": {
      source: { title: "SmashWiki: Meta Knight (SSBU)", url: "https://www.ssbwiki.com/Meta_Knight_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Meta Knight is a small, fast swordsman with multiple jumps whose playstyle relies heavily on speed. He applies constant close-range pressure with quick, low-lag aerials, racks up damage through combos, then keeps opponents in disadvantage with juggles and edge-guards. He must be patient in finding openings, as he cannot take much damage and can struggle to land his finishers.",
      },
      traits: [],
      strengths: [{ en: "Strong mobility and fast attacks let him keep up close-range pressure." }, { en: "Arguably the best recovery in the game, with five jumps and four special moves that help him recover." }, { en: "Aerials well suited to edge-guarding and chasing opponents offstage." }, { en: "Several quick options to relieve pressure, such as forward tilt, neutral aerial and down aerial." }],
      weaknesses: [{ en: "His attacks have very few active frames, so he must be extremely precise." }, { en: "Highly vulnerable to combos and light, giving him poor overall endurance." }, { en: "He has difficulty landing his finishing moves." }, { en: "No projectile, which hurts against zoning characters." }],
    },
    "mii-brawler": {
      source: { title: "SmashWiki: Mii Brawler (SSBU)", url: "https://www.ssbwiki.com/Mii_Brawler_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mii Brawler is the up-close Mii Fighter: a nimble middleweight with good walking and dashing speed, quick attacks and great combo potential. They are a jack-of-all-trades hand-to-hand fighter, and the player picks their special moves from twelve options, so the same character can follow several different gameplans and be adjusted to suit the opponent.",
      },
      traits: [],
      strengths: [{ en: "Quick, low-lag tilts and aerials with great combo potential." }, { en: "Many moves with high KO potential, including forward smash, up smash and several specials." }, { en: "Excellent defensive tools, with all three up specials working well out of shield." }, { en: "A diverse choice of special moves makes them unpredictable to fight." }],
      weaknesses: [{ en: "Poor range and no tools to force approaches, so approaching takes hard commitments." }, { en: "Low survivability, with a fast falling speed that makes them susceptible to combos." }, { en: "No reliable kill confirms at high percents, and many KO options are laggy or short-ranged." }, { en: "Limited off-stage presence because of their fast fall speed." }],
    },
    "mii-gunner": {
      source: { title: "SmashWiki: Mii Gunner (SSBU)", url: "https://www.ssbwiki.com/Mii_Gunner_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mii Gunner is the slow, durable, projectile-heavy Mii Fighter. They are a zoner who excels at walling out opponents, racking up damage and edgeguarding from a distance, while struggling up close. The player picks their special moves from twelve options, allowing several playstyles. They must be careful, as one mistake can cost them a huge chunk of damage.",
      },
      traits: [],
      strengths: [{ en: "Many projectile specials for stopping approaches, building damage, edgeguarding and pressuring shields from afar." }, { en: "A fully charged Charge Blast is a quick, powerful and very consistent KO option." }, { en: "Forward smash and up aerial are among the longest-ranged moves in the game." }, { en: "Heavy weight and long-distance recoveries like Arm Rocket help them survive to higher percentages." }],
      weaknesses: [{ en: "Terrible mobility, with dashing and air speeds among the slowest in the game." }, { en: "Most long-ranged or powerful moves are very laggy, and the fast ones lack range and KO power." }, { en: "They struggle to get reliable KOs outside of a fully charged Charge Blast." }, { en: "Their heavy weight makes them very easy to combo." }],
    },
    "mii-swordfighter": {
      source: { title: "SmashWiki: Mii Swordfighter (SSBU)", url: "https://www.ssbwiki.com/Mii_Swordfighter_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mii Swordfighter is an average-height, medium-weight sword user with fairly average movement and a relatively high air speed. They excel in mid-to-close range combat, walling opponents out with projectiles like Gale Strike and Chakram and turning hits into kill confirms. The player picks their special moves from twelve options, allowing several different playstyles.",
      },
      traits: [],
      strengths: [{ en: "Versatile specials, with Gale Strike and Chakram being strong projectiles that set up kill confirms." }, { en: "The only swordfighter with a reflector, in Reversal Slash." }, { en: "An above-average aerial game, with down throw leading reliably into most aerials." }, { en: "Flexible recovery options, arguably the best of the three Mii Fighters." }],
      weaknesses: [{ en: "One of the worst disjoints among swordfighters, with short range on many attacks." }, { en: "Average mobility makes it hard to keep up with faster, rushdown characters." }, { en: "Smash attacks are all very laggy with generally poor reach." }, { en: "A subpar grab game: besides down throw, the throws offer little utility or KO power." }],
    },
    "min-min": {
      source: { title: "SmashWiki: Min Min (SSBU)", url: "https://www.ssbwiki.com/Min_Min_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Min Min is a slow heavyweight who mixes zoning with aggressive long-ranged punches. Her two ARMS attack separately, even in different directions, and ARMS Change swaps her right ARM between Ramram, Megawatt and Dragon. She pressures and combos from far away, but her hitboxes sit only on her fists, so she needs precise spacing and has a high learning curve.",
      },
      traits: [],
      strengths: [{ en: "Her punches have the most melee range of any attack in the game and cannot be reflected." }, { en: "She can pressure and string hits together from afar with little risk of retaliation." }, { en: "A deadly edge-guarding game: horizontal recoveries risk being KO'd very early." }, { en: "Fast up smash and up tilt give strong anti-air and out of shield options; up smash also reflects." }],
      weaknesses: [{ en: "Hitboxes are only on her fists, so opponents can close in after a mistimed punch." }, { en: "Her close-range moves have notable end lag, so fast characters are particularly difficult to fight." }, { en: "A very poor disadvantage state: almost no combo breakers and prone to being juggled." }, { en: "Her tether recovery only works close to an edge, and her air speed is abysmal." }],
    },
    "mr-game-and-watch": {
      source: { title: "SmashWiki: Mr. Game & Watch (SSBU)", url: "https://www.ssbwiki.com/Mr._Game_%26_Watch_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Mr. Game & Watch is a short, very light glass cannon. He deals extremely high damage through combos and juggles, has powerful KO moves in his smash attacks and Oil Panic, and is deadly offstage and at the ledge. In exchange he is very fragile, with a mediocre approach and mediocre defensive options.",
      },
      traits: [],
      strengths: [{ en: "All of his smash attacks have very high power and low ending lag." }, { en: "Fire is a fantastic recovery, a combo breaker and the best out of shield option in the game." }, { en: "A formidable edgeguarder with large, long-lasting, disjointed aerials and Chef." }, { en: "Oil Panic absorbs energy projectiles, reflects items and can become a lethal finisher." }],
      weaknesses: [{ en: "Tied for the third lightest character, with terrible horizontal and vertical endurance." }, { en: "Mediocre overall range, so sword characters can keep him out and stop his approaches." }, { en: "A somewhat lackluster neutral game and a rather poor approach." }, { en: "His throws do not KO until very high percents, and his dodges and rolls are slow and short." }],
    },
    "ness": {
      source: { title: "SmashWiki: Ness (SSBU)", url: "https://www.ssbwiki.com/Ness_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ness is a small middleweight and something of a glass cannon, with poor ground movement but outstanding aerial movement. He excels in most offensive parts of the game, using strong aerials, an outstanding grab game and three projectiles to juggle, edgeguard and KO. He suffers in certain defensive situations, especially when put offstage or high above his opponent.",
      },
      traits: [],
      strengths: [{ en: "One of the best sets of aerial attacks in the game." }, { en: "An outstanding grab game, with back throw the most consistent kill throw in the game." }, { en: "Three projectiles with many uses, including juggling, edgeguarding and recovery." }, { en: "His up and down smashes can hang below the stage, making edgeguarding easy." }],
      weaknesses: [{ en: "His recovery is his most glaring weakness, as PK Thunder is quite exploitable." }, { en: "Floaty with no reliable landing options, so he is vulnerable to juggling." }, { en: "Slightly vulnerable to camping, especially against non-energy projectiles." }, { en: "Characters with larger disjoints can stuff out his attacks." }],
    },
    "olimar": {
      source: { title: "SmashWiki: Olimar (SSBU)", url: "https://www.ssbwiki.com/Olimar_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Olimar is a small, floaty lightweight and a versatile zoner who fights in an unorthodox way. His stronger attacks come from up to three Pikmin, which act as disjointed attacks and projectiles, and each colour has different properties. He racks up damage mainly with Pikmin Throw and has to cycle and manage his Pikmin carefully, so he cannot afford to be reckless.",
      },
      traits: [],
      strengths: [{ en: "Pikmin Throw has excellent utility and is his primary way to rack up damage." }, { en: "Pikmin give him relatively long, disjointed range for a character of his size." }, { en: "Throws are disproportionately powerful with Blue Pikmin, and down throw leads to big damage." }, { en: "Winged Pikmin is a very flexible recovery option." }],
      weaknesses: [{ en: "He lacks defense without his Pikmin, and his own physical attacks have very short range." }, { en: "Below-average dashing and air speeds let rushdown fighters overwhelm him in disadvantage." }, { en: "Reflectors severely hinder him, since Pikmin Throw and all his smash attacks are projectiles." }, { en: "His recovery gets noticeably worse while he is carrying Pikmin." }],
    },
    "pac-man": {
      source: { title: "SmashWiki: Pac-Man (SSBU)", url: "https://www.ssbwiki.com/Pac-Man_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pac-Man is a rather floaty middleweight who relies on his item-producing special moves, Bonus Fruit and Fire Hydrant, to control the flow of a battle. He excels at mind games and racking up damage, using traps and zoning to keep dealing damage and set up a KO. One careless move can turn his own items against him.",
      },
      traits: [],
      strengths: [{ en: "Bonus Fruit and Fire Hydrant give him mix-ups for almost any situation." }, { en: "A good combo game with fast tilts and aerials that chain into themselves." }, { en: "Pac-Jump is an effective vertical recovery that is difficult to gimp and works out of shield." }, { en: "A rather long-range grab, with up throw combos and a back throw that can KO." }],
      weaknesses: [{ en: "He struggles to KO early because most of his moves have low base knockback." }, { en: "His smash attacks are slow, punishable and predictable." }, { en: "All of his special moves can be used against him by opponents." }, { en: "Average range and below-average mobility make it hard to deal with long-range and rushdown characters." }],
    },
    "peach": {
      source: { title: "SmashWiki: Peach (SSBU)", url: "https://www.ssbwiki.com/Peach_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Peach is a somewhat light, technical character with slow ground movement, an extremely slow falling speed and a unique floating ability. She is built around her fantastic air game: floating low to the ground lets her attack shields safely, outmaneuver opponents and start devastating set-ups. She needs to keep moving between ground and air to avoid being punished for simple mistakes.",
      },
      traits: [],
      strengths: [{ en: "Floating lets her hover at any height, giving safe pressure and unpredictable mixups." }, { en: "Solid aerial attacks, with neutral aerial an incredibly good combo tool." }, { en: "Float and Peach Bomber give her a great deal of horizontal recovery distance." }, { en: "Vegetable gives her a versatile throwable projectile." }],
      weaknesses: [{ en: "Faster opponents can overwhelm her before she can defend herself." }, { en: "Her floatiness makes landing difficult and leaves her open to juggling and vertical combos." }, { en: "Her approach suffers against swordfighters and zoners." }, { en: "Her vertical recovery is average and predictable, and opponents can pick up her vegetables." }],
    },
    "pichu": {
      source: { title: "SmashWiki: Pichu (SSBU)", url: "https://www.ssbwiki.com/Pichu_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pichu is a quintessential glass cannon: the lightest character in the game, very small and quick, with fast, hard-hitting attacks. Its electric attacks deal recoil damage to itself, so they must be used mindfully. It can play defensively with a bait-and-punish style or switch to aggressive rushdown, and can end stocks very quickly.",
      },
      traits: [],
      strengths: [{ en: "Very fast attacks and a strong combo game that deals high damage." }, { en: "One of the best advantage states in the game, with aerials that edgeguard well." }, { en: "Great mobility, a tiny size and Thunder Jolt give it an impressive neutral game." }, { en: "Skull Bash and Agility give it a long-distance, unpredictable recovery." }],
      weaknesses: [{ en: "The lightest character in the game, so a decently strong stray hit can KO it." }, { en: "Its electric attacks deal recoil damage that adds up quickly." }, { en: "Deceptively short range forces it to fight very close to the opponent." }, { en: "Fast falling speed and high gravity leave it vulnerable to combos." }],
    },
    "pikachu": {
      source: { title: "SmashWiki: Pikachu (SSBU)", url: "https://www.ssbwiki.com/Pikachu_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pikachu is a small, fast lightweight with very quick attacks and an exceptional neutral game. It uses Thunder Jolt to help it approach, then racks up damage with long aerial combos that drag opponents down, and it is dominant at edgeguarding. Its short range and light weight mean it has to work for its KOs.",
      },
      traits: [],
      strengths: [{ en: "Fast, low-lag aerials make it excellent at combos and edgeguarding." }, { en: "Quick Attack gives it a long, hard-to-edgeguard recovery and an easy escape from disadvantage." }, { en: "Its small size, light weight and fast air dodge make it very hard to combo." }, { en: "Down throw starts combos into Thunder and all of its aerials." }],
      weaknesses: [{ en: "Almost all of its normal attacks have poor range." }, { en: "It gets KO'd relatively early because of its light weight." }, { en: "Its raw KO power is inconsistent, and most of its KO moves only work late." }, { en: "Its multihit aerials lose trades, dealing little damage while it takes the full hit." }],
    },
    "pit": {
      source: { title: "SmashWiki: Pit (SSBU)", url: "https://www.ssbwiki.com/Pit_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pit is a balanced, beginner-friendly middleweight with fast attacks, three double jumps and no glaring strengths or weaknesses. He keeps opponents at a disadvantage with long-reaching ground moves, aerials and the Palutena Bow, racking up damage over time. He usually has to spend longer building damage before he can score a KO.",
      },
      traits: [],
      strengths: [{ en: "Most of his standard moves start quickly, which makes him easy to use." }, { en: "Palutena Bow is a fast, steerable projectile that is great for camping and edgeguarding." }, { en: "Power of Flight covers an impressive distance and can be angled." }, { en: "Down throw combos into up smash or any of his aerials." }],
      weaknesses: [{ en: "KO potential is his most noticeable weakness; only forward smash and up smash are consistently effective." }, { en: "He is floaty and struggles to land or escape juggles, as his aerials cover him poorly." }, { en: "His recovery is linear and predictable, and Power of Flight has no hitbox to protect him." }, { en: "Most characters outperform him in one area or another." }],
    },
    "pyra-and-mythra": {
      source: { title: "SmashWiki: Pyra (SSBU) and Mythra (SSBU)", url: "https://www.ssbwiki.com/Aegis", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Pyra and Mythra are two halves of one fighter, the Aegis, and their down special, Swap, switches between them. Mythra is the faster half: a very quick, offense-oriented swordswoman with far better mobility and less ending lag, who excels at whiff punishing, tech-chasing, combos and stage control, but has weaker attacks and shorter range. Pyra is the stronger half: slow and hard-hitting, with long, disjointed range, who excels at punishing. Mythra suits the neutral game and horizontal recovery; Pyra brings the stronger punishes and KOs.",
      },
      traits: [],
      strengths: [{ en: "Pyra has vastly superior KO potential, damage output and range, with strong smash attacks, tilts and aerials." }, { en: "Almost all of her standard attacks are disjointed, and her forward smash reaches very far." }, { en: "Prominence Revolt works exceptionally well out of shield thanks to its range and power." }, { en: "Swap lets her switch to Mythra and change playstyles on the fly." }, { en: "Mythra has the fastest initial dash in the game, and some of the fastest dashing, walking and air speeds." }, { en: "Mythra's tilts are very quick and start or extend combos, and her neutral attack comes out on frame 2." }, { en: "Foresight: when Mythra dodges just before being hit, she takes about half the damage and no knockback, and the opponent is slowed, which gives her a free punish." }, { en: "Photon Edge is a burst option that is difficult to challenge, and it also works as a horizontal recovery." }],
      weaknesses: [{ en: "Pyra's mobility is very slow, so her approach is limited even against shorter-ranged characters." }, { en: "High end lag makes her moves punishable after a single mistake." }, { en: "Prominence Revolt covers very little horizontal distance, which makes recovering difficult." }, { en: "She is easy to combo and lacks safe ways to interrupt combos." }, { en: "Mythra severely lacks KO options and her damage output is very poor; her smash attacks only KO at moderately high percents." }, { en: "Mythra's recovery is very exploitable: Ray of Punishment is almost strictly vertical, and Photon Edge leaves her helpless." }, { en: "Foresight also gives Mythra the slowest dodges in the game, which leaves her open to grabs." }, { en: "Most of Mythra's moves are unsafe on shield unless they are spaced properly." }],
    },
    "richter": {
      source: { title: "SmashWiki: Richter (SSBU)", url: "https://www.ssbwiki.com/Richter_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Richter is Simon's Echo Fighter and shares his gameplan: a zoner with poor mobility, especially in the air. He keeps opponents at a distance with the very long, disjointed Vampire Killer whip and three projectiles, the Axe, Cross and Holy Water. He must space his attacks to land the strong tip of the whip.",
      },
      traits: [],
      strengths: [{ en: "The Vampire Killer whip gives him extremely long disjointed range on the ground and in the air." }, { en: "Axe, Cross and Holy Water are effective for edgeguarding, ledge-trapping and setting up combos or KOs." }, { en: "Down aerial is a very effective combo tool that leads into Uppercut for KOs." }, { en: "Uppercut is a very fast out of shield option with decent kill power." }],
      weaknesses: [{ en: "His recovery is extremely poor, among the worst in the game, so he is easy to gimp." }, { en: "He is easy to combo and lacks effective combo breakers." }, { en: "Poor frame data gives him a mediocre close-range game." }, { en: "His projectiles can be reflected, and Holy Water can be caught and used against him." }],
    },
    "rosalina-and-luma": {
      source: { title: "SmashWiki: Rosalina & Luma (SSBU)", url: "https://www.ssbwiki.com/Rosalina_%26_Luma_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Rosalina is a tall, floaty lightweight who fights alongside Luma as a tag team. Luma can attack next to her or be sent away with Luma Shot to attack from a distance, letting them bounce opponents between each other. They are largely defensive, relying on aerial bait-and-punish and grounded keep-away, and have a high learning curve.",
      },
      traits: [],
      strengths: [{ en: "Luma can attack from across the stage, giving the pair the largest range in the roster." }, { en: "Their disjointed aerials are good for racking up damage, juggling and edge-guarding." }, { en: "Gravitational Pull nullifies projectiles, shutting down projectile-reliant playstyles." }, { en: "Launch Star is one of the longest and fastest-traveling recovery moves in the game." }],
      weaknesses: [{ en: "Rosalina is drastically weakened without Luma, and a new Luma takes time to appear." }, { en: "Her tall frame and light weight make her easy to hit and KO early." }, { en: "Her disadvantage state is extremely poor, as she handles juggling badly." }, { en: "Characters with swords or other long disjointed attacks outrange both her and Luma." }],
    },
    "ryu": {
      source: { title: "SmashWiki: Ryu (SSBU)", url: "https://www.ssbwiki.com/Ryu_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Ryu is a combo-oriented heavyweight with mostly average attributes and effectively two movesets: tapped attacks start combos, while held attacks and command-input specials finish them. He plays patiently, waits for openings and punishes hard with true combos and shield pressure. He can also play a more zoning-based style with Hadoken, and has a high learning curve.",
      },
      traits: [],
      strengths: [{ en: "Tapped and held versions of his attacks give him potent true combos and mix-ups." }, { en: "His punish game is very strong, racking up damage or KOing after almost any hit." }, { en: "Focus Attack gives him armor against a single hit and works as a combo breaker." }, { en: "He has a long-distance recovery and is surprisingly difficult to combo for a heavyweight." }],
      weaknesses: [{ en: "Very slow walking speed and short range make it hard for him to find openings." }, { en: "His vertical recovery is easy to predict and interrupt." }, { en: "His grab game is poor, with no effective follow-ups or KO throws." }, { en: "He struggles to KO without combos, and a slip of the hand can produce the wrong move." }],
    },
    "sephiroth": {
      source: { title: "SmashWiki: Sephiroth (SSBU)", url: "https://www.ssbwiki.com/Sephiroth_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sephiroth is a tall, lightweight swordfighter who plays as a slow, long-ranged glass cannon. He pokes and spaces with the Masamune's immense reach and projectiles like Shadow Flare, making it hard for opponents to approach. After taking enough damage he gains Winged Form, which boosts his damage and mobility. He has a high learning curve.",
      },
      traits: [],
      strengths: [{ en: "The Masamune gives him among the longest overall range in the game." }, { en: "Winged Form adds a third jump, more damage, much higher mobility and armor on smash attacks." }, { en: "Shadow Flare and Flare, Megaflare and Gigaflare are effective projectiles for spacing and pressure." }, { en: "He has three combo throws, including back throw into back aerial for a KO." }],
      weaknesses: [{ en: "He is frail: tall, light and fast-falling, so he is easy to combo and KO." }, { en: "His frame data is unimpressive, leaving him with a poor close-quarters game." }, { en: "His KO potential is inconsistent because his sword's sweetspots need the right spacing." }, { en: "His recovery covers a mediocre distance, so he can be edge-guarded or gimped." }],
    },
    "sheik": {
      source: { title: "SmashWiki: Sheik (SSBU)", url: "https://www.ssbwiki.com/Sheik_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sheik is a hit-and-run character with some of the best mobility and fastest attacks in the game. She can zone from afar with Needle Storm or approach aggressively, then string together long combos. Her damage output and KO power are low, so she plays a very long game and has to look for openings to land her KO confirms.",
      },
      traits: [],
      strengths: [{ en: "Her outstanding neutral game is built on mobility, range, Needle Storm and extremely quick attacks." }, { en: "Her combo ability is among the best in the game." }, { en: "Vanish and Bouncing Fish make her recovery versatile and hard to edge-guard." }, { en: "Her attacks have very little ending lag, making her extremely difficult to punish." }],
      weaknesses: [{ en: "She is very light and easy to combo, so her survivability is frail." }, { en: "Her damage output is notoriously poor, needing extremely long strings of attacks." }, { en: "She struggles to score KOs, with only a handful of KO options that are hard to land." }, { en: "Her grab game is below average, with no throws that KO at realistic percents." }],
    },
    "shulk": {
      source: { title: "SmashWiki: Shulk (SSBU)", url: "https://www.ssbwiki.com/Shulk_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Shulk is a middleweight swordsman with average mobility and some of the longest disjointed range in the game. He adapts to each situation with his Monado Arts, Jump, Speed, Shield, Buster and Smash, which each boost some attributes and lower others. He does best when played patiently with careful spacing, and has an extremely high learning curve.",
      },
      traits: [],
      strengths: [{ en: "The Monado gives him some of the longest disjointed range in the game." }, { en: "Monado Arts let him adapt to almost any situation and mix up his playstyle." }, { en: "His powerful aerials have large, long-lasting hitboxes and low landing lag." }, { en: "The Shield Art is among the best combo breakers in the game." }],
      weaknesses: [{ en: "His moveset is mostly sluggish, so a missed attack is easily punished." }, { en: "He cannot auto-cancel his aerials early, so every aerial is a commitment." }, { en: "He has no projectile or anti-projectile options." }, { en: "Each Monado Art weakens some of his other attributes while it is active." }],
    },
    "simon": {
      source: { title: "SmashWiki: Simon (SSBU)", url: "https://www.ssbwiki.com/Simon_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Simon is a heavyweight with effective projectiles and incredibly long, disjointed whip attacks, but poor mobility, especially in the air. He excels at a distance while controlling the main stage, using the Axe, Cross and Holy Water to keep opponents where his range works best. He must avoid being sent offstage, where he survives poorly.",
      },
      traits: [],
      strengths: [{ en: "The Vampire Killer whip gives him the second-longest disjointed range of any fighter." }, { en: "Axe, Cross and Holy Water are effective for edgeguarding, ledge-trapping and setting up combos or KOs." }, { en: "Down aerial is a very effective combo tool that leads into Uppercut for KOs." }, { en: "His throws have great utility, and his forward and back throws have good KO potential." }],
      weaknesses: [{ en: "His recovery is extremely poor, among the worst in the game, so he is easy to gimp." }, { en: "He is easy to combo and lacks effective combo breakers." }, { en: "Poor frame data gives him a mediocre close-range game." }, { en: "His projectiles can be reflected, and Holy Water can be caught and used against him." }],
    },
    "sora": {
      source: { title: "SmashWiki: Sora (SSBU)", url: "https://www.ssbwiki.com/Sora_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Sora is a floaty, lightweight swordsman who is poor on the ground but much stronger in the air. He stays airborne with a very high double jump and uses lingering attacks to combo, juggle and edge-guard. His short range and light weight force him to play very patiently and avoid overextending or missing too often.",
      },
      traits: [],
      strengths: [{ en: "His recovery is among the longest in the game." }, { en: "Lingering hitboxes on most attacks give him a deadly juggling game and strong edge trapping." }, { en: "His standing grab is among the fastest in the game, with useful back and down throws." }, { en: "His wide array of combo routes can lead to KOs at very early percentages." }],
      weaknesses: [{ en: "His sword's range is among the shortest of any weapon in the game." }, { en: "His low weight and below-average falling speed make him very susceptible to vertical KOs." }, { en: "Poor ground mobility and below-average frame data make it hard to escape pressure and combos." }, { en: "Magic cannot be swapped freely; he must use each spell to reach the next." }],
    },
    "steve": {
      source: { title: "SmashWiki: Steve (SSBU)", url: "https://www.ssbwiki.com/Steve_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Steve is a unique fighter built around mining materials, crafting stronger tools and placing blocks. He walls opponents off with blocks while he mines and upgrades, then fights up close with rapid tool swings, dangerous combos and fearsome edgeguarding. His mobility is terrible and he depends on his resources, so he has a large learning curve.",
      },
      traits: [],
      strengths: [{ en: "Create Block builds walls, blocks projectiles, stalls his recovery and enables very deep edgeguarding." }, { en: "His advantage state is among the best in the game, dealing large damage fairly easily." }, { en: "Diamond tools have excellent damage and knockback, which forces opponents to approach him." }, { en: "Minecart is a KO option, a horizontal recovery tool and a projectile that grabs opponents." }],
      weaknesses: [{ en: "His ground mobility is among the worst in the game, and his jump is the shortest." }, { en: "Running out of materials leaves him with almost no useful abilities." }, { en: "His attacks are short-ranged and he has no conventional projectile." }, { en: "He lacks a useful get-off-me option and can be constantly juggled up close." }],
    },
    "terry": {
      source: { title: "SmashWiki: Terry (SSBU)", url: "https://www.ssbwiki.com/Terry_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Terry is a tall heavyweight focused on close combat and footsies, with a great ground game built on bait-and-punish. He cancels normal moves into command-input specials for big combos, damage and KOs. Once he has taken enough damage he gains two Super Special Moves, Power Geyser and Buster Wolf. His inputs give him a relatively high learning curve.",
      },
      traits: [],
      strengths: [{ en: "His punish game is very strong, dealing a large amount of damage from any opening." }, { en: "He has many finishing moves, including his smash attacks, Burning Knuckle and Power Dunk." }, { en: "Power Geyser and Buster Wolf are incredibly powerful and can KO very early." }, { en: "He always faces his opponent in 1-on-1 matches, making rolls and cross ups easier to punish." }],
      weaknesses: [{ en: "His disadvantage state is poor, and his tall body makes him easy to juggle." }, { en: "Rising Tackle is a weak recovery move, so he is easily KO'd offstage." }, { en: "He has few good pokes outside of down tilt, and his aerial approaches are weak." }, { en: "Improper inputs can drop a KO confirm or even cause a self-destruct." }],
    },
    "toon-link": {
      source: { title: "SmashWiki: Toon Link (SSBU)", url: "https://www.ssbwiki.com/Toon_Link_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Toon Link is a fairly quick but floaty middleweight zoner with a sword and three projectiles. He uses the Hero's Bow, Boomerang and Bomb to camp and force opponents to approach, then turns hits from Bomb, Boomerang or up tilt into combos and KOs. He is a balanced fighter with decent frame data and plenty of attack options.",
      },
      traits: [],
      strengths: [{ en: "Hero's Bow, Boomerang and Bomb let him camp effectively and force approaches." }, { en: "Bomb is his most varied and useful combo starter and leads into KO moves." }, { en: "Up tilt combos into many moves, including forward aerial and up aerial for kills." }, { en: "Back throw is one of the strongest back throws in the game." }],
      weaknesses: [{ en: "His floatiness makes him susceptible to strong vertical attacks and his recovery quite predictable." }, { en: "His grabs have considerable start-up and ending lag, and down throw lacks combo potential." }, { en: "His disjointed range is somewhat offset by his short size." }, { en: "His middling weight and slow falling speed make him easier to combo and KO." }],
    },
    "villager": {
      source: { title: "SmashWiki: Villager (SSBU)", url: "https://www.ssbwiki.com/Villager_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Villager is a small, floaty middleweight with below-average mobility who plays as a camper. He harasses opponents from a distance with slingshot aerials and Lloid Rocket, stores their projectiles with Pocket, and sets up traps such as Timber's tree. He is strongest offstage, where he edgeguards and recovers easily, but struggles at close range.",
      },
      traits: [],
      strengths: [{ en: "He has a strong camping game with long-range forward and back aerials and Lloid Rocket." }, { en: "Pocket stores opposing projectiles and items, giving him great counterplay to zoners." }, { en: "Balloon Trip gives him a flexible, long-distance recovery that is difficult to gimp." }, { en: "He is a very potent edgeguarder with many options, including his bowling ball forward smash." }],
      weaknesses: [{ en: "His poor mobility lets fast characters catch him and shut down his camping." }, { en: "His grab has exceptionally high ending lag, which makes it very punishable." }, { en: "Characters with a reflector can turn his powerful projectiles back on him for early KOs." }, { en: "His KO moves are powerful, but none are easy to land from a neutral situation." }],
    },
    "wario": {
      source: { title: "SmashWiki: Wario (SSBU)", url: "https://www.ssbwiki.com/Wario_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Wario is a short heavyweight with fantastic movement in the air and a great air game. He dips in and out of range to bait attacks, then punishes with damaging combos and powerful kill moves. His unorthodox specials include Chomp, Wario Bike and Wario Waft, a fast, highly damaging kill move that builds up with time. He rewards patient play.",
      },
      traits: [],
      strengths: [{ en: "His air speed and air acceleration are among the best in the game." }, { en: "Wario Waft, given time, is a highly damaging kill move with extremely fast startup." }, { en: "Chomp is one of the best command grabs in the game and heals him." }, { en: "His versatile aerials combo, kill and make him very effective at edgeguarding." }],
      weaknesses: [{ en: "His range is rather mediocre and he lacks a proper projectile." }, { en: "His smash attacks have extremely high ending lag and are very unsafe on shield." }, { en: "His other KO moves are sluggish or predictable, so he often relies on Wario Waft." }, { en: "His bike recovery goes far, but he is fairly easy to gimp while using it." }],
    },
    "wolf": {
      source: { title: "SmashWiki: Wolf (SSBU)", url: "https://www.ssbwiki.com/Wolf_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Wolf is a versatile middleweight whose gameplan sits between pressure and punishes. His Blaster disrupts approaches and forces opponents to jump into his fast aerials, and his large, disjointed hitboxes let him deal massive damage from very few openings. He has plenty of combo and KO options, but a single mistake can cost him heavily.",
      },
      traits: [],
      strengths: [{ en: "Blaster is the centerpiece of his neutral game, disrupting and forcing approaches." }, { en: "Large, often disjointed hitboxes give him a devastating punish game." }, { en: "He has numerous KO options, with back aerial the most reliable." }, { en: "His standing grab is tied for the fastest in the game." }],
      weaknesses: [{ en: "His recovery is linear and short, leaving him highly vulnerable to gimps and edgeguarding." }, { en: "His most powerful finishers are slow to start and lack guaranteed setups." }, { en: "His high falling speed and gravity make him very susceptible to combos." }],
    },
    "young-link": {
      source: { title: "SmashWiki: Young Link (SSBU)", url: "https://www.ssbwiki.com/Young_Link_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Young Link is a lightweight who mixes versatile ranged combat with strong close-range fighting. He zones with Fire Arrow, Boomerang and Bomb, then uses his very fast sword attacks and aerials for some of the most varied combos in the game. He can switch between very defensive and very aggressive play, and has a rather high learning curve.",
      },
      traits: [],
      strengths: [{ en: "He has some of the best frame data in the game, with many moves safe on shield." }, { en: "His combo game is one of the most complex and varied in the cast." }, { en: "Fire Arrow, Boomerang and Bomb give him zoning, traps and combo starters." }, { en: "Neutral aerial is fast, safe and starts or continues combos well into high percentages." }],
      weaknesses: [{ en: "His sword's range is shorter than nearly every other swordfighter's." }, { en: "His average mobility can be too slow to continue combos, approach or escape." }, { en: "Spin Attack travels on a predictable arc, so his recovery can be exploited." }, { en: "His safe kill moves may kill quite late." }],
    },
    "zelda": {
      source: { title: "SmashWiki: Zelda (SSBU)", url: "https://www.ssbwiki.com/Zelda_(SSBU)", by: "SmashWiki's contributors (CC BY-SA 4.0)" },
      playstyle: {
        en: "Zelda is a tall, floaty lightweight with slow mobility who plays as a zoner glass cannon. Many of her magic attacks have power comparable to a heavyweight's, and Phantom Slash lets her control space, pressure and set traps. She must space her attacks precisely and be creative when approaching or getting out of disadvantage.",
      },
      traits: [],
      strengths: [{ en: "Impressive kill power is spread broadly across her moveset." }, { en: "She has fast and powerful out of shield options, such as her Lightning Kicks and Farore's Wind." }, { en: "Phantom Slash gives her good stage control and ledge trapping." }, { en: "Back throw and up throw are excellent kill throws." }],
      weaknesses: [{ en: "Poor mobility hampers her ability to approach and move around safely." }, { en: "Her disadvantage is one of the worst in the game, as she is easily juggled and ledge trapped." }, { en: "Her Lightning Kicks have tiny sweetspots and very weak sourspots, making them risky." }, { en: "Her normal attacks have poor range, and all her special moves are punishable if misused." }],
    },
  },
};
