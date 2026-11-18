"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { t } from "@/lib/i18n";

export type FormUnit = { id: string; code: string; name: string; parties: string[] };

const field = "min-h-12 rounded-xl border border-border bg-surface px-3 text-base";

export function CollationForm({ units }: { units: FormUnit[] }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [source, setSource] = useState("EC8B (simulated)");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unit = units.find((u) => u.id === unitId);

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
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-medium">{t("capture.unit")}</span>
        <select value={unitId} onChange={(e) => { setUnitId(e.target.value); setScores({}); }} className={field} required>
          <option value="">{t("capture.chooseUnit")}</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.code} · {u.name}</option>
          ))}
        </select>
      </label>

      {unit && (
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-1.5 font-medium">{t("collation.announcedVotes")}</legend>
          {unit.parties.map((p) => (
            <label key={p} className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{p}</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={scores[p] ?? ""}
                onChange={(e) => setScores((s) => ({ ...s, [p]: e.target.value.replace(/\D/g, "") }))}
                className={`${field} font-mono text-lg`}
              />
            </label>
          ))}
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="font-medium">{t("collation.source")}</span>
        <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} required className={field} />
      </label>

      {error && <p className="rounded-xl bg-review-bg p-3 text-sm text-review-text">{error}</p>}

      <button
        disabled={!unit || busy}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand text-lg font-semibold text-brand-ink disabled:opacity-50"
      >
        <Send aria-hidden className="size-5" /> {busy ? t("common.saving") : t("collation.submit")}
      </button>
    </form>
  );
}
