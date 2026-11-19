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

/**
 * Remembers the choice for a year, then reloads the current page (without any /xx prefix) in it.
 *
 * First drops the pages the service worker saved (public/sw.js): they are keyed by URL, not language,
 * and on a slow phone connection the worker answers from them after a few seconds, so the reload
 * would show the old language. Static JS/CSS stays cached; pages are saved again as they're visited.
 */
export async function switchLang(code: Lang) {
  document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    if ("caches" in window) {
      for (const name of await caches.keys()) {
        if (!name.startsWith("countrack-")) continue;
        const cache = await caches.open(name);
        const pages = (await cache.keys()).filter((req) => {
          const path = new URL(req.url).pathname;
          return !path.startsWith("/_next/static/") && !path.startsWith("/icons/") && path !== "/manifest.webmanifest";
        });
        await Promise.all(pages.map((req) => cache.delete(req)));
      }
    }
  } catch {
    /* storage blocked: reload anyway */
  }
  const { pathname, search, hash } = window.location;
  window.location.assign(stripLang(pathname) + search + hash);
}
