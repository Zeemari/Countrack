import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CircleAlert, Database, ScanSearch } from "lucide-react";
import { Command, EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { WidePage } from "@/components/WidePage";
import { t } from "@/lib/i18n";
import { requestLang } from "@/lib/i18n/server";
import { loadUnits } from "./query";
import { parseUnitsQuery } from "./shared";
import { UnitBrowser } from "./UnitBrowser";

export default function UnitsPage({ searchParams }: PageProps<"/[lang]/units">) {
  return (
    <>
      <WidePage />
      <PageHeader
        eyebrow={t("units.eyebrow")}
        title={t("units.title")}
        subtitle={t("units.subtitle")}
        action={
          <Link href="/irev" className="btn btn-secondary min-h-11 shrink-0 self-start px-4 text-sm md:self-auto">
            <ScanSearch aria-hidden className="size-4" /> {t("units.irevAction")}
          </Link>
        }
      />
      {/* Live data: rendered per request, streamed in behind this fallback. */}
      <Suspense fallback={<ListSkeleton />}>
        <UnitList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label={t("units.loading")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`h-28 animate-pulse rounded-2xl bg-surface-2 ${i ? "" : "col-span-2 sm:col-span-1"}`} />)}
      </div>
      <div className="h-32 animate-pulse rounded-3xl bg-surface-2" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card h-44 animate-pulse" />)}</div>
    </div>
  );
}

async function UnitList({ searchParams }: Pick<PageProps<"/[lang]/units">, "searchParams">) {
  await connection(); // always live: statuses change as witnesses submit
  const pageLang = await requestLang();
  const translate = (key: Parameters<typeof t>[0], vars?: Record<string, string | number>) => t(key, vars, pageLang);
  const query = parseUnitsQuery(await searchParams);
  let data;
  try {
    data = await loadUnits(query);
  } catch (e) {
    return <EmptyState icon={CircleAlert} title={translate("units.error")} body={e instanceof Error ? e.message : undefined} />;
  }

  const filtered = query.q || query.state || query.status !== "all";
  if (data.counts.all === 0 && !filtered)
    return (
      <EmptyState icon={Database} title={translate("units.empty.title")} body={translate("units.empty.body")}>
        <Command>npm run seed</Command>
        <p className="text-xs text-muted">{translate("units.empty.hint")}</p>
      </EmptyState>
    );

  // Keyed by the query so client state (search box, page) resets when the URL changes elsewhere.
  return <UnitBrowser key={JSON.stringify({ ...query, q: "" })} query={query} {...data} />;
}
