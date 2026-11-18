import { t } from "@/lib/i18n";
import type { ExtractedResult } from "@/lib/schemas";

const ROWS = [
  ["registered", "fig.registered"],
  ["accredited", "fig.accredited"],
  ["total_valid", "fig.total_valid"],
  ["rejected", "fig.rejected"],
  ["votes_cast", "fig.votes_cast"],
] as const;

/** The numbers on one result sheet: party scores as bars, then the totals. */
export function FiguresTable({ result }: { result: ExtractedResult }) {
  const parties = Object.entries(result.party_scores).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...parties.map(([, v]) => v ?? 0));
  const lead = parties.reduce((best, cur) => ((cur[1] ?? 0) > (best[1] ?? 0) ? cur : best), parties[0]);

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2.5">
        {parties.map(([party, votes]) => {
          const pct = ((votes ?? 0) / max) * 100;
          return (
            <li key={party} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
              <span className="font-semibold">{party}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <span
                  className={`block h-full rounded-full ${party === lead?.[0] ? "bg-brand" : "bg-brand/45"}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="min-w-12 text-right font-mono text-lg font-bold tabular-nums">{votes ?? "—"}</span>
            </li>
          );
        })}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 rounded-xl bg-surface-2 px-4 py-2 text-sm">
        {ROWS.map(([key, label], i) => (
          <div key={key} className={`contents ${i ? "[&>*]:border-t [&>*]:border-border" : ""}`}>
            <dt className="py-2 text-muted">{t(label)}</dt>
            <dd className="py-2 text-right font-mono font-semibold tabular-nums">{result[key] ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
