"use client";

import Link from "next/link";
import { CloudUpload } from "lucide-react";
import { t } from "@/lib/i18n";
import { useCaptures } from "@/lib/offline/hooks";

/** "2 photos waiting to upload" link; hidden when the queue is empty. */
export function QueueBadge() {
  const pending = useCaptures()?.filter((c) => c.status !== "done").length ?? 0;
  if (!pending) return null;
  return (
    <Link href="/queue" className="flex min-h-12 items-center gap-2 rounded-xl bg-pending-bg px-4 font-medium text-pending-text">
      <CloudUpload aria-hidden className="size-5" /> {t("queue.pending", { n: pending })}
    </Link>
  );
}
