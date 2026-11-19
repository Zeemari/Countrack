import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import { CheckinPanel } from "@/components/solidarity/CheckinPanel";
import { t } from "@/lib/i18n";
import { requestLang } from "@/lib/i18n/server";
import { SOLIDARITY_ENABLED } from "@/lib/solidarity/config";
import { publicClient } from "@/lib/supabase/server";

export default function CheckinPage({ params }: PageProps<"/[lang]/units/[code]/checkin">) {
  if (!SOLIDARITY_ENABLED) notFound();
  return (
    <Suspense fallback={<div className="card h-64 animate-pulse" />}>
      <Checkin params={params} />
    </Suspense>
  );
}

async function Checkin({ params }: Pick<PageProps<"/[lang]/units/[code]/checkin">, "params">) {
  await connection();
  const { code } = await params;
  const pageLang = await requestLang();
  const { data: unit } = await publicClient()
    .from("polling_units")
    .select("id, code, name")
    .eq("code", decodeURIComponent(code))
    .maybeSingle();
  if (!unit) notFound();

  return (
    <>
      <PageHeader
        back={{ href: `/units/${encodeURIComponent(unit.code)}`, label: unit.name }}
        title={t("sol.checkin.title", undefined, pageLang)}
        subtitle={`${unit.name} · ${t("sol.checkin.subtitle", undefined, pageLang)}`}
      />
      <CheckinPanel unitId={unit.id} />
    </>
  );
}
