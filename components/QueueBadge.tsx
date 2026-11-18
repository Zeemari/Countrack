"use client";

import Link from "next/link";
import { ChevronRight, CloudUpload } from "lucide-react";
import { t } from "@/lib/i18n";
import { useCaptures } from "@/lib/offline/hooks";

/** "2 photos waiting to upload" link; hidden when the queue is empty. */
export function QueueBadge() {
  const pending = useCaptures()?.filter((c) => c.status !== "done").length ?? 0;
  if (!pending) return null;
  return (
    <Link
      href="/queue"
      className="pressable flex min-h-14 items-center gap-3 rounded-2xl border border-accent/40 bg-sim-bg px-4 font-medium text-sim-text animate-rise"
    >
      <span className="relative grid size-8 place-items-center rounded-full bg-accent/30">
        <CloudUpload aria-hidden className="size-4.5" />
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
      </span>
      <span className="flex-1">{t("queue.pending", { n: pending })}</span>
      <ChevronRight aria-hidden className="size-5 opacity-60" />
    </Link>
  );
}
