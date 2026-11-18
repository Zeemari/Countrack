import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { t } from "@/lib/i18n";
import { userClient } from "@/lib/supabase/server";

/** Shows who is signed in, with switch/sign-out. Dynamic: render inside <Suspense>. */
export async function UserChip() {
  const supabase = await userClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user)
    return (
      <Link href="/login" className="inline-flex min-h-11 items-center gap-2 font-medium text-brand">
        <CircleUserRound aria-hidden className="size-5" /> {t("login.signIn")}
      </Link>
    );

  const { data: profile } = await supabase.from("users").select("display_name, role").eq("id", user.id).maybeSingle();
  const name = profile?.display_name ?? (user.is_anonymous ? t("login.anonymousName") : user.email);

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-sm shadow-sm">
      <span className="flex min-w-0 items-center gap-2">
        <CircleUserRound aria-hidden className="size-5 shrink-0 text-brand" />
        <span className="truncate">
          {name}
          {profile?.role && <span className="text-muted"> · {t(`role.${profile.role}` as "role.witness")}</span>}
        </span>
      </span>
      <form action={signOut}>
        <button className="min-h-11 px-2 font-medium text-brand">{t("login.switch")}</button>
      </form>
    </div>
  );
}
