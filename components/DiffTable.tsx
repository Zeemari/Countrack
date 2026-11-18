import { CircleCheck, Scale } from "lucide-react";
import { signed } from "@/lib/format";
import { t } from "@/lib/i18n";
import { hasMismatch } from "@/lib/rules/diff";
import type { PartyDiff } from "@/lib/schemas";

type Props = {
  diffs: PartyDiff[];
  source: string;
  announcedAt: string; // already formatted
  wallAccredited: number | null;
};

/** Side-by-side: verified wall result vs an announced/collated figure. */
export function DiffTable({ diffs, source, announcedAt, wallAccredited }: Props) {
  const mismatch = hasMismatch(diffs);
  const announcedTotal = diffs.reduce((s, d) => s + d.announced_votes, 0);
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-3 ${mismatch ? "border-review-text/25" : "border-border"}`}>
      <p
        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold ${mismatch ? "bg-review-bg text-review-text" : "bg-ok-bg text-ok-text"}`}
      >
        {mismatch ? <Scale aria-hidden className="size-5" /> : <CircleCheck aria-hidden className="size-5" />}
        {mismatch ? t("diff.mismatch") : t("diff.match")}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-2 py-1 font-medium">{t("diff.party")}</th>
            <th className="px-2 py-1 text-right font-medium">{t("diff.wall")}</th>
            <th className="px-2 py-1 text-right font-medium">{t("diff.announced")}</th>
            <th className="px-2 py-1 text-right font-medium">{t("diff.difference")}</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {diffs.map((d) => (
            <tr key={d.party} className={d.difference ? "bg-review-bg text-review-text" : ""}>
              <td className="rounded-l-lg px-2 py-2 font-sans font-semibold">{d.party}</td>
              <td className="px-2 py-2 text-right">{d.wall_votes}</td>
              <td className="px-2 py-2 text-right">{d.announced_votes}</td>
              <td className="rounded-r-lg px-2 py-2 text-right font-bold">{d.difference ? signed(d.difference) : "0"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {wallAccredited !== null && announcedTotal > wallAccredited && (
        <p className="text-sm text-review-text">{t("diff.overAccredited", { total: announcedTotal, accredited: wallAccredited })}</p>
      )}
      <p className="px-1 text-xs text-muted">{t("diff.source", { source, time: announcedAt })}</p>
    </div>
  );
}
