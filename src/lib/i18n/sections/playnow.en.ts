// English phrases for "I want to play now" on the Play tab (round 398). Keys start with "playnow.".
export const playnowEn = {
  "playnow.title": "Play now",

  // Play requests
  "playnow.req.incoming": "{who} wants to play {game} now",
  "playnow.req.outgoing": "Waiting for {who} to answer ({game})",
  "playnow.req.ready": "{who} is ready to play {game}",
  "playnow.req.minsLeft": "1 min left|{n} min left",
  "playnow.req.accept": "Let's play",
  "playnow.req.decline": "Not now",
  "playnow.req.cancel": "Cancel request",
  "playnow.req.theirCode": "{who}'s code:",
  "playnow.req.noCode": "{who} hasn't saved a code for this game yet.",
  "playnow.req.messageThem": "Message them",
  "playnow.req.saveYours": "Save your own code below so they can find you.",

  // "Ask to play" buttons
  "playnow.ask.button": "Ask to play",
  "playnow.ask.buttonGame": "Ask to play {game}",
  "playnow.ask.game": "Game",
  "playnow.ask.sent": "Asked! They have 15 minutes to answer.",

  // Name card in room chat
  "playnow.card.loading": "Loading…",
  "playnow.card.profile": "View profile",

  // @matchmaking pings
  "playnow.ping.on": "@matchmaking pings on",
  "playnow.ping.off": "Get @matchmaking pings",
  "playnow.ping.help": "Get a phone alert when someone types @matchmaking, or tags a character you main, in the {game} chat",
  "playnow.ping.hint": "Type @matchmaking to ping everyone who wants games, or @ a character (like @Fox) to ping players who main them.",
  "playnow.ping.sent": "Pinged everyone who wants games.",
  "playnow.ping.cooldown": "Message sent. You can ping once every 30 minutes.",
  "playnow.ping.suggest": "Tag suggestions",
  "playnow.ping.sentMain": "Pinged {chars} mains who want games.",

  // Looking to play
  "playnow.looking.start": "I'm looking to play {game}",
  "playnow.looking.for": "For how long",
  "playnow.looking.mins": "{n} minutes",
  "playnow.looking.hours": "1 hour|{n} hours",
  "playnow.looking.on": "Friends can see you're looking to play {game} until",
  "playnow.looking.stop": "Stop",
  "playnow.looking.note": "Mutual follows see this. It turns off by itself.",

  // Saved code
  "playnow.code.placeholder": "Your code",
  "playnow.code.save": "Save",
  "playnow.code.saved": "Saved.",
  "playnow.code.note": "Only shown to players you say yes to.",

  // Friends
  "playnow.friends.title": "Friends",
  "playnow.friends.none": "No friends here yet. Follow players who follow you back and they show up here.",
  "playnow.friends.looking": "Looking to play {game}",

  // Slippi
  "playnow.slippi.open": "Open Slippi",
  "playnow.slippi.title": "Opens Slippi Launcher on this computer and copies the code",
  "playnow.slippi.how": "Slippi can't be told the code from a website: in Melee, pick Online, then Direct, and type it in.",

  // Notifications list, phone alerts and settings
  "playnow.notif.ping": "{who} wants games in the {game} chat",
  "playnow.notif.pingMain": "{who} wants games against {character} in the {game} chat",
  "playnow.notif.request": "{who} wants to play {game} now",
  "playnow.notif.accepted": "{who} said yes to playing {game}",
  "playnow.alert.ping": "{who} wants {game} games",
  "playnow.alert.pingBody": "Tap to open the chat.",
  "playnow.alert.pingMain": "{who} wants games against {character}",
  "playnow.alert.request": "{who} wants to play {game} now",
  "playnow.alert.requestBody": "Tap to answer. It ends in 15 minutes.",
  "playnow.alert.accepted": "{who} is ready to play {game}",
  "playnow.alert.acceptedBody": "Tap to see their code.",
  "playnow.settings.requests": "Play requests",

  // Errors
  "playnow.err.alreadyAsked": "You already asked. Give them a few minutes.",
  "playnow.err.tooMany": "That's a lot of requests. Try again in a bit.",
  "playnow.err.cantAsk": "You can't ask this player.",
  "playnow.err.ended": "This request has ended.",
  "playnow.err.failed": "That didn't work. Try again.",
} as const;
