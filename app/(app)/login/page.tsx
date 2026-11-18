import { Suspense } from "react";
import { ChevronRight, CircleAlert, Eye, Megaphone, UserRound, VenetianMask } from "lucide-react";
import { Command } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { DEMO_USERS } from "@/lib/demo-users";
import { t } from "@/lib/i18n";
import { anonymousSignIn, demoSignIn } from "./actions";

const ROLE = {
  witness: { icon: UserRound, tint: "bg-brand-soft text-brand" },
  agent: { icon: Megaphone, tint: "bg-sim-bg text-sim-text" },
  observer: { icon: Eye, tint: "bg-pending-bg text-pending-text" },
} as const;

const row = "card pressable flex min-h-18 w-full items-center gap-4 p-3.5 text-left";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <PageHeader back={{ href: "/" }} title={t("login.title")} subtitle={t("login.hint")} />
      <Suspense>
        <LoginForms searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginForms({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      {error && <SignInError error={error} />}

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">{t("login.demo")}</h2>
        <ul className="flex flex-col gap-2.5 stagger">
          {DEMO_USERS.map((u) => {
            const { icon: Icon, tint } = ROLE[u.role];
            return (
              <li key={u.email}>
                <form action={demoSignIn}>
                  <input type="hidden" name="email" value={u.email} />
                  <input type="hidden" name="next" value={next} />
                  <button className={row}>
                    <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tint}`}>
                      <Icon aria-hidden className="size-6" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-sm text-muted">{t(`login.desc.${u.role}`)}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 text-muted" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> {t("login.or")} <span className="h-px flex-1 bg-border" />
      </div>

      <form action={anonymousSignIn}>
        <input type="hidden" name="next" value={next} />
        <button className={`${row} border-dashed bg-transparent shadow-none`}>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted">
            <VenetianMask aria-hidden className="size-6" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{t("login.anonymous")}</span>
            <span className="text-sm text-muted">{t("login.anonymous.hint")}</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted" />
        </button>
      </form>
    </>
  );
}

/** Turns Supabase's raw error into what to do about it. */
function SignInError({ error }: { error: string }) {
  const e = error.toLowerCase();
  const missingAccounts = e.includes("invalid login credentials") || e.includes("email not confirmed");
  const anonOff = e.includes("anonymous");
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-review-text/20 bg-review-bg p-4 text-review-text animate-rise">
      <p className="flex items-center gap-2 font-semibold">
        <CircleAlert aria-hidden className="size-5 shrink-0" /> {t("login.error")}
      </p>
      {missingAccounts ? (
        <>
          <p className="text-sm">{t("login.error.seed")}</p>
          <Command>npm run seed</Command>
        </>
      ) : anonOff ? (
        <p className="text-sm">{t("login.error.anon")}</p>
      ) : (
        <p className="font-mono text-xs break-words opacity-80">{error}</p>
      )}
    </div>
  );
}
