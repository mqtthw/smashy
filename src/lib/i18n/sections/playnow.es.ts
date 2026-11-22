// Spanish for ./playnow.en.ts: every key there needs one here (TypeScript checks).
import type { playnowEn } from "./playnow.en";

export const playnowEs: Record<keyof typeof playnowEn, string> = {
  "playnow.title": "Jugar ya",

  "playnow.req.incoming": "{who} quiere jugar {game} ahora",
  "playnow.req.outgoing": "Esperando a que {who} responda ({game})",
  "playnow.req.ready": "{who} está listo para jugar {game}",
  "playnow.req.minsLeft": "Queda 1 min|Quedan {n} min",
  "playnow.req.accept": "¡A jugar!",
  "playnow.req.decline": "Ahora no",
  "playnow.req.cancel": "Cancelar solicitud",
  "playnow.req.theirCode": "Código de {who}:",
  "playnow.req.noCode": "{who} todavía no ha guardado un código para este juego.",
  "playnow.req.messageThem": "Mándale un mensaje",
  "playnow.req.saveYours": "Guarda tu código abajo para que te pueda encontrar.",

  "playnow.ask.button": "Invitar a jugar",
  "playnow.ask.buttonGame": "Invitar a jugar {game}",
  "playnow.ask.game": "Juego",
  "playnow.ask.sent": "¡Listo! Tiene 15 minutos para responder.",

  "playnow.card.loading": "Cargando…",
  "playnow.card.profile": "Ver perfil",

  "playnow.ping.on": "Avisos de @matchmaking activados",
  "playnow.ping.off": "Recibir avisos de @matchmaking",
  "playnow.ping.help": "Recibe un aviso en el teléfono cuando alguien escriba @matchmaking, o mencione un personaje que usas, en el chat de {game}",
  "playnow.ping.hint": "Escribe @matchmaking para avisar a todos los que buscan partidas, o @ y un personaje (como @Fox) para avisar a quienes lo usan.",
  "playnow.ping.sent": "Avisaste a todos los que buscan partidas.",
  "playnow.ping.cooldown": "Mensaje enviado. Puedes avisar una vez cada 30 minutos.",
  "playnow.ping.suggest": "Sugerencias de etiquetas",
  "playnow.ping.sentMain": "Avisaste a quienes usan {chars} y buscan partidas.",

  "playnow.looking.start": "Busco jugar {game}",
  "playnow.looking.for": "Por cuánto tiempo",
  "playnow.looking.mins": "{n} minutos",
  "playnow.looking.hours": "1 hora|{n} horas",
  "playnow.looking.on": "Tus amigos ven que buscas jugar {game} hasta las",
  "playnow.looking.stop": "Parar",
  "playnow.looking.note": "Lo ven quienes se siguen contigo. Se apaga solo.",

  "playnow.code.placeholder": "Tu código",
  "playnow.code.save": "Guardar",
  "playnow.code.saved": "Guardado.",
  "playnow.code.note": "Solo lo ven los jugadores a los que aceptas.",

  "playnow.friends.title": "Amigos",
  "playnow.friends.none": "Todavía no hay amigos aquí. Sigue a jugadores que te sigan y aparecerán aquí.",
  "playnow.friends.looking": "Busca jugar {game}",

  "playnow.slippi.open": "Abrir Slippi",
  "playnow.slippi.title": "Abre Slippi Launcher en esta computadora y copia el código",
  "playnow.slippi.how": "Una web no puede pasarle el código a Slippi: en Melee, elige Online, luego Direct, y escríbelo.",

  "playnow.notif.ping": "{who} busca partidas en el chat de {game}",
  "playnow.notif.pingMain": "{who} busca partidas contra {character} en el chat de {game}",
  "playnow.notif.request": "{who} quiere jugar {game} ahora",
  "playnow.notif.accepted": "{who} aceptó jugar {game}",
  "playnow.alert.ping": "{who} busca partidas de {game}",
  "playnow.alert.pingBody": "Toca para abrir el chat.",
  "playnow.alert.pingMain": "{who} busca partidas contra {character}",
  "playnow.alert.request": "{who} quiere jugar {game} ahora",
  "playnow.alert.requestBody": "Toca para responder. Termina en 15 minutos.",
  "playnow.alert.accepted": "{who} está listo para jugar {game}",
  "playnow.alert.acceptedBody": "Toca para ver su código.",
  "playnow.settings.requests": "Invitaciones a jugar",

  "playnow.err.alreadyAsked": "Ya le preguntaste. Dale unos minutos.",
  "playnow.err.tooMany": "Son muchas invitaciones. Inténtalo en un rato.",
  "playnow.err.cantAsk": "No puedes invitar a este jugador.",
  "playnow.err.ended": "Esta invitación ya terminó.",
  "playnow.err.failed": "No funcionó. Inténtalo otra vez.",
};
