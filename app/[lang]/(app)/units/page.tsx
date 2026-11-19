import { Suspense } from "react";
import { connection } from "next/server";
import { CircleAlert, Database } from "lucide-react";
import { Command, EmptyState } from "@/components/EmptyState";
import { UnitsSkeleton } from "@/components/PageSkeleton";
import { WidePage } from "@/components/WidePage";
import { t } from "@/lib/i18n";
import { loadUnits } from "./query";
import { parseUnitsQuery } from "./shared";
import { UnitBrowser } from "./UnitBrowser";
import { UnitsHero } from "./UnitsHero";

export default function UnitsPage({ searchParams }: PageProps<"/[lang]/units">) {
  return (
    <>
      <WidePage />
      {/* Live data: rendered per request, streamed in behind this fallback. */}
      <Suspense fallback={<UnitsSkeleton />}>
        <UnitList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UnitList({ searchParams }: Pick<PageProps<"/[lang]/units">, "searchParams">) {
  await connection(); // always live: statuses change as witnesses submit
  const query = parseUnitsQuery(await searchParams);
  let data;
  try {
    data = await loadUnits(query);
  } catch (e) {
    return (
      <>
        <UnitsHero />
        <EmptyState icon={CircleAlert} title={t("units.error")} body={e instanceof Error ? e.message : undefined} />
      </>
    );
  }

  const filtered = query.q || query.state || query.status !== "all";
  if (data.counts.all === 0 && !filtered)
    return (
      <>
        <UnitsHero />
        <EmptyState icon={Database} title={t("units.empty.title")} body={t("units.empty.body")}>
          <Command>npm run seed</Command>
          <p className="text-xs text-muted">{t("units.empty.hint")}</p>
        </EmptyState>
      </>
    );

  // Keyed by the query so client state (search box, page) resets when the URL changes elsewhere.
  return <UnitBrowser key={JSON.stringify({ ...query, q: "" })} query={query} {...data} />;
}
