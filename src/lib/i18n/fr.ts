// Smashy in French (français). House style: natural French as French-speaking smash players write online
// (France, Québec, Belgium, Switzerland): "tu", short labels, no stiff formal register. Scene words stay as
// the community says them: bracket, set, top 8, seed, DQ, stage, ruleset, netplay, setup, main, pools,
// check-in, ladder; keep brand names (Smashy, start.gg, Slippi, Braacket, Challonge, Discord) as they are.
// Every phrase in en.ts has to be here (TypeScript checks). The main (top-level) keys go first; the
// per-screen phrases are in sections/*.fr.ts.
import type { MessageKey } from "./en";
import type { eventEn } from "./sections/event.en";
import type { enteringEn } from "./sections/entering.en";
import type { setroomEn } from "./sections/setroom.en";
import type { hostsetupEn } from "./sections/hostsetup.en";
import type { hostrunEn } from "./sections/hostrun.en";
import type { hostbracketEn } from "./sections/hostbracket.en";
import type { feedEn } from "./sections/feed.en";
import type { peopleEn } from "./sections/people.en";
import type { playEn } from "./sections/play.en";
import type { browseEn } from "./sections/browse.en";
import type { mediaEn } from "./sections/media.en";
import type { uiEn } from "./sections/ui.en";
import type { alertEn } from "./sections/alert.en";
import type { seasonEn } from "./sections/season.en";
import type { leagueEn } from "./sections/league.en";
import type { historyEn } from "./sections/history.en";
import type { playnowEn } from "./sections/playnow.en";
import { eventFr } from "./sections/event.fr";
import { enteringFr } from "./sections/entering.fr";
import { setroomFr } from "./sections/setroom.fr";
import { hostsetupFr } from "./sections/hostsetup.fr";
import { hostrunFr } from "./sections/hostrun.fr";
import { hostbracketFr } from "./sections/hostbracket.fr";
import { feedFr } from "./sections/feed.fr";
import { peopleFr } from "./sections/people.fr";
import { playFr } from "./sections/play.fr";
import { browseFr } from "./sections/browse.fr";
import { mediaFr } from "./sections/media.fr";
import { uiFr } from "./sections/ui.fr";
import { alertFr } from "./sections/alert.fr";
import { seasonFr } from "./sections/season.fr";
import { leagueFr } from "./sections/league.fr";
import { historyFr } from "./sections/history.fr";
import { playnowFr } from "./sections/playnow.fr";

type SectionKey = keyof typeof eventEn | keyof typeof enteringEn | keyof typeof setroomEn | keyof typeof hostsetupEn | keyof typeof hostrunEn | keyof typeof hostbracketEn | keyof typeof feedEn | keyof typeof peopleEn | keyof typeof playEn | keyof typeof browseEn | keyof typeof mediaEn | keyof typeof uiEn | keyof typeof alertEn | keyof typeof seasonEn | keyof typeof leagueEn | keyof typeof historyEn | keyof typeof playnowEn;

const main: Record<Exclude<MessageKey, SectionKey>, string> = {
  // Language switch
  "lang.label": "Langue",
  "lang.note": "Les posts et les noms restent tels qu'écrits.",

  // Profile (guest)
  "profile.guestTitle": "Ton profil",
  "profile.guest": "Tu navigues en tant qu'invité.",
  "profile.guestBody": "Crée un compte gratuit pour choisir ton tag, suivre ta scène et afficher ton historique de tournois.",

  // Main menu
  "nav.main": "Principal",
  "nav.home": "Accueil Smashy",
  "nav.feed": "Fil",
  "nav.discuss": "Discussions",
  "nav.events": "Tournois",
  "nav.reels": "Reels",
  "nav.play": "Jouer",
  "nav.messages": "Messages",
  "nav.new": "Nouveaux joueurs",
  "nav.profile": "Profil",
  "nav.skip": "Aller au contenu",

  // Common
  "common.continue": "Continuer",
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.saving": "Enregistrement…",
  "common.close": "Fermer",
  "common.back": "Retour",
  "common.yes": "Oui",
  "common.no": "Non",
  "common.offline": "Impossible de joindre Smashy. Vérifie ta connexion et réessaie.",
  "common.tryAgain": "Impossible d'enregistrer. Réessaie.",
  "common.signInFirst": "Connecte-toi d'abord.",
  "common.showMore": "Voir {n} de plus",
  "common.copy": "Copier",
  "common.copied": "Copié",
  "common.period": ".",

  // Getting started (keys match src/lib/discovery.ts)
  "checklist.picture": "Ajoute une photo de profil",
  "checklist.mains": "Choisis tes mains",
  "checklist.bio": "Écris une courte bio",
  "checklist.follow": "Suis 3 joueurs",
  "checklist.startgg": "Lie start.gg pour afficher tes résultats",
  "checklist.post": "Dis bonjour dans le fil",
  "discover.alsoIn": "Aussi à {place}",
  "discover.playsYourGames": "Joue à tes jeux",

  // Event formats
  "format.double_elim": "Double élimination",
  "format.single_elim": "Simple élimination",
  "format.round_robin": "Round robin",
  "format.swiss": "Suisse",
  "format.then": "{first}, puis top {n} en {second}",

  // Sharing an event
  "share.postToFeed": "Publier sur mon fil",
  "share.posting": "Publication…",

  // Videos on a set
  "vods.title": "Vidéos",
  "vods.ofThisSet": "Vidéos de ce set",
  "vods.all": "Toutes les VOD →",
  "vods.add": "+ Ajouter une vidéo de ce set",
  "vods.linkLabel": "Lien vers la vidéo",
  "vods.placeholder": "https://youtu.be/… avec le moment où le set commence, si tu peux",
  "vods.addButton": "Ajouter",
  "vods.adding": "Ajout…",
  "vods.help": "YouTube, Twitch (une VOD ou un clip) ou Streamable. Uniquement des vidéos de ce set, s'il te plaît : tout le monde peut les voir.",
  "vods.notYet": "Ça ne ressemble pas encore à un lien vidéo de l'un de ces sites.",
  "vods.removeConfirm": "Retirer cette vidéo du set ?",
  "vods.remove": "Retirer",
  "vods.removing": "Retrait…",

  // Reporting something to moderators
  "report.button": "Signaler",
  "report.spam": "Spam",
  "report.harassment": "Harcèlement ou intimidation",
  "report.inappropriate": "Inapproprié",
  "report.offTopic": "Rien à voir avec smash",
  "report.other": "Autre chose",
  "report.done": "Signalé. Merci !",
  "report.failed": "Impossible de signaler.",

  // Sign-in
  "signin.title": "Rejoindre",
  "signin.pageTitle": "Rejoindre Smashy",
  "signin.intro": "Publie, suis ta scène et montre tes résultats. Naviguer sans compte reste toujours gratuit.",
  "signin.tooYoung": "Désolé, tu ne peux pas encore créer de compte.",
  "signin.tooYoungBody": "Les comptes Smashy sont pour les personnes de 13 ans et plus. Tu peux quand même parcourir les tournois et tout le reste en tant qu'invité.",
  "signin.browseEvents": "Voir les tournois →",
  "signin.discord": "Continuer avec Discord",
  "signin.google": "Continuer avec Google",
  "signin.apple": "Continuer avec Apple",
  "signin.appleFailed": "La connexion avec Apple n'a pas marché. Réessaie, ou utilise ton e-mail.",
  "signin.discordBeta": "Conseillé pendant la bêta : les liens de connexion par e-mail peuvent mettre du temps à arriver.",
  "signin.discordReady": "Le moyen le plus rapide. Les liens par e-mail marchent aussi ; regarde dans tes spams si l'un n'arrive pas.",
  "signin.quickWays": "Les moyens les plus rapides : un geste, sans attendre d'e-mail. Les liens par e-mail marchent aussi ; regarde dans tes spams si l'un n'arrive pas.",
  "signin.agreeBefore": "En rejoignant, tu acceptes les",
  "signin.terms": "Conditions",
  "signin.and": "et la",
  "signin.privacy": "Politique de confidentialité",
  "signin.wrongBirthday": "Tu as mis la mauvaise date de naissance ?",
  "signin.inviteSaved": "Code d'invitation {code} enregistré. Connecte-toi ci-dessous et il sera rempli pour toi.",
  "signin.privateBeta": "Smashy est en bêta privée : pour rejoindre, il faut un code d'invitation de quelqu'un qui y est déjà.",
  "signin.birthday": "C'est quand, ton anniversaire ?",
  "signin.birthdayNote": "On le demande à tout le monde. Ta date de naissance n'est jamais affichée sur ton profil.",
  "signin.month": "Mois",
  "signin.day": "Jour",
  "signin.year": "Année",
  "signin.checkEmail": "Vérifie tes e-mails",
  "signin.sentTo": "On a envoyé un lien et un code de connexion à {email}. Ouvre le lien sur cet appareil, ou tape le code ci-dessous.",
  "signin.codeLabel": "Ou tape le code de l'e-mail",
  "signin.codeSubmit": "Se connecter",
  "signin.badCode": "Ce code ne semble pas bon. C'est le nombre dans l'e-mail de connexion.",
  "signin.codeFailed": "Ce code n'a pas marché. Compare-le avec le dernier e-mail de connexion ; un code ne marche plus après une heure ou une fois utilisé.",
  "signin.cantFind": "Tu ne le trouves pas ?",
  "signin.spamHelp": "Regarde dans tes spams ou tes promotions. Il vient de {from} ; le marquer comme « Pas un spam » aide le prochain à arriver dans ta boîte de réception.",
  "signin.err.banned": "Ce compte est suspendu pour non-respect des règles de Smashy. Si tu penses que c'est une erreur, écris à {email}.",
  "signin.err.expired": "Ce lien de connexion a expiré ou a déjà servi. Demandes-en un nouveau ci-dessous.",
  "signin.err.rate": "Trop d'e-mails de connexion viennent d'être envoyés. Attends une minute et réessaie.",
  "signin.err.failed": "La connexion n'a pas marché. Réessaie, ou utilise un autre moyen ci-dessous.",
  "signin.err.inUse": "Ce compte est déjà relié à un autre compte Smashy. Déconnecte-toi et connecte-toi avec lui pour utiliser celui-là.",
  "people.signin.title": "Comment tu te connectes",
  "people.signin.note": "Relie un deuxième moyen de connexion, pour pouvoir te connecter même si tu perds l'accès à l'un d'eux.",
  "people.signin.connect": "Relier {name}",
  "people.signin.added": "{name} est relié. Tu peux désormais te connecter avec.",
  "people.signin.changeEmail": "Changer d’adresse e-mail",
  "people.signin.newEmail": "Nouvelle adresse e-mail",
  "people.signin.sendLinks": "Envoyer les liens",
  "people.signin.emailSent": "Presque fini : on a envoyé un lien à {old} et un à {new}. Ouvre les deux pour changer.",
  "people.signin.emailPending": "En attente du passage à {new} : ouvre les liens envoyés aux deux adresses.",
  "people.signin.emailHalf": "Un lien fait. Ouvre maintenant celui envoyé à l’autre adresse pour passer à {new}.",
  "people.signin.emailChanged": "Ton adresse e-mail est maintenant {email}.",
  "people.signin.sameEmail": "C’est déjà ton adresse.",
  "people.signin.emailInUse": "Cette adresse est déjà utilisée par un autre compte Smashy.",
  "signin.sendAgain": "Renvoyer",
  "signin.sendAgainIn": "Renvoyer dans {s} s",
  "signin.otherEmail": "Utiliser une autre adresse",
  "signin.emailLabel": "Ou reçois un lien de connexion par e-mail",
  "signin.sendLink": "Envoyer le lien",
  "signin.badDate": "Choisis une vraie date.",
  "signin.badEmail": "Entre une adresse e-mail valide.",
};

export const fr: Record<MessageKey, string> = {
  ...main,
  ...eventFr,
  ...enteringFr,
  ...setroomFr,
  ...hostsetupFr,
  ...hostrunFr,
  ...hostbracketFr,
  ...feedFr,
  ...peopleFr,
  ...playFr,
  ...browseFr,
  ...mediaFr,
  ...uiFr,
  ...alertFr,
  ...seasonFr,
  ...leagueFr,
  ...historyFr,
  ...playnowFr,
};
