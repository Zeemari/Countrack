"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FileCheck2, FileX2, ListFilter, RotateCw, Search, SearchX } from "lucide-react";
import { ElectionTabs } from "@/components/ElectionTabs";
import { Select } from "@/components/Select";
import { isStateScoped, parseElection, type Election } from "@/lib/elections";
import { t } from "@/lib/i18n";
import { IREV_ID } from "@/lib/irev/map";
import { IREV_STATES, stateByCode } from "@/lib/irev/states";
import type { IrevElection, IrevOption, IrevUnit } from "@/lib/irev/types";
import { IrevCompare } from "./IrevCompare";
import { useIrevList } from "./useIrev";

type Sel = { election: Election; state: string; electionId: string; lga: string; ward: string; pu: string };
const ORDER = ["state", "electionId", "lga", "ward", "pu"] as const;
type Key = (typeof ORDER)[number];

const api = (params: Record<string, string>) => `/api/irev?${new URLSearchParams(params)}`;
const idOr = (v: string | null) => (v && IREV_ID.test(v) ? v : "");
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(`${iso}T12:00:00Z`));

/**
 * IReV without the click-through: pick election type, state, election (date), LGA, ward and
 * polling unit, then see INEC's uploaded sheet beside what CounTrack's witnesses recorded.
 * Every choice is mirrored in the URL so a view can be shared.
 */
export function IrevExplorer() {
  const params = useSearchParams();
  const [sel, setSel] = useState<Sel>(() => ({
    election: parseElection(params.get("election")),
    state: stateByCode(params.get("state") ?? "") ? params.get("state")! : "",
    electionId: idOr(params.get("electionId")),
    lga: idOr(params.get("lga")),
    ward: idOr(params.get("ward")),
    pu: idOr(params.get("pu")),
  }));
  const [query, setQuery] = useState("");

  /** Setting one level clears every level below it. */
  function choose(patch: Partial<Sel>) {
    setSel((prev) => {
      const next = { ...prev, ...patch };
      // A new election type keeps the state (index 0) and clears the rest.
      const levels = Object.keys(patch).map((k) => ORDER.indexOf(k as Key)).filter((i) => i >= 0);
      const first = patch.election ? 0 : Math.min(...levels);
      ORDER.forEach((k, i) => { if (i > first && !(k in patch)) next[k] = ""; });
      const url = new URL(window.location.href);
      url.search = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
      window.history.replaceState(null, "", url);
      return next;
    });
    if (!("pu" in patch)) setQuery("");
  }

  // Presidential elections are national, so they list without a state; everything else is per state.
  const scoped = isStateScoped(sel.election);
  const elections = useIrevList<IrevElection>(
    !scoped || sel.state ? api({ level: "elections", election: sel.election, ...(scoped && { state: sel.state }) }) : null,
  );
  const lgas = useIrevList<IrevOption>(sel.electionId && sel.state ? api({ level: "lgas", electionId: sel.electionId, state: sel.state }) : null);
  const wards = useIrevList<IrevOption>(sel.electionId && sel.lga ? api({ level: "wards", electionId: sel.electionId, lga: sel.lga }) : null);
  const units = useIrevList<IrevUnit>(sel.electionId && sel.ward ? api({ level: "units", electionId: sel.electionId, ward: sel.ward }) : null);

  const electionList = elections.data ?? [];
  const chosenElection = electionList.find((e) => e.id === sel.electionId) ?? null;
  const unitList = useMemo(() => units.data ?? [], [units.data]);
  const chosenUnit = unitList.find((u) => u.id === sel.pu) ?? null;
  const uploaded = unitList.filter((u) => u.documentUrl).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? unitList.filter((u) => `${u.name} ${u.irevCode ?? ""} ${u.code ?? ""}`.toLowerCase().includes(q)) : unitList;
  }, [unitList, query]);

  const error = elections.error ?? lgas.error ?? wards.error ?? units.error;
  const retry = () => [elections, lgas, wards, units].find((r) => r.error)?.retry();

  const crumbs = [
    stateByCode(sel.state)?.name,
    chosenElection && (chosenElection.date ? formatDate(chosenElection.date) : chosenElection.name),
    lgas.data?.find((o) => o.id === sel.lga)?.name,
    wards.data?.find((o) => o.id === sel.ward)?.name,
    chosenUnit?.name,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-5">
      <ElectionTabs value={sel.election} onChange={(e) => choose({ election: e })} />

      <div className="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Filters */}
        <aside className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-card lg:sticky lg:top-24">
          <p className="flex items-center gap-2 font-semibold">
            <ListFilter aria-hidden className="size-4 text-brand" /> {t("irev.filters")}
          </p>
          <Select
            step={1}
            label={t("irev.state")}
            placeholder={t("irev.state.placeholder")}
            value={sel.state}
            onChange={(v) => choose({ state: v })}
            options={IREV_STATES.map((s) => ({ value: s.code, label: s.name }))}
          />
          <Select
            step={2}
            label={t("irev.date")}
            placeholder={electionList.length || elections.loading ? t("irev.date.placeholder") : t("irev.date.none")}
            value={sel.electionId}
            onChange={(v) => choose({ electionId: v })}
            disabled={!sel.state || (!elections.loading && !electionList.length)}
            loading={elections.loading && (!!sel.state || !scoped)}
            options={electionList.map((e) => ({ value: e.id, label: e.date ? `${formatDate(e.date)} · ${e.name}` : e.name }))}
          />
          <Select
            step={3}
            label={t("irev.lga")}
            placeholder={t("irev.lga.placeholder")}
            value={sel.lga}
            onChange={(v) => choose({ lga: v })}
            disabled={!sel.electionId}
            loading={lgas.loading}
            options={(lgas.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
          <Select
            step={4}
            label={t("irev.ward")}
            placeholder={t("irev.ward.placeholder")}
            value={sel.ward}
            onChange={(v) => choose({ ward: v })}
            disabled={!sel.lga}
            loading={wards.loading}
            options={(wards.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
          <Select
            step={5}
            label={t("irev.pu")}
            placeholder={t("irev.pu.placeholder")}
            value={sel.pu}
            onChange={(v) => choose({ pu: v })}
            disabled={!sel.ward}
            loading={units.loading}
            options={unitList.map((u) => ({ value: u.id, label: `${u.irevCode ?? ""} ${u.name}`.trim() }))}
          />
          {crumbs.length > 0 && (
            <ol className="flex flex-wrap items-center gap-1 border-t border-border pt-4 text-xs text-muted">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight aria-hidden className="size-3" />}
                  <span className={i === crumbs.length - 1 ? "font-semibold text-text" : ""}>{c}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>

        {/* Results */}
        <section className="flex min-w-0 flex-col gap-4" aria-live="polite">
          {error && (
            <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl bg-review-bg p-4 text-sm text-review-text">
              <p><strong className="font-semibold">{t("irev.error")}</strong> {error}</p>
              <button onClick={retry} className="inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
                <RotateCw aria-hidden className="size-4" /> {t("irev.retry")}
              </button>
            </div>
          )}

          {sel.pu && sel.electionId ? (
            <IrevCompare
              electionId={sel.electionId}
              puId={sel.pu}
              election={sel.election}
              unit={chosenUnit}
              onBack={() => choose({ pu: "" })}
            />
          ) : !sel.ward ? (
            <Steps sel={sel} scoped={scoped} />
          ) : units.loading ? (
            <div className="grid gap-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />)}</div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{t("irev.units.title", { n: unitList.length })}</p>
                  <p className="text-sm text-muted">{t("irev.units.uploaded", { n: uploaded, total: unitList.length })}</p>
                </div>
                <div className="relative sm:w-72">
                  <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("irev.units.search")}
                    aria-label={t("irev.units.search")}
                    className="field min-h-11 pl-10 text-sm"
                  />
                </div>
              </div>
              {unitList.length > 0 && (
                <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(uploaded / unitList.length) * 100}%` }} />
                </div>
              )}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border py-12 text-center text-muted">
                  <SearchX aria-hidden className="size-7" />
                  <p>{unitList.length ? t("units.noMatch") : t("irev.units.none")}</p>
                </div>
              ) : (
                <ul className="grid gap-2 stagger sm:grid-cols-2">
                  {filtered.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => choose({ pu: u.id })}
                        className="card pressable flex w-full items-center gap-3 p-3.5 text-left"
                      >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${u.documentUrl ? "bg-ok-bg text-ok-text" : "bg-surface-2 text-muted"}`}>
                          {u.documentUrl ? <FileCheck2 aria-hidden className="size-5" /> : <FileX2 aria-hidden className="size-5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{u.name}</span>
                          <span className="block truncate font-mono text-xs text-muted">
                            {u.irevCode ?? "—"} · {u.documentUrl ? t("irev.uploaded") : t("irev.notUploaded")}
                          </span>
                        </span>
                        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** What to pick next, before a ward is chosen. */
function Steps({ sel, scoped }: { sel: Sel; scoped: boolean }) {
  const steps = [
    { done: !!sel.state, label: t("irev.step.state") },
    { done: !!sel.electionId, label: t("irev.step.date") },
    { done: !!sel.lga, label: t("irev.step.lga") },
    { done: !!sel.ward, label: t("irev.step.ward") },
    { done: false, label: t("irev.step.pu") },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-dashed border-border p-6 md:p-8">
      <div>
        <p className="display text-2xl">{t("irev.empty.title")}</p>
        <p className="mt-1 max-w-lg text-sm text-muted">{scoped ? t("irev.empty.body") : t("irev.empty.bodyPres")}</p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-5">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-sm sm:flex-col sm:items-start ${
              s.done ? "bg-ok-bg text-ok-text" : i === next ? "bg-surface font-semibold shadow-card" : "bg-surface-2/60 text-muted"
            }`}
          >
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.done ? "bg-ok-text text-bg" : i === next ? "bg-text text-bg" : "bg-surface-2"}`}>
              {s.done ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
