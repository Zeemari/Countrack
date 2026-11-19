/**
 * Languages CounTrack speaks. English is complete; the others override it key by key and fall back
 * to English for anything missing, so a new language can ship with a partial catalog.
 *
 * To add one (Fulfulde, Kanuri, Tiv, Ibibio, Ijaw, Nupe…): add it here, add lib/i18n/<code>.json,
 * and register the file in lib/i18n/index.ts. Use the ISO 639 code so <html lang> is correct.
 */
export const LANGS = [
  { code: "en", name: "English", english: "English" },
  { code: "pcm", name: "Naijá", english: "Nigerian Pidgin" },
  { code: "ha", name: "Hausa", english: "Hausa" },
  { code: "yo", name: "Yorùbá", english: "Yoruba" },
  { code: "ig", name: "Igbo", english: "Igbo" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_CODES = LANGS.map((l) => l.code) as Lang[];
export const LANG_COOKIE = "lang";

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANG_CODES as string[]).includes(v);

/** First supported language in an Accept-Language header ("ha-NG,ha;q=0.9,en;q=0.8" → "ha"). */
export function negotiateLang(header: string | null): Lang {
  if (!header) return DEFAULT_LANG;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { base: tag.split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .filter((w) => w.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.map((w) => w.base).find(isLang) ?? DEFAULT_LANG;
}
