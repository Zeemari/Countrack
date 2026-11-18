import { Suspense } from "react";
import { Eye, Megaphone, UserRound, VenetianMask } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { DEMO_USERS } from "@/lib/demo-users";
import { t } from "@/lib/i18n";
import { anonymousSignIn, demoSignIn } from "./actions";

const ROLE_ICON = { witness: UserRound, agent: Megaphone, observer: Eye } as const;
const btn =
  "flex min-h-16 w-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left font-semibold shadow-sm active:scale-[0.98]";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <BackLink href="/" />
      <h1 className="text-2xl font-bold">{t("login.title")}</h1>
      <p className="text-muted">{t("login.hint")}</p>
      <Suspense>
        <LoginForms searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginForms({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      {error && <p className="rounded-xl bg-review-bg p-3 text-sm text-review-text">{t("login.error")} ({error})</p>}
      <ul className="flex flex-col gap-3">
        {DEMO_USERS.map((u) => {
          const Icon = ROLE_ICON[u.role];
          return (
            <li key={u.email}>
              <form action={demoSignIn}>
                <input type="hidden" name="email" value={u.email} />
                <input type="hidden" name="next" value={next} />
                <button className={btn}>
                  <Icon aria-hidden className="size-7 text-brand" />
                  <span className="flex flex-col">
                    {u.name}
                    <span className="text-sm font-normal text-muted">{t(`role.${u.role}`)}</span>
                  </span>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
      <form action={anonymousSignIn}>
        <input type="hidden" name="next" value={next} />
        <button className={`${btn} border-dashed`}>
          <VenetianMask aria-hidden className="size-7 text-muted" />
          {t("login.anonymous")}
        </button>
      </form>
    </>
  );
}
