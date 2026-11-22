// The link directory at the bottom of a game's resources page: every useful community site and tool,
// grouped the way melee.tv groups them (Play, Community, Learn, Create, Customize). Melee.tv inspired
// the list and is credited on the page. Leaves out what the essentials list already shows, affiliate
// links and file downloads hosted on someone else's site. Dead links checked 2026-11-14 (ssbmtextures.com,
// meleeframedata.com, savemelee.com and the Heroku rank overlay were down, so they're left out).
// Edit here. Shared by server and browser code.
import type { GameKey } from "./games";

export type DirGroupKey = "play" | "community" | "learn" | "create" | "customize";
export type DirLink = { label: string; url: string };
export type DirEntry = { title: string; note: string; links: DirLink[] };
export type DirGroup = { key: DirGroupKey; entries: DirEntry[] };

const go = (label: string, url: string): DirLink => ({ label, url });

// Shared by the games played on GameCube controllers, and by every game's Create group.
const GC_LIBRARY: DirEntry = { title: "GameCube Controller Library", note: "Guides on how GameCube controllers work, what to look for when buying one, and how they're modded.", links: [go("Guides", "https://gccontrollerlibrary.com/guides/")] };
const BOX_RULES = "Check your event's ruleset before you bring one.";
const SMASH_MAP: DirEntry = { title: "Smash Map", note: "Where players and events are around the world.", links: [go("Open the map", "https://smash-map.com/")] };
const OBS: DirEntry = { title: "OBS", note: "Free software to stream or record your games.", links: [go("Download", "https://obsproject.com/download")] };
const TSH: DirEntry = { title: "Tournament Stream Helper", note: "Keeps player names, characters and scores on stream up to date, and can pull them from a start.gg bracket.", links: [go("Download", "https://github.com/joaorb64/TournamentStreamHelper")] };
const EDITING: DirEntry = { title: "Video editing", note: "Free editing software and copyright-free music for clips and streams.", links: [go("DaVinci Resolve", "https://www.blackmagicdesign.com/products/davinciresolve/"), go("StreamBeats", "https://www.streambeats.com/")] };
const TOP8: DirEntry = { title: "Top 8 graphics", note: "Make a top 8 results graphic by hand or from a start.gg bracket.", links: [go("Top8er", "https://www.top8er.com/")] };

export const LINK_DIRECTORY: Partial<Record<GameKey, DirGroup[]>> = {
  melee: [
    {
      key: "play",
      entries: [
        { title: "Slippi setup and ranked", note: "A setup walkthrough, tips to make Dolphin run smoothly on your computer, and the ranked leaderboards.", links: [go("Setup video", "https://www.youtube.com/watch?v=0XJ_KsIbmiM"), go("Speed-up tips", "https://melee.tv/optimize"), go("Leaderboards", "https://slippi.gg/leaderboards")] },
        { title: "Which copy of the game", note: "Online play needs the US (NTSC) version 1.02. Dolphin's guide shows how to copy your own disc for Slippi.", links: [go("Version differences", "https://www.ssbwiki.com/List_of_regional_version_differences_(SSBM)"), go("Copying your disc", "https://wiki.dolphin-emu.org/index.php?title=Ripping_Games")] },
        GC_LIBRARY,
        { title: "Controller adapters", note: "To plug GameCube controllers into a computer: Nintendo's adapter, a Mayflash in Wii U mode, or Input Integrity's. Mac players need Slippi's extra setup.", links: [go("Input Integrity", "https://www.input-integrity.com/"), go("Slippi on Mac", "https://github.com/project-slippi/Ishiiruka/wiki/Slippi-on-macOS")] },
        { title: "Controller modding", note: "Find a modder near you, read up on the GameCube controller's insides, or look at the open-source Phob board.", links: [go("Modder map", "https://www.nojonsmods.com/moddermap"), go("DOL-003 info", "https://dol-003.info/"), go("PhobGCC", "https://github.com/PhobGCC/PhobGCC-doc")] },
        { title: "Box controllers", note: `All-button controllers built for competitive Melee. ${BOX_RULES}`, links: [go("B0XX", "https://b0xx.com/"), go("Frame1", "https://frame1.gg/"), go("Smash Box", "https://www.hitboxarcade.com/products/smash-box")] },
      ],
    },
    {
      key: "community",
      entries: [
        { title: "Melee Discord servers", note: "A list of Melee community Discords and handy bots for your own server.", links: [go("Discord list", "https://melee.tv/discord")] },
        { title: "Majors and online events", note: "Upcoming Melee majors, plus a shared calendar of online events.", links: [go("Melee Majors", "https://meleemajors.gg/"), go("Online calendar", "https://calendar.google.com/calendar/u/0/embed?src=4k5refm631gogeoa8kacsb0ifs@group.calendar.google.com&ctz=America/New_York")] },
        SMASH_MAP,
        { title: "Upsets.gg", note: "Fantasy brackets for big Melee events: pick winners and score points.", links: [go("Play", "https://upsets.gg/")] },
        { title: "Slippi card generator", note: "Make a shareable image with your Slippi tag and player info.", links: [go("Make a card", "https://slippicardgenerator.voidslayer.com/")] },
        { title: "Forums and Reddit", note: "Longer discussions on SmashBoards and r/SSBM.", links: [go("SmashBoards", "https://smashboards.com/forums/melee-discussion.12/"), go("r/SSBM", "https://reddit.com/r/SSBM")] },
        { title: "Live on Twitch", note: "Everyone streaming Melee right now.", links: [go("Browse streams", "https://www.twitch.tv/directory/game/Super%20Smash%20Bros.%20Melee")] },
        { title: "Documentaries", note: "The Smash Brothers, Metagame, and a look at how Melee was made.", links: [go("The Smash Brothers", "https://www.youtube.com/playlist?list=PLoUHkRwnRH-KTCH3tJ9WvsWWPEgUu-y6d"), go("Metagame", "https://www.metagamedoc.com/"), go("Making of Melee", "https://www.youtube.com/watch?v=-3HiXYdFz38")] },
        { title: "Speedruns", note: "Melee speedrun categories, leaderboards and records.", links: [go("speedrun.com", "https://www.speedrun.com/ssbm"), go("Records sheet", "https://docs.google.com/spreadsheets/d/15wdkLsmSU2T9Os1j-lISe-XmXH-l3Awk9xBipYnTQCI")] },
      ],
    },
    {
      key: "learn",
      entries: [
        { title: "SSBM Tutorials", note: "Short video lessons on Melee's techniques, with a playlist for beginners.", links: [go("Beginner playlist", "https://www.youtube.com/playlist?list=PLoU3TQBakHOrE9yYdNlsmG74LEB0Mf3h8"), go("Channel", "https://www.youtube.com/ssbmtutorials")] },
        { title: "The Melee Library", note: "A huge searchable collection of Melee guides and knowledge.", links: [go("Browse", "https://www.meleelibrary.com/")] },
        { title: "The Melee Cookbook", note: "Character guides written by top players.", links: [go("Open", "https://melee.cookbook.gg/")] },
        { title: "SmashWiki", note: "The community wiki: characters, stages, techniques and history.", links: [go("Melee on SmashWiki", "https://www.ssbwiki.com/Super_Smash_Bros._Melee")] },
        { title: "VODs", note: "Sets from notable tournaments, searchable by player and character.", links: [go("Find sets", "https://vods.co/melee")] },
        { title: "Coaching", note: "Paid lessons from experienced players, and a community list of coaches.", links: [go("Metafy", "https://metafy.gg/super-smash-bros-melee"), go("Coach list", "https://www.reddit.com/r/SSBM/comments/qbkgbj/help_needed_definitive_list_of_melee_coaching")] },
        { title: "Staying healthy", note: "Hand care, stretches and habits for playing longer without pain.", links: [go("Guide", "https://smashboards.com/threads/staying-healthy-a-guide-to-playing-melee-better-and-longer.332355/"), go("Video", "https://www.youtube.com/watch?v=rNoDWrVTZPk")] },
        { title: "20XX Training Hack Pack", note: "An older practice pack full of training settings, from before Training Mode.", links: [go("Download thread", "https://smashboards.com/threads/the-20xx-melee-training-hack-pack-v4-07-7-04-17.351221/"), go("Tutorial", "https://www.youtube.com/watch?v=rdohfVWQLUc")] },
        { title: "TechChase", note: "A reaction trainer in your browser for reading tech options.", links: [go("Play", "https://shongsdu.github.io/TechChaseWeb/")] },
        { title: "Stick coordinate visualizer", note: "Diagrams of how Melee reads the control stick, for angles and controller nerds.", links: [go("Open", "https://marp-e3fcf.web.app/")] },
        { title: "Replay tools", note: "Watch, search and get stats from your Slippi replays.", links: [go("Slippi Lab", "https://slippilab.com/"), go("Slippipedia", "https://github.com/cbartsch/Slippipedia/releases/latest"), go("Slippi Stats", "https://vince.id.au/slippi-stats/"), go("Slippi Wrapped", "https://slippi-wrapped.marah.dev/")] },
      ],
    },
    {
      key: "create",
      entries: [
        OBS,
        { title: "Stream overlays", note: "Tools that keep names, characters and scores on stream up to date.", links: [go("Melee Stream Tool", "https://github.com/Readek/Melee-Stream-Tool"), go("Melee Ghost Streamer", "https://github.com/Sheepolution/Melee-Ghost-Streamer"), go("Tournament Stream Helper", "https://github.com/joaorb64/TournamentStreamHelper")] },
        { title: "Input display and HUDs", note: "Show controller inputs, custom HUDs or your Slippi rank on stream.", links: [go("M'Overlay", "https://github.com/bkacjios/m-overlay"), go("SlippiHUD", "https://github.com/SSBDoppler/slippi-hud"), go("slpRank", "https://github.com/slprank/slpRank-app")] },
        { title: "Clippi", note: "Finds combos in your Slippi replays so you can make clips.", links: [go("Download", "https://github.com/vinceau/project-clippi"), go("How-to", "https://medium.com/@vinceau/how-to-make-combo-videos-using-project-clippi-6bf2758f546e")] },
        { title: "Video editing", note: "Free editing software, copyright-free music, and a Blender add-on for camera shots.", links: [go("DaVinci Resolve", "https://www.blackmagicdesign.com/products/davinciresolve/"), go("StreamBeats", "https://www.streambeats.com/"), go("External Melee Camera", "https://kellz.ca/emc/")] },
        TOP8,
        { title: "HD assets", note: "High-resolution Melee art for thumbnails and overlays.", links: [go("Library", "https://assets.melee.tv/"), go("Tutorials", "https://www.youtube.com/playlist?list=PLifkMG2HBLdYhasEG0qaL458WUZWTysZj")] },
      ],
    },
    {
      key: "customize",
      entries: [
        { title: "Gecko codes", note: "Extra settings and features for Melee on Slippi or Dolphin.", links: [go("Browse codes", "https://melee.tv/codes")] },
        { title: "Diet Melee", note: "Simplified models for weaker computers. Safe for online play.", links: [go("Download", "https://diet.melee.tv/")] },
        { title: "Animelee", note: "A cel-shaded anime look for Melee. Safe for online play.", links: [go("Download", "https://www.animelee.xyz/"), go("Guide", "https://davidvkimball.com/posts/the-ultimate-animelee-guide/")] },
        { title: "HD texture pack", note: "Sharper textures for Slippi or Dolphin.", links: [go("Download thread", "https://www.reddit.com/r/SSBM/comments/niqgf9/definitive_melee_hd_dolphin_and_slippi_texture/"), go("Tutorial", "https://www.youtube.com/watch?v=SYItKN88hzg")] },
        { title: "Costume and stage tools", note: "Swap in custom costumes and stages, or batch-apply mods to your game file.", links: [go("DAT Texture Wizard", "https://github.com/DRGN-DRC/DAT-Texture-Wizard"), go("Melee Quick Mod", "https://github.com/alex-berliner/MeleeQuickMod")] },
        { title: "Expanded Melee", note: "Fan projects with new characters, stages and modes.", links: [go("Akaneia", "https://github.com/akaneia/akaneia-build"), go("Beyond Melee", "https://beyondmelee.com/home/")] },
      ],
    },
  ],
  ultimate: [
    {
      key: "play",
      entries: [
        { title: "Nintendo Switch Online", note: "Needed to play Ultimate online: quickplay, Elite Smash and arenas with friends.", links: [go("About NSO", "https://www.nintendo.com/us/switch/online/")] },
        { ...GC_LIBRARY, note: "Most competitive players use a GameCube controller with an adapter. These guides cover how they work and what to look for when buying one." },
        { title: "Box controllers", note: `All-button controllers that also work for Ultimate. HayBox is open firmware many boxes run. ${BOX_RULES}`, links: [go("Frame1", "https://frame1.gg/"), go("Smash Box", "https://www.hitboxarcade.com/products/smash-box"), go("HayBox", "https://github.com/JonnyHaystack/HayBox")] },
      ],
    },
    {
      key: "community",
      entries: [
        { title: "Reddit", note: "r/smashbros for everything Smash, r/CrazyHand for competitive Ultimate questions and help.", links: [go("r/smashbros", "https://www.reddit.com/r/smashbros"), go("r/CrazyHand", "https://www.reddit.com/r/CrazyHand")] },
        { title: "Liquipedia", note: "Results, brackets and player pages for big tournaments.", links: [go("Liquipedia Smash", "https://liquipedia.net/smash/Main_Page")] },
        { title: "Live on Twitch", note: "Everyone streaming Ultimate right now.", links: [go("Browse streams", "https://www.twitch.tv/directory/category/super-smash-bros-ultimate")] },
        SMASH_MAP,
      ],
    },
    {
      key: "learn",
      entries: [
        { title: "SmashWiki", note: "The community wiki: characters, stages, techniques and history.", links: [go("Ultimate on SmashWiki", "https://www.ssbwiki.com/Super_Smash_Bros._Ultimate")] },
        { title: "VODs", note: "Sets from notable tournaments, searchable by player and character.", links: [go("Find sets", "https://vods.co/ultimate")] },
        { title: "YouTube guides", note: "Channels that explain techniques, characters and the competitive game.", links: [go("Izaw", "https://www.youtube.com/@IzawSmash"), go("Beefy Smash Doods", "https://www.youtube.com/@BeefySmashDoods")] },
        { title: "Coaching", note: "Paid lessons from experienced players.", links: [go("Metafy", "https://metafy.gg/super-smash-bros-ultimate")] },
        { title: "Ultimate Training Modpack", note: "Extra training mode options such as ledge and tech drills. Needs a modded Switch.", links: [go("Download", "https://github.com/jugeeya/UltimateTrainingModpack")] },
      ],
    },
    { key: "create", entries: [OBS, TSH, EDITING, TOP8] },
    {
      key: "customize",
      entries: [
        { title: "Mods", note: "Costumes, stages and the HDR competitive mod. These need a modded Switch.", links: [go("GameBanana", "https://gamebanana.com/games/6498"), go("HDR", "https://github.com/HDR-Development/HDR-Releases")] },
      ],
    },
  ],
  pplus: [
    {
      key: "play",
      entries: [
        { title: "Get Project+", note: "The official download, answers to common setup questions, and the patch notes for each version.", links: [go("Download", "https://projectplusgame.com/download"), go("FAQ", "https://projectplusgame.com/faq"), go("Patch notes", "https://projectplusgame.com/changes")] },
        GC_LIBRARY,
        { title: "Controller adapters", note: "To plug GameCube controllers into a computer: Nintendo's adapter, a Mayflash in Wii U mode, or Input Integrity's.", links: [go("Input Integrity", "https://www.input-integrity.com/")] },
        { title: "Controller modding", note: "Find a modder near you or look at the open-source Phob board.", links: [go("Modder map", "https://www.nojonsmods.com/moddermap"), go("PhobGCC", "https://github.com/PhobGCC/PhobGCC-doc")] },
        { title: "Box controllers", note: `All-button controllers. ${BOX_RULES}`, links: [go("B0XX", "https://b0xx.com/"), go("Frame1", "https://frame1.gg/"), go("Smash Box", "https://www.hitboxarcade.com/products/smash-box")] },
      ],
    },
    {
      key: "community",
      entries: [
        { title: "P+ Discord and local scenes", note: "The official Discord, and a list of P+ communities to find players near you.", links: [go("Discord", "https://projectplusgame.com/discord"), go("Find communities", "https://projectplusgame.com/find-communities")] },
        { title: "r/SSBPM", note: "The P+ subreddit.", links: [go("r/SSBPM", "https://www.reddit.com/r/ssbpm")] },
        { title: "Liquipedia", note: "Results, brackets and player pages for P+ tournaments.", links: [go("Project+ on Liquipedia", "https://liquipedia.net/smash/Project_Plus")] },
        { title: "Streams and videos", note: "P+ streams on Twitch and the official YouTube channel.", links: [go("Twitch", "https://www.twitch.tv/search?term=Project%2B"), go("YouTube", "https://www.youtube.com/@ProjectPlusGame")] },
        SMASH_MAP,
      ],
    },
    {
      key: "learn",
      entries: [
        { title: "SmashWiki", note: "The community wiki's Project+ pages: characters, changes from Brawl and history.", links: [go("Project+ on SmashWiki", "https://www.ssbwiki.com/Project%2B")] },
        { title: "VODs", note: "Sets from P+ and Project M tournaments.", links: [go("Find sets", "https://vods.co/projectm")] },
      ],
    },
    { key: "create", entries: [OBS, TSH, EDITING, TOP8] },
  ],
};

/** Where a game's directory came from, credited under it. */
export const DIRECTORY_SOURCE: Partial<Record<GameKey, DirLink>> = { melee: go("melee.tv", "https://melee.tv") };
