"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { CaptureStatus } from "@/components/CaptureStatus";
import { HashChip } from "@/components/HashChip";
import { formatTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { useCaptures, useOnline } from "@/lib/offline/hooks";
import { cachedUnits, updateCapture } from "@/lib/offline/queue";
import { MAX_ATTEMPTS, syncAll } from "@/lib/offline/sync";

export function QueueClient() {
  const captures = useCaptures();
  const online = useOnline();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void cachedUnits().then((us) => setCodes(Object.fromEntries(us.map((u) => [u.id, u.code]))));
  }, []);

  async function syncNow() {
    setSyncing(true);
    // A manual sync gives failed items a fresh set of attempts.
    for (const c of captures ?? []) if (c.attempts >= MAX_ATTEMPTS) await updateCapture(c.localId, { attempts: 0 });
    await syncAll();
    setSyncing(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 text-sm font-medium ${online ? "text-ok-text" : "text-review-text"}`}>
          {online ? <Wifi aria-hidden className="size-4" /> : <WifiOff aria-hidden className="size-4" />}
          {online ? t("queue.online") : t("queue.offline")}
        </span>
        <button
          onClick={syncNow}
          disabled={!online || syncing}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-4 font-semibold text-brand-ink disabled:opacity-50"
        >
          <RefreshCw aria-hidden className={`size-5 ${syncing ? "animate-spin" : ""}`} /> {t("queue.syncNow")}
        </button>
      </div>

      {captures?.length === 0 && <p className="text-muted">{t("queue.empty")}</p>}

      <ul className="flex flex-col gap-3">
        {captures?.map((c) => (
          <li key={c.localId} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold">{codes[c.unitId] ?? "—"}</span>
              <span className="text-xs text-muted">{formatTime(c.capturedAt)}</span>
            </div>
            <HashChip hash={c.sha256} />
            <CaptureStatus item={c} online={online} />
            {c.status === "done" && c.photoId && (
              <Link href={`/review/${c.photoId}`} className="font-medium text-brand">
                {t("capture.seeResult")} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
