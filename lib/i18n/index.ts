import * as React from "react";
import en from "./en.json";
import ha from "./ha.json";
import ig from "./ig.json";
import pcm from "./pcm.json";
import yo from "./yo.json";
import { DEFAULT_LANG, isLang, type Lang } from "./langs";

export { LANGS, isLang, type Lang } from "./langs";
export type MessageKey = keyof typeof en;
type Catalog = Partial<Record<MessageKey, string>>;

// Other languages are partial overrides of English; missing keys fall back to English.
const catalogs: Record<Lang, Catalog> = { en, pcm: pcm as Catalog, ha: ha as Catalog, yo: yo as Catalog, ig: ig as Catalog };

/**
 * The language of the page being rendered, so `t()` needs no argument anywhere:
 * - In the browser: <html lang>, set by app/[lang]/layout.tsx. Switching language reloads the page.
 * - Rendering client components on the server: LangContext, provided by the root layout.
 * - Rendering server components: the [lang] root param (registered by lib/i18n/server.ts).
 * Anything called outside rendering falls back to English rather than throwing.
 */
export const LangContext: React.Context<Lang> | null =
  typeof React.createContext === "function" ? React.createContext<Lang>(DEFAULT_LANG) : null;

let browserLang: Lang | null = null;
let serverReader: (() => Lang) | null = null;

/** Called once by lib/i18n/server.ts (server components only). */
export function registerServerLang(read: () => Lang) {
  serverReader = read;
}

export function currentLang(): Lang {
  if (typeof document !== "undefined") {
    browserLang ??= isLang(document.documentElement.lang) ? document.documentElement.lang : DEFAULT_LANG;
    return browserLang;
  }
  if (LangContext) {
    try {
      // t() is called from render code everywhere, so reading context here (not in a hook) is the
      // point. use(Context) never suspends, so the catch only sees "called outside a render".
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return React.use(LangContext);
    } catch {
      return DEFAULT_LANG; // outside a component render
    }
  }
  if (!serverReader) return DEFAULT_LANG;
  try {
    return serverReader();
  } catch (e) {
    // Outside a render React has no dispatcher (a TypeError); anything else is React suspending.
    if (e instanceof TypeError) return DEFAULT_LANG;
    throw e;
  }
}

/** t("status.verified.detail", { n: 3 }) → "3 witnesses agree" (in the page's language). */
export function t(key: MessageKey, vars?: Record<string, string | number>, lang: Lang = currentLang()): string {
  // Fall back to English, then to the key itself, so a missing string never crashes a page.
  const text: string = catalogs[lang]?.[key] ?? en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text;
}
