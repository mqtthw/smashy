// French for ./playnow.en.ts: every key there needs one here (TypeScript checks). See ../fr.ts for the house style.
import type { playnowEn } from "./playnow.en";

export const playnowFr: Record<keyof typeof playnowEn, string> = {
  "playnow.title": "Jouer maintenant",

  "playnow.req.incoming": "{who} veut jouer à {game} maintenant",
  "playnow.req.outgoing": "En attente de la réponse de {who} ({game})",
  "playnow.req.ready": "{who} est prêt à jouer à {game}",
  "playnow.req.minsLeft": "1 min restante|{n} min restantes",
  "playnow.req.accept": "On joue",
  "playnow.req.decline": "Pas maintenant",
  "playnow.req.cancel": "Annuler la demande",
  "playnow.req.theirCode": "Code de {who} :",
  "playnow.req.noCode": "{who} n'a pas encore enregistré de code pour ce jeu.",
  "playnow.req.messageThem": "Envoie-lui un message",
  "playnow.req.saveYours": "Enregistre ton code plus bas pour qu'il puisse te trouver.",

  "playnow.ask.button": "Proposer de jouer",
  "playnow.ask.buttonGame": "Proposer de jouer à {game}",
  "playnow.ask.game": "Jeu",
  "playnow.ask.sent": "C'est envoyé ! Il a 15 minutes pour répondre.",

  "playnow.card.loading": "Chargement…",
  "playnow.card.profile": "Voir le profil",

  "playnow.ping.on": "Alertes @matchmaking activées",
  "playnow.ping.off": "Recevoir les alertes @matchmaking",
  "playnow.ping.help": "Reçois une alerte sur ton téléphone quand quelqu'un écrit @matchmaking, ou tague un perso que tu mains, dans le chat {game}",
  "playnow.ping.hint": "Écris @matchmaking pour prévenir tous ceux qui cherchent des games, ou @ suivi d'un perso (comme @Fox) pour prévenir ceux qui le mainent.",
  "playnow.ping.sent": "Tu as prévenu tous ceux qui cherchent des games.",
  "playnow.ping.cooldown": "Message envoyé. Tu peux prévenir une fois toutes les 30 minutes.",
  "playnow.ping.suggest": "Suggestions de tags",
  "playnow.ping.sentMain": "Tu as prévenu les mains {chars} qui cherchent des games.",

  "playnow.looking.start": "Je cherche à jouer à {game}",
  "playnow.looking.for": "Pendant combien de temps",
  "playnow.looking.mins": "{n} minutes",
  "playnow.looking.hours": "1 heure|{n} heures",
  "playnow.looking.on": "Tes amis voient que tu cherches à jouer à {game} jusqu'à",
  "playnow.looking.stop": "Arrêter",
  "playnow.looking.note": "Visible par vos abonnés mutuels. Se désactive tout seul.",

  "playnow.code.placeholder": "Ton code",
  "playnow.code.save": "Enregistrer",
  "playnow.code.saved": "Enregistré.",
  "playnow.code.note": "Visible uniquement par les joueurs que vous acceptez.",

  "playnow.friends.title": "Amis",
  "playnow.friends.none": "Pas encore d'amis ici. Suis des joueurs qui te suivent aussi et ils apparaîtront ici.",
  "playnow.friends.looking": "Cherche à jouer à {game}",

  "playnow.slippi.open": "Ouvrir Slippi",
  "playnow.slippi.title": "Ouvre Slippi Launcher sur cet ordinateur et copie le code",
  "playnow.slippi.how": "Un site ne peut pas donner le code à Slippi : dans Melee, choisis Online, puis Direct, et tape-le.",

  "playnow.notif.ping": "{who} cherche des games dans le chat {game}",
  "playnow.notif.pingMain": "{who} cherche des games contre {character} dans le chat {game}",
  "playnow.notif.request": "{who} veut jouer à {game} maintenant",
  "playnow.notif.accepted": "{who} a accepté de jouer à {game}",
  "playnow.alert.ping": "{who} cherche des games de {game}",
  "playnow.alert.pingBody": "Touche pour ouvrir le chat.",
  "playnow.alert.pingMain": "{who} cherche des games contre {character}",
  "playnow.alert.request": "{who} veut jouer à {game} maintenant",
  "playnow.alert.requestBody": "Touche pour répondre. Ça se termine dans 15 minutes.",
  "playnow.alert.accepted": "{who} est prêt à jouer à {game}",
  "playnow.alert.acceptedBody": "Touche pour voir son code.",
  "playnow.settings.requests": "Demandes pour jouer",

  "playnow.err.alreadyAsked": "Tu as déjà demandé. Laisse-lui quelques minutes.",
  "playnow.err.tooMany": "Ça fait beaucoup de demandes. Réessaie un peu plus tard.",
  "playnow.err.cantAsk": "Tu ne peux pas proposer à ce joueur.",
  "playnow.err.ended": "Cette demande est terminée.",
  "playnow.err.failed": "Ça n'a pas marché. Réessaie.",
};
