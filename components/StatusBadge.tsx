import { CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { t } from "@/lib/i18n";
import type { UnitStatus } from "@/lib/schemas";

const STYLE = {
  verified: { icon: CircleCheck, cls: "bg-ok-bg text-ok-text" },
  pending: { icon: Clock, cls: "bg-pending-bg text-pending-text" },
  // Amber, not red: "needs review" is a prompt to look, not an accusation.
  flagged: { icon: TriangleAlert, cls: "bg-review-bg text-review-text" },
} as const;

export function StatusBadge({ status }: { status: UnitStatus }) {
  const { icon: Icon, cls } = STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${cls}`}>
      <Icon aria-hidden className="size-4" />
      {t(`status.${status}`)}
    </span>
  );
}
