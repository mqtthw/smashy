// Smashy en español (neutral, para Latinoamérica y EE. UU.). Las palabras que la escena usa en inglés
// se quedan así: bracket, set, top 8, seed, DQ, stage, netplay. Cada frase de en.ts tiene que estar
// aquí (TypeScript lo revisa).
import type { MessageKey } from "./en";
import { enteringEs } from "./sections/entering.es";
import { eventEs } from "./sections/event.es";
import { setroomEs } from "./sections/setroom.es";
import { hostbracketEs } from "./sections/hostbracket.es";
import { hostrunEs } from "./sections/hostrun.es";
import { hostsetupEs } from "./sections/hostsetup.es";
import { alertEs } from "./sections/alert.es";
import { feedEs } from "./sections/feed.es";
import { peopleEs } from "./sections/people.es";
import { playEs } from "./sections/play.es";
import { browseEs } from "./sections/browse.es";
import { mediaEs } from "./sections/media.es";
import { uiEs } from "./sections/ui.es";
import { seasonEs } from "./sections/season.es";
import { leagueEs } from "./sections/league.es";
import { historyEs } from "./sections/history.es";
import { playnowEs } from "./sections/playnow.es";

export const es: Record<MessageKey, string> = {
  // Language switch
  "lang.label": "Idioma",
  "lang.note": "Las publicaciones y los nombres se quedan como se escribieron.",

  // Profile (guest)
  "profile.guestTitle": "Tu perfil",
  "profile.guest": "Estás navegando como invitado.",
  "profile.guestBody": "Crea una cuenta gratis para elegir tu tag, seguir a tu escena y mostrar tu historial de torneos.",

  // Main menu
  "nav.main": "Principal",
  "nav.home": "Inicio de Smashy",
  "nav.feed": "Inicio",
  "nav.discuss": "Foros",
  "nav.events": "Eventos",
  "nav.reels": "Reels",
  "nav.play": "Jugar",
  "nav.messages": "Mensajes",
  "nav.new": "Nuevos jugadores",
  "nav.profile": "Perfil",
  "nav.skip": "Ir al contenido",

  // Common
  "common.continue": "Continuar",
  "common.cancel": "Cancelar",
  "common.save": "Guardar",
  "common.saving": "Guardando…",
  "common.close": "Cerrar",
  "common.back": "Atrás",
  "common.yes": "Sí",
  "common.no": "No",
  "common.offline": "No se pudo conectar con Smashy. Revisa tu conexión e inténtalo de nuevo.",
  "common.tryAgain": "No se pudo guardar. Inténtalo de nuevo.",
  "common.signInFirst": "Primero inicia sesión.",
  "common.showMore": "Ver {n} más",
  "common.copy": "Copiar",
  "common.copied": "Copiado",
  "common.period": ".",

  // Getting started (keys match src/lib/discovery.ts)
  "checklist.picture": "Agrega una foto de perfil",
  "checklist.mains": "Elige tus mains",
  "checklist.bio": "Escribe una bio corta",
  "checklist.follow": "Sigue a 3 jugadores",
  "checklist.startgg": "Vincula start.gg para mostrar tus resultados",
  "checklist.post": "Saluda en el feed",
  "discover.alsoIn": "También en {place}",
  "discover.playsYourGames": "Juega tus juegos",

  // Event formats
  "format.double_elim": "Doble eliminación",
  "format.single_elim": "Eliminación simple",
  "format.round_robin": "Round robin",
  "format.swiss": "Suizo",
  "format.then": "{first}, luego top {n} en {second}",

  // Sharing an event
  "share.postToFeed": "Publicar en mi feed",
  "share.posting": "Publicando…",

  // Videos on a set
  "vods.title": "Videos",
  "vods.ofThisSet": "Videos de este set",
  "vods.all": "Todos los VODs →",
  "vods.add": "+ Agrega un video de este set",
  "vods.linkLabel": "Enlace al video",
  "vods.placeholder": "https://youtu.be/… con el momento en que empieza, si puedes",
  "vods.addButton": "Agregar",
  "vods.adding": "Agregando…",
  "vods.help": "YouTube, Twitch (un VOD o un clip) o Streamable. Solo videos de este set, por favor: cualquiera puede verlos.",
  "vods.notYet": "Eso todavía no parece un enlace a un video de esos sitios.",
  "vods.removeConfirm": "¿Quitar este video del set?",
  "vods.remove": "Quitar",
  "vods.removing": "Quitando…",

  // Reporting something to moderators
  "report.button": "Reportar",
  "report.spam": "Spam",
  "report.harassment": "Acoso o bullying",
  "report.inappropriate": "Inapropiado",
  "report.offTopic": "No es sobre smash",
  "report.other": "Otra cosa",
  "report.done": "Reportado. ¡Gracias!",
  "report.failed": "No se pudo reportar.",

  // Sign-in
  "signin.title": "Únete a",
  "signin.pageTitle": "Únete a Smashy",
  "signin.intro": "Publica, sigue a tu escena y presume tus resultados. Navegar sin cuenta siempre es gratis.",
  "signin.tooYoung": "Lo sentimos, todavía no puedes crear una cuenta.",
  "signin.tooYoungBody": "Las cuentas de Smashy son para personas de 13 años o más. Puedes seguir viendo eventos y todo lo demás como invitado.",
  "signin.browseEvents": "Ver eventos →",
  "signin.discord": "Continuar con Discord",
  "signin.google": "Continuar con Google",
  "signin.apple": "Continuar con Apple",
  "signin.appleFailed": "No se pudo entrar con Apple. Inténtalo de nuevo o usa tu correo.",
  "signin.discordBeta": "Recomendado durante la beta: los enlaces por correo pueden tardar en llegar.",
  "signin.discordReady": "La forma más rápida de entrar. Los enlaces por correo también funcionan; revisa el spam si no llega.",
  "signin.quickWays": "Las formas más rápidas: un toque, sin esperar un correo. Los enlaces por correo también funcionan; revisa el spam si no llega.",
  "signin.agreeBefore": "Al unirte aceptas los",
  "signin.terms": "Términos",
  "signin.and": "y la",
  "signin.privacy": "Política de privacidad",
  "signin.wrongBirthday": "¿Pusiste mal tu fecha de nacimiento?",
  "signin.inviteSaved": "Código de invitación {code} guardado. Inicia sesión abajo y se llena solo.",
  "signin.privateBeta": "Smashy está en beta privada: para unirte necesitas un código de invitación de alguien que ya esté dentro.",
  "signin.birthday": "¿Cuándo es tu cumpleaños?",
  "signin.birthdayNote": "Se lo preguntamos a todos. Tu fecha de nacimiento nunca aparece en tu perfil.",
  "signin.month": "Mes",
  "signin.day": "Día",
  "signin.year": "Año",
  "signin.checkEmail": "Revisa tu correo",
  "signin.sentTo": "Enviamos un enlace y un código para entrar a {email}. Abre el enlace en este dispositivo o escribe el código abajo.",
  "signin.codeLabel": "O escribe el código del correo",
  "signin.codeSubmit": "Entrar",
  "signin.badCode": "Ese código no parece correcto. Es el número del correo para entrar.",
  "signin.codeFailed": "Ese código no funcionó. Compáralo con el correo más reciente; los códigos dejan de funcionar después de una hora o al usarse.",
  "signin.cantFind": "¿No lo encuentras?",
  "signin.spamHelp": "Revisa la carpeta de spam o promociones. Llega de {from}; marcarlo como \"No es spam\" ayuda a que el siguiente llegue a tu bandeja de entrada.",
  "signin.err.banned": "Esta cuenta está suspendida por romper las reglas de Smashy. Si crees que es un error, escribe a {email}.",
  "signin.err.expired": "Ese enlace para entrar ya caducó o ya se usó. Pide uno nuevo abajo.",
  "signin.err.rate": "Se enviaron demasiados correos para entrar hace un momento. Espera un minuto e inténtalo de nuevo.",
  "signin.err.failed": "No se pudo entrar. Inténtalo de nuevo o usa otra forma de abajo.",
  "signin.err.inUse": "Esa cuenta ya está conectada a otra cuenta de Smashy. Cierra sesión y entra con ella para usar esa.",
  "people.signin.title": "Cómo entras",
  "people.accounts.title": "Cuentas",
  "people.accounts.note": "Cambia entre tus cuentas de Smashy en este dispositivo, como en X. Hasta {n}.",
  "people.accounts.switch": "Cambiar",
  "people.accounts.add": "Añadir una cuenta",
  "people.accounts.forget": "Quitar a @{handle} de este dispositivo",
  "people.accounts.full": "Este dispositivo puede guardar hasta {n} cuentas. Quita una para añadir otra.",
  "people.accounts.savedTitle": "Cuentas en este dispositivo",
  "people.accounts.continueAs": "Continuar como {name}",
  "people.accounts.switchLink": "Cambiar de cuenta",
  "people.signin.note": "Conecta una segunda forma de entrar, para no quedarte fuera si pierdes el acceso a una.",
  "people.signin.connect": "Conectar {name}",
  "people.signin.added": "{name} está conectado. Desde ahora puedes entrar con él.",
  "people.signin.changeEmail": "Cambiar correo",
  "people.signin.newEmail": "Nuevo correo",
  "people.signin.sendLinks": "Enviar enlaces",
  "people.signin.emailSent": "Casi listo: enviamos un enlace a {old} y otro a {new}. Abre los dos para cambiarlo.",
  "people.signin.emailPending": "Esperando para cambiar a {new}: abre los enlaces que enviamos a las dos direcciones.",
  "people.signin.emailHalf": "Un enlace listo. Ahora abre el que enviamos a la otra dirección para cambiar a {new}.",
  "people.signin.emailChanged": "Tu correo ahora es {email}.",
  "people.signin.sameEmail": "Ese ya es tu correo.",
  "people.signin.emailInUse": "Ese correo ya lo usa otra cuenta de Smashy.",
  "signin.sendAgain": "Enviar de nuevo",
  "signin.sendAgainIn": "Enviar de nuevo en {s} s",
  "signin.otherEmail": "Usar otro correo",
  "signin.emailLabel": "O recibe un enlace para entrar por correo",
  "signin.sendLink": "Enviar enlace",
  "signin.badDate": "Elige una fecha válida.",
  "signin.badEmail": "Escribe un correo válido.",

  ...eventEs,
  ...enteringEs,
  ...setroomEs,
  ...hostsetupEs,
  ...hostrunEs,
  ...hostbracketEs,
  ...feedEs,
  ...peopleEs,
  ...playEs,
  ...browseEs,
  ...mediaEs,
  ...uiEs,
  ...alertEs,
  ...seasonEs,
  ...leagueEs,
  ...historyEs,
  ...playnowEs,
};
