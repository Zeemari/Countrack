import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Scale, Truck } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { StatusBadge } from "@/components/StatusBadge";
import { t } from "@/lib/i18n";
import { publicClient } from "@/lib/supabase/server";
import type { UnitStatus } from "@/lib/schemas";

export default function UnitsPage() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <BackLink href="/" />
      <h1 className="text-2xl font-bold">{t("units.title")}</h1>
      {/* Live data: rendered per request, streamed in behind this fallback. */}
      <Suspense fallback={<p className="text-muted">{t("units.loading")}</p>}>
        <UnitList />
      </Suspense>
    </div>
  );
}

type Row = {
  id: string;
  code: string;
  name: string;
  ward: string;
  lga: string;
  moved: boolean;
  unit_results: { status: UnitStatus; witness_count: number } | { status: UnitStatus; witness_count: number }[] | null;
  discrepancies: { count: number }[];
};

async function UnitList() {
  await connection(); // always live: statuses change as witnesses submit
  const { data, error } = await publicClient()
    .from("polling_units")
    .select("id, code, name, ward, lga, moved, unit_results(status, witness_count), discrepancies(count)")
    .order("code")
    .returns<Row[]>();

  if (error) return <p className="rounded-xl bg-review-bg p-4 text-review-text">{t("units.error")}</p>;
  if (!data.length) return <p className="text-muted">{t("units.empty")}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((u) => {
        // One-to-one embeds may come back as an object or a 1-item array.
        const result = Array.isArray(u.unit_results) ? u.unit_results[0] : u.unit_results;
        const status = result?.status ?? "pending";
        const witnesses = result?.witness_count ?? 0;
        const mismatches = u.discrepancies[0]?.count ?? 0;
        return (
          <li key={u.id}>
           <Link href={`/units/${u.code}`} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm text-muted">{u.code}</p>
                <p className="font-semibold leading-snug">{u.name}</p>
                <p className="text-sm text-muted">{u.ward} · {u.lga}</p>
              </div>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-muted">{t(`status.${status}.detail`, { n: witnesses })}</p>
            {mismatches > 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-review-bg px-3 py-2 text-sm font-medium text-review-text">
                <Scale aria-hidden className="size-4 shrink-0" /> {t("units.mismatch")}
              </p>
            )}
            {u.moved && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Truck aria-hidden className="size-4" /> {t("units.moved")}
              </p>
            )}
           </Link>
          </li>
        );
      })}
    </ul>
  );
}
