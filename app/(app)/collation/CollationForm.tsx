"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, FileCheck2, MapPin, Send } from "lucide-react";
import { t } from "@/lib/i18n";

export type FormUnit = { id: string; code: string; name: string; parties: string[] };

export function CollationForm({ units }: { units: FormUnit[] }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [source, setSource] = useState("EC8B (simulated)");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unit = units.find((u) => u.id === unitId);
  const total = unit ? unit.parties.reduce((s, p) => s + Number(scores[p] || 0), 0) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unit) return;
    setBusy(true);
    setError(null);
    const partyScores = Object.fromEntries(unit.parties.map((p) => [p, Number(scores[p] || 0)]));
    const res = await fetch("/api/collation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: "ward",
        areaCode: unit.code, // the server replaces this with the unit's ward for ward-level lines
        unitId,
        partyScores,
        source,
        announcedAt: new Date().toISOString(),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; unitCode?: string };
    setBusy(false);
    if (!res.ok) return setError(body.error ?? t("collation.failed"));
    router.push(`/units/${body.unitCode}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 animate-rise">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t("capture.unit")}</span>
        <span className="relative block">
          <MapPin aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-brand" />
          <select
            value={unitId}
            onChange={(e) => { setUnitId(e.target.value); setScores({}); }}
            className="field appearance-none pr-10 pl-12 font-medium"
            required
          >
            <option value="">{t("capture.chooseUnit")}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.code} · {u.name}</option>
            ))}
          </select>
          <ChevronsUpDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted" />
        </span>
      </label>

      {unit && (
        <fieldset className="card flex flex-col gap-4 p-4 animate-rise">
          <legend className="sr-only">{t("collation.announcedVotes")}</legend>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("collation.announcedVotes")}</span>
            <span className="font-mono text-sm text-muted tabular-nums">Σ {total}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {unit.parties.map((p) => (
              <label key={p} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{p}</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="0"
                  value={scores[p] ?? ""}
                  onChange={(e) => setScores((s) => ({ ...s, [p]: e.target.value.replace(/\D/g, "") }))}
                  className="field text-center font-mono text-xl font-semibold tabular-nums"
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t("collation.source")}</span>
        <span className="relative block">
          <FileCheck2 aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} required className="field pl-12" />
        </span>
      </label>

      {error && <p role="alert" className="rounded-2xl bg-review-bg p-4 text-sm text-review-text">{error}</p>}

      <button disabled={!unit || busy} className="btn btn-primary min-h-14 text-base">
        <Send aria-hidden className="size-5" /> {busy ? t("common.saving") : t("collation.submit")}
      </button>
    </form>
  );
}
