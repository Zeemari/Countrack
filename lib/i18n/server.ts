import "server-only";
import { cache, use } from "react";
import { lang } from "next/root-params";
import { registerServerLang } from "./index";
import { DEFAULT_LANG, isLang, type Lang } from "./langs";

/** One promise per request, so React can unwrap it with use() in any server component. */
const requestLang = cache(async (): Promise<Lang> => {
  const value = await lang();
  return isLang(value) ? value : DEFAULT_LANG;
});

registerServerLang(() => use(requestLang()));

export { requestLang };
