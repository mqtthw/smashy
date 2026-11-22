// Should a "Translate" button show under this text? A quick guess in the browser (no network): text in
// another script (Japanese, Korean, Chinese, Cyrillic, Arabic...), or Latin-script text whose common
// words look like Spanish, Portuguese, French or German rather than the reader's language.

/** Languages Smashy translates into. Readers with any other browser language get English. */
export const TRANSLATE_LANGS = new Set(["en", "es", "pt", "fr", "de", "it", "ja", "ko", "zh", "nl", "sv", "pl"]);

/** "es-MX" -> "es"; a language Smashy doesn't translate into -> "en". */
export function targetLanguage(lang: string | null | undefined): string {
  const base = String(lang ?? "en").toLowerCase().split(/[-_]/)[0];
  return TRANSLATE_LANGS.has(base) ? base : "en";
}

const COMMON: Record<string, string[]> = {
  en: ["the", "and", "is", "are", "you", "this", "that", "with", "for", "was", "what", "how", "my", "your", "to", "of", "in", "it"],
  es: ["el", "la", "los", "las", "que", "y", "es", "por", "para", "con", "una", "pero", "muy", "como", "del", "qué", "está", "jugar"],
  pt: ["o", "os", "não", "uma", "que", "com", "para", "muito", "mais", "você", "está", "isso", "jogo", "é"],
  fr: ["le", "les", "des", "est", "une", "pas", "que", "pour", "avec", "c'est", "très", "qui", "je", "mais"],
  de: ["der", "die", "das", "und", "ist", "nicht", "ein", "eine", "mit", "ich", "auf", "sehr", "aber", "wie"],
};

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+|[@#][\w]+/g, " ")
    .split(/[^\p{L}']+/u)
    .filter(Boolean);
}

/** The language the words most look like, or null if there's too little to tell. */
export function guessLatinLanguage(text: string): string | null {
  const w = words(text);
  if (w.length < 3) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const [lang, list] of Object.entries(COMMON)) {
    const set = new Set(list);
    const score = w.filter((x) => set.has(x)).length / w.length;
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  return bestScore >= 0.12 ? best : null;
}

/** True when the reader (browser language `readerLang`, e.g. "en-US") probably can't read `text` as is. */
export function looksForeign(text: string, readerLang: string): boolean {
  // The language a translation would come out in (a Russian browser gets English, so English isn't "foreign").
  const reader = targetLanguage(readerLang);
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 2) return false;
  const nonLatin = letters.filter((c) => !/\p{Script=Latin}/u.test(c)).length;
  // Mostly another script. (Japanese/Korean/Chinese readers: their own script isn't "foreign".)
  if (nonLatin / letters.length > 0.3) {
    const sample = letters.find((c) => !/\p{Script=Latin}/u.test(c)) ?? "";
    if (reader === "ja" && /\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han}/u.test(sample)) return false;
    if (reader === "ko" && /\p{Script=Hangul}/u.test(sample)) return false;
    if (reader === "zh" && /\p{Script=Han}/u.test(sample)) return false;
    return true;
  }
  const guess = guessLatinLanguage(text);
  return guess !== null && guess !== reader;
}
