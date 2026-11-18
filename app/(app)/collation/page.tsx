import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { COLLATION_ROLES } from "@/lib/demo-users";
import { t } from "@/lib/i18n";
import { userClient } from "@/lib/supabase/server";
import { CollationForm, type FormUnit } from "./CollationForm";

export default function CollationPage() {
  return (
    <>
      <PageHeader title={t("collation.title")} subtitle={t("collation.hint")} />
      <div className="w-full max-w-2xl">
        <Suspense fallback={<div className="card h-64 animate-pulse" />}>
          <Gate />
        </Suspense>
      </div>
    </>
  );
}

/** Only party agents and observers may enter figures (also enforced by the API). */
async function Gate() {
  await connection();
  const supabase = await userClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!profile || !(COLLATION_ROLES as readonly string[]).includes(profile.role))
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-10 text-center animate-rise">
        <span className="grid size-14 place-items-center rounded-2xl bg-sim-bg text-sim-text">
          <Lock aria-hidden className="size-7" />
        </span>
        <p className="max-w-xs text-muted">{t("collation.restricted")}</p>
        <Link href="/login?next=/collation" className="btn btn-primary w-full">
          {t("collation.signInAs")} <ArrowRight aria-hidden className="size-5" />
        </Link>
      </div>
    );

  const { data } = await supabase
    .from("polling_units")
    .select("id, code, name, unit_results(agreed_scores)")
    .order("code");
  const units: FormUnit[] = (data ?? []).map((u) => {
    const r = Array.isArray(u.unit_results) ? u.unit_results[0] : u.unit_results;
    const parties = Object.keys((r?.agreed_scores as { party_scores?: object } | null)?.party_scores ?? {});
    return { id: u.id, code: u.code, name: u.name, parties: parties.length ? parties.sort() : ["PA", "PB", "PC", "PD"] };
  });
  return <CollationForm units={units} />;
}
