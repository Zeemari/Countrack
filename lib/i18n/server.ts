import "server-only";
import { cache, use } from "react";
import { lang } from "next/root-params";
import { registerServerLang } from "./index";
import { DEFAULT_LANG, isLang, type Lang } from "./langs";

/** The language once known, per request. cache() is request-scoped and, unlike use(), still works after an await. */
const resolved = cache((): { lang: Lang | null } => ({ lang: null }));

/** One promise per request. The root layout awaits it first, so the language is known before any page renders. */
const requestLang = cache(async (): Promise<Lang> => {
  const value = await lang();
  const result = isLang(value) ? value : DEFAULT_LANG;
  resolved().lang = result;
  return result;
});

// Read the stored language; only unwrap the promise with use() before it has resolved. Calling use()
// after an await in an async server component logs "Invalid hook call" and loses the language.
registerServerLang(() => resolved().lang ?? use(requestLang()));

export { requestLang };
