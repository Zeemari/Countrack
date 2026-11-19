import { CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { t } from "@/lib/i18n";
import type { UnitStatus } from "@/lib/schemas";

const STYLE = {
  verified: { icon: CircleCheck, cls: "bg-ok-bg text-ok-text" },
  pending: { icon: Clock, cls: "bg-pending-bg text-pending-text" },
  // Amber, not red: "needs review" is a prompt to look, not an accusation.
  flagged: { icon: TriangleAlert, cls: "bg-review-bg text-review-text" },
} as const;

export function StatusBadge({ status, size = "md" }: { status: UnitStatus; size?: "sm" | "md" }) {
  const { icon: Icon, cls } = STYLE[status];
  const sz = size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-sm gap-1.5";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full font-semibold ${sz} ${cls}`}>
      <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} />
      {t(`status.${status}`)}
    </span>
  );
}

/** Shows how many distinct witness accounts have submitted reports for this unit. */
export function WitnessMeter({ count, status }: { count: number; status: UnitStatus }) {
  const fill = status === "verified" ? "bg-brand" : status === "flagged" ? "bg-accent" : "bg-brand/60";
  const label = status === "verified" ? t("status.verified.detail", { n: count }) : t("unit.progress", { n: count });
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className={`h-1.5 w-7 rounded-full ${count > 0 ? fill : "bg-surface-2"}`} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
