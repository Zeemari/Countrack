import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, key };
}

/** Anonymous, session-less client for public read-only pages (RLS: public read). */
export function publicClient() {
  const { url, key } = env();
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Client acting as the signed-in user (cookie session). Use in server actions and route handlers. */
export async function userClient() {
  const { url, key } = env();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only; proxy.ts refreshes sessions.
        }
      },
    },
  });
}
