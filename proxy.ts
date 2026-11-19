import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isLang, LANG_COOKIE, negotiateLang, type Lang } from "@/lib/i18n/langs";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Picks the page language and refreshes the Supabase auth cookie.
 *
 * Pages live under app/[lang]/ but URLs stay clean: /units is rewritten to /ha/units for a Hausa
 * reader (cookie first, then the browser's Accept-Language). A prefixed URL such as /yo/units is
 * served as-is and remembers that choice, so a link shared in Yorùbá opens in Yorùbá.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  const isPage = !pathname.startsWith("/api/");

  let rewriteTo: URL | null = null;
  let remember: Lang | null = null;
  if (isPage) {
    if (isLang(first)) {
      if (request.cookies.get(LANG_COOKIE)?.value !== first) remember = first;
    } else {
      const saved = request.cookies.get(LANG_COOKIE)?.value;
      const lang = isLang(saved) ? saved : negotiateLang(request.headers.get("accept-language"));
      rewriteTo = request.nextUrl.clone();
      rewriteTo.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
    }
  }

  const respond = () => (rewriteTo ? NextResponse.rewrite(rewriteTo, { request }) : NextResponse.next({ request }));
  let response = respond();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = respond();
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  if (remember) response.cookies.set(LANG_COOKIE, remember, { path: "/", maxAge: YEAR, sameSite: "lax" });
  return response;
}

export const config = {
  // Skip Next internals and public files (anything with a file extension).
  matcher: ["/((?!_next/|icons/|.*\\.[a-zA-Z0-9]+$).*)"],
};
