// Smashy's English phrases, by screen. Every phrase here needs a Spanish one in es.ts (TypeScript
// checks). {name} is filled in when shown; "one|many" picks by {n}. Bigger screens keep their phrases
// in sections/ (one file per part, joined here).
import { enteringEn } from "./sections/entering.en";
import { eventEn } from "./sections/event.en";
import { setroomEn } from "./sections/setroom.en";
import { hostbracketEn } from "./sections/hostbracket.en";
import { hostrunEn } from "./sections/hostrun.en";
import { hostsetupEn } from "./sections/hostsetup.en";
import { alertEn } from "./sections/alert.en";
import { feedEn } from "./sections/feed.en";
import { peopleEn } from "./sections/people.en";
import { playEn } from "./sections/play.en";
import { browseEn } from "./sections/browse.en";
import { mediaEn } from "./sections/media.en";
import { uiEn } from "./sections/ui.en";
import { seasonEn } from "./sections/season.en";
import { leagueEn } from "./sections/league.en";
import { historyEn } from "./sections/history.en";
import { playnowEn } from "./sections/playnow.en";
export const en = {
  // Language switch
  "lang.label": "Language",
  "lang.note": "Posts and names stay as written.",

  // Profile (guest)
  "profile.guestTitle": "Your profile",
  "profile.guest": "You're browsing as a guest.",
  "profile.guestBody": "Make a free account to set your tag, follow your scene, and show your tournament history.",

  // Main menu
  "nav.main": "Main",
  "nav.home": "Smashy home",
  "nav.feed": "Feed",
  "nav.discuss": "Discuss",
  "nav.events": "Events",
  "nav.reels": "Reels",
  "nav.play": "Play",
  "nav.messages": "Messages",
  "nav.new": "New players",
  "nav.profile": "Profile",
  "nav.skip": "Skip to content",

  // Common
  "common.continue": "Continue",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.close": "Close",
  "common.back": "Back",
  "common.yes": "Yes",
  "common.no": "No",
  "common.offline": "Couldn't reach Smashy. Check your connection and try again.",
  "common.tryAgain": "Couldn't save that. Please try again.",
  "common.signInFirst": "Sign in first.",
  "common.showMore": "Show {n} more",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.period": ".",

  // Getting started (keys match src/lib/discovery.ts)
  "checklist.picture": "Add a profile picture",
  "checklist.mains": "Pick your mains",
  "checklist.bio": "Write a short bio",
  "checklist.follow": "Follow 3 players",
  "checklist.startgg": "Link start.gg to show your results",
  "checklist.post": "Say hi in the feed",
  "discover.alsoIn": "Also in {place}",
  "discover.playsYourGames": "Plays your games",

  // Event formats
  "format.double_elim": "Double elimination",
  "format.single_elim": "Single elimination",
  "format.round_robin": "Round robin",
  "format.swiss": "Swiss",
  "format.social": "No bracket (social event)",
  "format.then": "{first}, then top {n} {second}",

  // Sharing an event
  "share.postToFeed": "Post to my feed",
  "share.posting": "Posting…",

  // Videos on a set
  "vods.title": "Videos",
  "vods.ofThisSet": "Videos of this set",
  "vods.all": "All VODs →",
  "vods.add": "+ Add a video of this set",
  "vods.linkLabel": "Link to the video",
  "vods.placeholder": "https://youtu.be/… with the time it starts, if you can",
  "vods.addButton": "Add",
  "vods.adding": "Adding…",
  "vods.help": "YouTube, Twitch (a VOD or a clip) or Streamable. Only videos of this set, please: anyone can see them.",
  "vods.notYet": "That doesn't look like a video link from one of those sites yet.",
  "vods.removeConfirm": "Remove this video from the set?",
  "vods.remove": "Remove",
  "vods.removing": "Removing…",

  // Reporting something to moderators
  "report.button": "Report",
  "report.spam": "Spam",
  "report.harassment": "Harassment or bullying",
  "report.inappropriate": "Inappropriate",
  "report.offTopic": "Not about smash",
  "report.other": "Something else",
  "report.done": "Reported. Thanks!",
  "report.failed": "Couldn't report.",

  // Sign-in
  "signin.title": "Join",
  "signin.pageTitle": "Join Smashy",
  "signin.intro": "Post, follow your scene, and show off your results. Browsing is always free without an account.",
  "signin.tooYoung": "Sorry, you can't make an account yet.",
  "signin.tooYoungBody": "Smashy accounts are for people 13 and older. You can still browse events and everything else as a guest.",
  "signin.browseEvents": "Browse events →",
  "signin.discord": "Continue with Discord",
  "signin.google": "Continue with Google",
  "signin.apple": "Continue with Apple",
  "signin.appleFailed": "Sign in with Apple didn't work. Try again, or use your email.",
  "signin.discordBeta": "Recommended during the beta: email sign-in links can take a while to arrive.",
  "signin.discordReady": "Quickest way in. Email links work too; check spam if one doesn't arrive.",
  "signin.quickWays": "Quickest ways in: one tap, no email to wait for. Email links work too; check spam if one doesn't arrive.",
  "signin.agreeBefore": "By joining you agree to the",
  "signin.terms": "Terms",
  "signin.and": "and",
  "signin.privacy": "Privacy policy",
  "signin.wrongBirthday": "Entered the wrong birthday?",
  "signin.inviteSaved": "Invite code {code} saved. Sign in below and it's filled in for you.",
  "signin.privateBeta": "Smashy is in a private beta: joining needs an invite code from someone already on it.",
  "signin.birthday": "When is your birthday?",
  "signin.birthdayNote": "We ask everyone this. Your birthday is never shown on your profile.",
  "signin.month": "Month",
  "signin.day": "Day",
  "signin.year": "Year",
  "signin.checkEmail": "Check your email",
  "signin.sentTo": "We sent a sign-in link and code to {email}. Open the link on this device, or type the code below.",
  "signin.codeLabel": "Or type the code from the email",
  "signin.codeSubmit": "Sign in",
  "signin.badCode": "That code doesn't look right. It's the number in the sign-in email.",
  "signin.codeFailed": "That code didn't work. Check it against the newest sign-in email; codes stop working after an hour or once used.",
  "signin.cantFind": "Can't find it?",
  "signin.spamHelp": "Check your spam or promotions folder. It comes from {from}; marking it \"Not spam\" helps the next one arrive in your inbox.",
  "signin.err.banned": "This account is suspended for breaking Smashy's rules. If you think that's a mistake, email {email}.",
  "signin.err.expired": "That sign-in link has expired or was already used. Ask for a new one below.",
  "signin.err.rate": "Too many sign-in emails were sent just now. Wait a minute and try again.",
  "signin.err.failed": "Sign-in didn't work. Please try again, or use another way below.",
  "signin.err.inUse": "That account is already connected to a different Smashy account. Sign out and sign in with it to use that one.",
  "people.signin.title": "How you sign in",
  "people.accounts.title": "Accounts",
  "people.accounts.note": "Switch between your Smashy accounts on this device, like on X. Up to {n}.",
  "people.accounts.switch": "Switch",
  "people.accounts.add": "Add an account",
  "people.accounts.forget": "Remove @{handle} from this device",
  "people.accounts.full": "This device can keep up to {n} accounts. Remove one to add another.",
  "people.accounts.savedTitle": "Accounts on this device",
  "people.accounts.continueAs": "Continue as {name}",
  "people.accounts.switchLink": "Switch account",
  "people.accounts.switchTo": "Switch to @{handle}",
  "people.signin.note": "Connect a second way in, so you can still sign in if you lose access to one.",
  "people.signin.connect": "Connect {name}",
  "people.signin.added": "{name} is connected. You can sign in with it from now on.",
  "people.signin.changeEmail": "Change email",
  "people.signin.newEmail": "New email address",
  "people.signin.sendLinks": "Send links",
  "people.signin.emailSent": "Almost done: we sent a link to {old} and one to {new}. Open both to switch.",
  "people.signin.emailPending": "Waiting to switch to {new}: open the links we sent to both addresses.",
  "people.signin.emailHalf": "One link done. Now open the one we sent to the other address to switch to {new}.",
  "people.signin.emailChanged": "Your email is now {email}.",
  "people.signin.sameEmail": "That's already your email.",
  "people.signin.emailInUse": "That email is already used by another Smashy account.",
  "signin.sendAgain": "Send again",
  "signin.sendAgainIn": "Send again in {s}s",
  "signin.otherEmail": "Use a different email",
  "signin.emailLabel": "Or get a sign-in link by email",
  "signin.sendLink": "Send link",
  "signin.badDate": "Please choose a real date.",
  "signin.badEmail": "Please enter a valid email address.",

  ...eventEn,
  ...enteringEn,
  ...setroomEn,
  ...hostsetupEn,
  ...hostrunEn,
  ...hostbracketEn,
  ...feedEn,
  ...peopleEn,
  ...playEn,
  ...browseEn,
  ...mediaEn,
  ...uiEn,
  ...alertEn,
  ...seasonEn,
  ...leagueEn,
  ...historyEn,
  ...playnowEn,
} as const;

export type MessageKey = keyof typeof en;
