import { FlaskConical } from "lucide-react";
import { t } from "@/lib/i18n";

/** Always-visible notice that every result in this demo is simulated. */
export function SimulatedBanner() {
  return (
    <div
      role="note"
      className="sticky top-0 z-10 flex items-center justify-center gap-2 bg-sim-bg px-4 py-2 text-sm font-semibold text-sim-text"
    >
      <FlaskConical aria-hidden className="size-4 shrink-0" />
      {t("banner.simulated")}
    </div>
  );
}
