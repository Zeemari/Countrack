"use server";

import { redirect } from "next/navigation";
import { DEMO_USERS } from "@/lib/demo-users";
import { userClient } from "@/lib/supabase/server";

/** Only allow redirects to local paths. */
const safeNext = (v: FormDataEntryValue | null) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/";

/** Signs in as a seeded demo account. The password stays on the server. */
export async function demoSignIn(formData: FormData) {
  const email = formData.get("email");
  const next = safeNext(formData.get("next"));
  if (!DEMO_USERS.some((u) => u.email === email)) redirect("/login?error=unknown");

  const supabase = await userClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email as string,
    password: process.env.DEMO_PASSWORD ?? "countrack-demo",
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(next);
}

/** Anonymous witness account (enable "Anonymous sign-ins" in Supabase Auth settings). */
export async function anonymousSignIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await userClient();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(next);
}

export async function signOut() {
  const supabase = await userClient();
  await supabase.auth.signOut();
  redirect("/login");
}
