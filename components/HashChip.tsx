import { Fingerprint, ShieldCheck, ShieldQuestion } from "lucide-react";
import { shortHash } from "@/lib/format";
import { t } from "@/lib/i18n";

type Props = { hash: string; verified?: boolean | null; full?: boolean };

/** SHA-256 fingerprint of a photo, plus whether the server's re-hash matched. */
export function HashChip({ hash, verified, full }: Props) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-start gap-1.5 rounded-lg bg-surface-2 px-2 py-1 font-mono text-[11px] leading-relaxed text-muted ${full ? "break-all" : ""}`}
        title={hash}
      >
        <Fingerprint aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        {full ? hash : shortHash(hash)}
      </span>
      {verified === true && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ok-text">
          <ShieldCheck aria-hidden className="size-3.5" /> {t("hash.verified")}
        </span>
      )}
      {verified === false && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-review-text">
          <ShieldQuestion aria-hidden className="size-3.5" /> {t("hash.mismatch")}
        </span>
      )}
    </div>
  );
}
