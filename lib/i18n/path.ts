"use client";

import { usePathname } from "next/navigation";
import { isLang, LANG_COOKIE, type Lang } from "./langs";

/** "/ha/units" → "/units". Server renders see the rewritten path, the browser the clean one. */
export const stripLang = (path: string) => {
  const [, first, ...rest] = path.split("/");
  return isLang(first) ? `/${rest.join("/")}` : path;
};

/** usePathname() without the language prefix, identical on the server and in the browser. */
export const useAppPath = () => stripLang(usePathname() ?? "/");

/** Remembers the choice for a year, then reloads the current page (without any /xx prefix) in it. */
export function switchLang(code: Lang) {
  document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  const { pathname, search, hash } = window.location;
  window.location.assign(stripLang(pathname) + search + hash);
}
