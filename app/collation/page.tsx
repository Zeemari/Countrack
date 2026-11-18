import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BackLink } from "@/components/BackLink";
import { COLLATION_ROLES } from "@/lib/demo-users";
import { t } from "@/lib/i18n";
import { userClient } from "@/lib/supabase/server";
import { CollationForm, type FormUnit } from "./CollationForm";

export default function CollationPage() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <BackLink href="/" />
      <h1 className="text-2xl font-bold">{t("collation.title")}</h1>
      <p className="text-muted">{t("collation.hint")}</p>
      <Suspense fallback={<p className="text-muted">{t("common.loading")}</p>}>
        <Gate />
      </Suspense>
    </div>
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
      <Link href="/login?next=/collation" className="rounded-2xl bg-brand p-4 text-center font-semibold text-brand-ink">
        {t("collation.signInAs")}
      </Link>
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
