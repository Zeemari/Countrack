import { t } from "@/lib/i18n";
import type { ExtractedResult } from "@/lib/schemas";

const ROWS = [
  ["registered", "fig.registered"],
  ["accredited", "fig.accredited"],
  ["total_valid", "fig.total_valid"],
  ["rejected", "fig.rejected"],
  ["votes_cast", "fig.votes_cast"],
] as const;

/** The numbers on one result sheet: totals first, then party scores. */
export function FiguresTable({ result }: { result: ExtractedResult }) {
  const parties = Object.entries(result.party_scores).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="grid grid-cols-2 gap-3">
      <dl className="col-span-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
        {ROWS.map(([key, label]) => (
          <div key={key} className="contents">
            <dt className="text-muted">{t(label)}</dt>
            <dd className="text-right font-mono font-semibold tabular-nums">{result[key] ?? "—"}</dd>
          </div>
        ))}
      </dl>
      <ul className="col-span-2 grid grid-cols-2 gap-2">
        {parties.map(([party, votes]) => (
          <li key={party} className="flex items-baseline justify-between rounded-lg bg-bg px-3 py-2">
            <span className="font-semibold">{party}</span>
            <span className="font-mono text-lg font-bold tabular-nums">{votes}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
