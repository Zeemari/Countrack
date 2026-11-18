import { CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { t } from "@/lib/i18n";
import type { CheckFlag } from "@/lib/schemas";

/** Rule-check results in plain language. Never accusatory: these are prompts to look closer. */
export function FlagList({ flags }: { flags: CheckFlag[] }) {
  if (!flags.length)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-ok-bg px-3 py-2.5 text-sm font-medium text-ok-text">
        <CircleCheck aria-hidden className="size-4 shrink-0" /> {t("flag.allPass")}
      </p>
    );
  return (
    <ul className="flex flex-col gap-2">
      {flags.map((f, i) => {
        const Icon = f.severity === "blocking" ? CircleHelp : TriangleAlert;
        const detail =
          f.expected !== undefined && f.actual !== undefined && f.code !== "LOW_CONFIDENCE"
            ? ` (${f.actual} vs ${f.expected})`
            : f.field
              ? ` (${f.field})`
              : "";
        return (
          <li key={i} className="flex items-start gap-2 rounded-xl bg-review-bg px-3 py-2.5 text-sm text-review-text">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{t(`flag.${f.code}`)}{detail}</span>
          </li>
        );
      })}
    </ul>
  );
}
