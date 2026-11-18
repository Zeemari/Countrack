import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(app)/login/actions";
import { t } from "@/lib/i18n";
import { userClient } from "@/lib/supabase/server";

/** Who is signed in (header), with sign-out. Dynamic: render inside <Suspense>. */
export async function UserChip() {
  const supabase = await userClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user)
    return (
      <Link href="/login" className="btn btn-outline-light min-h-9 px-4 text-sm">
        {t("login.signIn")}
      </Link>
    );

  const { data: profile } = await supabase.from("users").select("display_name, role").eq("id", user.id).maybeSingle();
  const name: string = profile?.display_name ?? (user.is_anonymous ? t("login.anonymousName") : (user.email ?? "?"));
  const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const role = profile?.role ? t(`role.${profile.role}` as "role.witness") : null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-frame-ink/10 py-1 pr-1 pl-1 text-frame-ink">
      <Link href="/login" className="flex min-w-0 items-center gap-2 rounded-full pr-1" title={t("login.switch")}>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-black">{initials || "?"}</span>
        <span className="hidden min-w-0 flex-col gap-0.5 leading-none sm:flex">
          <span className="max-w-28 truncate text-xs font-semibold">{name}</span>
          {role && <span className="text-[10px] text-frame-muted">{role}</span>}
        </span>
      </Link>
      <form action={signOut}>
        <button
          aria-label={t("login.signOut")}
          title={t("login.signOut")}
          className="grid size-7 place-items-center rounded-full text-frame-muted hover:bg-frame-ink/10 hover:text-frame-ink"
        >
          <LogOut aria-hidden className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
