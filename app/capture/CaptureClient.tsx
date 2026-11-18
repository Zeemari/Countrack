"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera, Images, ListChecks } from "lucide-react";
import { CaptureStatus } from "@/components/CaptureStatus";
import { HashChip } from "@/components/HashChip";
import { formatTime } from "@/lib/format";
import { sha256Hex } from "@/lib/hash";
import { t } from "@/lib/i18n";
import { compressImage } from "@/lib/image";
import { useCaptures, useOnline } from "@/lib/offline/hooks";
import { cacheUnits, cachedUnits, enqueue, type CachedUnit } from "@/lib/offline/queue";
import { syncAll } from "@/lib/offline/sync";
import { browserClient } from "@/lib/supabase/browser";

export function CaptureClient() {
  const params = useSearchParams();
  const online = useOnline();
  const captures = useCaptures();
  const [units, setUnits] = useState<CachedUnit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Units: show the offline cache immediately, then refresh from the network if possible.
  useEffect(() => {
    const wanted = params.get("unit");
    const apply = (list: CachedUnit[]) => {
      if (!list.length) return;
      setUnits(list);
      setUnitId((cur) => cur || list.find((u) => u.code === wanted)?.id || "");
    };
    void cachedUnits().then(apply);
    void browserClient()
      .from("polling_units")
      .select("id, code, name, ward")
      .order("code")
      .then(({ data }) => {
        if (!data) return;
        apply(data as CachedUnit[]);
        void cacheUnits(data as CachedUnit[]);
      });
    void browserClient().auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, [params]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function onFile(file: File | undefined) {
    if (!file || !unitId) return;
    const capturedAt = new Date().toISOString(); // device clock, taken at the moment of capture
    setBusy(true);
    setError(null);
    try {
      const blob = await compressImage(file);
      const sha256 = await sha256Hex(blob);
      const localId = crypto.randomUUID();
      await enqueue({ localId, unitId, blob, sha256, capturedAt, status: "queued", attempts: 0 });
      setCurrentId(localId);
      setPreview(URL.createObjectURL(blob));
      void syncAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const current = captures?.find((c) => c.localId === currentId);

  // Offline capture always works; a session is only needed when the queue uploads.
  if (signedIn === false && online)
    return (
      <Link href="/login?next=/capture" className="rounded-2xl bg-brand p-4 text-center text-lg font-semibold text-brand-ink">
        {t("capture.signInFirst")}
      </Link>
    );

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-medium">{t("capture.unit")}</span>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="min-h-12 rounded-xl border border-border bg-surface px-3 text-base"
        >
          <option value="">{t("capture.chooseUnit")}</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.code} · {u.name}</option>
          ))}
        </select>
      </label>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      <button
        disabled={!unitId || busy}
        onClick={() => cameraRef.current?.click()}
        className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-brand text-lg font-semibold text-brand-ink shadow-sm disabled:opacity-50"
      >
        <Camera aria-hidden className="size-7" /> {busy ? t("capture.hashing") : t("capture.take")}
      </button>
      <button
        disabled={!unitId || busy}
        onClick={() => galleryRef.current?.click()}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface font-medium disabled:opacity-50"
      >
        <Images aria-hidden className="size-5" /> {t("capture.gallery")}
      </button>

      {error && <p className="rounded-xl bg-review-bg p-3 text-sm text-review-text">{error}</p>}

      {current && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
          {preview && <img src={preview} alt={t("capture.previewAlt")} className="max-h-64 w-full rounded-lg object-contain" />}
          <p className="text-sm font-medium">{t("capture.saved")}</p>
          <HashChip hash={current.sha256} full />
          <p className="text-xs text-muted">{t("capture.capturedAt", { time: formatTime(current.capturedAt) })}</p>
          <CaptureStatus item={current} online={online} />
          {current.status === "done" && current.photoId && (
            <Link href={`/review/${current.photoId}`} className="rounded-xl bg-brand p-3 text-center font-semibold text-brand-ink">
              {t("capture.seeResult")}
            </Link>
          )}
        </section>
      )}

      <Link href="/queue" className="inline-flex min-h-11 items-center gap-2 self-center font-medium text-brand">
        <ListChecks aria-hidden className="size-5" /> {t("queue.title")}
      </Link>
    </div>
  );
}
