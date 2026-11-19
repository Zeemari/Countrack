"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Camera, CheckCircle2, CloudUpload, Hourglass, Inbox, RefreshCw, Trash2, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { CaptureStatus } from "@/components/CaptureStatus";
import { openFinalizePrompt } from "@/components/FinalizePrompt";
import { EmptyState } from "@/components/EmptyState";
import { HashChip } from "@/components/HashChip";
import { HeroPanel } from "@/components/HeroPanel";
import { formatTime } from "@/lib/format";
import { t, type MessageKey } from "@/lib/i18n";
import type { QueuedCapture } from "@/lib/schemas";
import { useCaptures, useOnline } from "@/lib/offline/hooks";
import { cachedUnits, deleteCapture, updateCapture } from "@/lib/offline/queue";
import { MAX_ATTEMPTS, syncAll } from "@/lib/offline/sync";

/** The four piles a capture can be in, as tiles in the header. */
const PILES: { label: MessageKey; icon: LucideIcon; color: string; has: (c: QueuedCapture) => boolean }[] = [
  { label: "queue.count.waiting", icon: Hourglass, color: "bg-e-reps", has: (c) => c.status === "queued" },
  { label: "queue.count.uploading", icon: CloudUpload, color: "bg-e-chair", has: (c) => ["uploading", "uploaded", "extracting"].includes(c.status) },
  { label: "queue.count.done", icon: CheckCircle2, color: "bg-pop", has: (c) => c.status === "done" },
  { label: "queue.count.attention", icon: AlertCircle, color: "bg-accent", has: (c) => c.status === "draft" || c.status === "failed" },
];

export function QueueClient() {
  const captures = useCaptures();
  const online = useOnline();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  /** The photo whose Discard was tapped once; a second tap deletes it from this device. */
  const [confirming, setConfirming] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6">
      <HeroPanel
        id="queue-doodles"
        eyebrow={t("queue.hero.eyebrow")}
        eyebrowIcon={CloudUpload}
        title={t("queue.hero.title")}
        highlight={t("queue.hero.title2")}
        highlightClass="text-pop"
        subtitle={t("queue.subtitle")}
        aside={
          <div className="flex flex-col gap-3 rounded-3xl bg-frame-ink/[0.07] p-4 lg:w-80">
            <span className={`inline-flex items-center gap-2 text-sm font-semibold ${online ? "text-pop" : "text-accent"}`}>
              <span className="relative flex size-2.5">
                {online && <span className="absolute inset-0 animate-ping rounded-full bg-pop opacity-60" />}
                <span className={`relative size-2.5 rounded-full ${online ? "bg-pop" : "bg-accent"}`} />
              </span>
              {online ? <Wifi aria-hidden className="size-4" /> : <WifiOff aria-hidden className="size-4" />}
              {online ? t("queue.online") : t("queue.offline")}
            </span>
            <button onClick={syncNow} disabled={!online || syncing} className="btn btn-gold min-h-12 w-full text-sm">
              <RefreshCw aria-hidden className={`size-4 ${syncing ? "animate-spin" : ""}`} /> {t("queue.syncNow")}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          {PILES.map(({ label, icon: Icon, color, has }) => (
            <div key={label} className="flex flex-col gap-3 rounded-2xl bg-frame-ink/[0.07] p-4">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                {t(label)}
                <span className={`grid size-8 place-items-center rounded-xl text-e-ink ${color}`}>
                  <Icon aria-hidden className="size-4" strokeWidth={2.2} />
                </span>
              </span>
              <span className="display text-4xl leading-none tabular-nums">{captures ? captures.filter(has).length : "—"}</span>
            </div>
          ))}
        </div>
      </HeroPanel>

      {captures?.length === 0 && (
        <EmptyState icon={Inbox} title={t("queue.empty")} body={t("queue.empty.body")}>
          <Link href="/capture" className="btn btn-primary mt-2">
            <Camera aria-hidden className="size-5" /> {t("home.capture")}
          </Link>
        </EmptyState>
      )}

      <ul className="grid gap-3 stagger md:grid-cols-2 lg:grid-cols-3">
        {captures?.map((c) => (
          <li key={c.localId} className="card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold">{codes[c.unitId] ?? c.unitCode ?? "—"}</span>
                <span className="text-xs font-medium text-muted">{t(`election.${c.election ?? "presidential"}`)}</span>
              </span>
              <span className="text-xs text-muted">{formatTime(c.capturedAt)}</span>
            </div>
            <HashChip hash={c.sha256} />
            <div className="flex items-center justify-between gap-2">
              <CaptureStatus item={c} online={online} />
              {c.status === "draft" && online && (
                <button onClick={openFinalizePrompt} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {t("draft.finish")} <ArrowRight aria-hidden className="size-4" />
                </button>
              )}
              {c.status === "done" && c.photoId && (
                <Link href={`/review/${c.photoId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {t("capture.seeResult")} <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
            </div>
            {/* Not yet sent (and not mid-upload): the photo can be thrown away from this phone. */}
            {(c.status === "draft" || c.status === "queued" || c.status === "failed") && (
              <button
                type="button"
                onClick={() => (confirming === c.localId ? void deleteCapture(c.localId) : setConfirming(c.localId))}
                onBlur={() => setConfirming((id) => (id === c.localId ? null : id))}
                className={`inline-flex min-h-10 items-center justify-center gap-1.5 self-start rounded-full px-3.5 text-sm font-semibold transition ${
                  confirming === c.localId ? "bg-review-text text-review-bg" : "bg-surface-2 text-muted hover:text-review-text"
                }`}
              >
                <Trash2 aria-hidden className="size-4" /> {confirming === c.localId ? t("queue.discard.confirm") : t("queue.discard")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
