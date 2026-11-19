"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, FileCheck2, FileX2, MousePointerClick, RotateCw, Search, SearchX } from "lucide-react";
import { DoodlePattern } from "@/components/home/Sticker";
import { Select } from "@/components/Select";
import { ELECTION_STYLE } from "@/lib/election-style";
import { ELECTIONS, isStateScoped, parseElection, type Election } from "@/lib/elections";
import { t, type MessageKey } from "@/lib/i18n";
import { IREV_ID } from "@/lib/irev/map";
import { IREV_STATES, stateByCode } from "@/lib/irev/states";
import type { IrevElection, IrevOption, IrevUnit } from "@/lib/irev/types";
import { IrevCompare } from "./IrevCompare";
import { useIrevList } from "./useIrev";

type Sel = { election: Election; state: string; electionId: string; lga: string; ward: string; pu: string };
const ORDER = ["state", "electionId", "lga", "ward", "pu"] as const;
type Key = (typeof ORDER)[number];
const STEP_LABEL: Record<Key, MessageKey> = { state: "irev.state", electionId: "irev.date", lga: "irev.lga", ward: "irev.ward", pu: "irev.pu" };

const api = (params: Record<string, string>) => `/api/irev?${new URLSearchParams(params)}`;
const idOr = (v: string | null) => (v && IREV_ID.test(v) ? v : "");
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(`${iso}T12:00:00Z`));

/**
 * IReV without the click-through: pick an election type, then state, election (date), LGA, ward
 * and polling unit, and see INEC's uploaded sheet beside what CounTrack's witnesses recorded.
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

  /** Setting one level clears every level below it; a new election type keeps the state. */
  function choose(patch: Partial<Sel>) {
    setSel((prev) => {
      const next = { ...prev, ...patch };
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
  const unitList = useMemo(() => units.data ?? [], [units.data]);
  const chosenUnit = unitList.find((u) => u.id === sel.pu) ?? null;
  const uploaded = unitList.filter((u) => u.documentUrl).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? unitList.filter((u) => `${u.name} ${u.irevCode ?? ""} ${u.code ?? ""}`.toLowerCase().includes(q)) : unitList;
  }, [unitList, query]);

  const error = elections.error ?? lgas.error ?? wards.error ?? units.error;
  const retry = () => [elections, lgas, wards, units].find((r) => r.error)?.retry();
  const style = ELECTION_STYLE[sel.election];
  const done = `${style.bg} text-e-ink`;
  const nextStep = ORDER.find((k) => !sel[k]);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero: headline, election type, then the five picks as one path. */}
      <section className="relative overflow-hidden rounded-[2rem] bg-frame-2 p-4 text-frame-ink md:rounded-[2.5rem] md:p-8">
        <DoodlePattern id="irev-doodles" scale={0.8} className="text-frame-ink opacity-[0.06]" />
        <div className="relative flex flex-col gap-6 md:gap-8">
          <div className="flex flex-wrap items-start justify-between gap-4 px-2 pt-2">
            <h1 className="display text-5xl text-balance md:text-7xl animate-rise">
              {t("irev.hero.title")}{" "}
              <span className={`relative inline-block ${style.text}`}>
                {t("irev.hero.title2")}
                <svg aria-hidden viewBox="0 0 220 14" className="absolute -bottom-1 left-0 h-3 w-full text-frame-ink/25" preserveAspectRatio="none">
                  <path d="M2 10 C 50 2, 120 2, 218 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <span className="inline-flex items-center gap-2 rounded-full bg-frame-ink/10 px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider uppercase">
              <span className="size-2 animate-pulse rounded-full bg-pop" /> IReV × CounTrack
            </span>
          </div>

          <div role="tablist" aria-label={t("election.label")} className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {ELECTIONS.map((e) => {
              const s = ELECTION_STYLE[e];
              const active = e === sel.election;
              return (
                <button
                  key={e}
                  role="tab"
                  aria-selected={active}
                  onClick={() => choose({ election: e })}
                  className={`group flex min-h-24 flex-col justify-between gap-3 rounded-2xl p-3.5 text-left transition last:col-span-2 active:scale-[0.97] sm:last:col-span-1 ${
                    active ? `${s.bg} text-e-ink shadow-lift` : "bg-frame-ink/[0.07] text-frame-ink hover:bg-frame-ink/[0.13]"
                  }`}
                >
                  <span className={`grid size-9 place-items-center rounded-xl ${active ? "bg-e-ink/10" : `${s.bg} text-e-ink`}`}>
                    <s.icon aria-hidden className="size-4.5" strokeWidth={2.2} />
                  </span>
                  <span className="text-sm leading-tight font-bold">{t(`election.${e}`)}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 rounded-3xl bg-bg p-4 text-text shadow-lift sm:grid-cols-2 md:p-5 lg:grid-cols-5">
            <Select
              step={1}
              doneClass={done}
              label={t("irev.state")}
              placeholder={t("irev.state.placeholder")}
              value={sel.state}
              onChange={(v) => choose({ state: v })}
              options={IREV_STATES.map((s) => ({ value: s.code, label: s.name }))}
            />
            <Select
              step={2}
              doneClass={done}
              label={t("irev.date")}
              placeholder={electionList.length || elections.loading || !sel.state ? t("irev.date.placeholder") : t("irev.date.none")}
              value={sel.electionId}
              onChange={(v) => choose({ electionId: v })}
              disabled={!sel.state || (!elections.loading && !electionList.length)}
              loading={!!sel.state && elections.loading}
              options={electionList.map((e) => ({ value: e.id, label: e.date ? `${formatDate(e.date)} · ${e.name}` : e.name }))}
            />
            <Select
              step={3}
              doneClass={done}
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
              doneClass={done}
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
              doneClass={done}
              label={t("irev.pu")}
              placeholder={t("irev.pu.placeholder")}
              value={sel.pu}
              onChange={(v) => choose({ pu: v })}
              disabled={!sel.ward}
              loading={units.loading}
              options={unitList.map((u) => ({ value: u.id, label: `${u.irevCode ?? ""} ${u.name}`.trim() }))}
            />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="flex min-w-0 flex-col gap-4" aria-live="polite">
        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-review-bg px-4 py-3 text-sm text-review-text">
            <p><strong className="font-semibold">{t("irev.error")}</strong> {error}</p>
            <button onClick={retry} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-review-text/10 px-3 py-1.5 font-semibold">
              <RotateCw aria-hidden className="size-4" /> {t("irev.retry")}
            </button>
          </div>
        )}

        {sel.pu && sel.electionId ? (
          <IrevCompare electionId={sel.electionId} puId={sel.pu} election={sel.election} unit={chosenUnit} onBack={() => choose({ pu: "" })} />
        ) : !sel.ward ? (
          <NextStep step={nextStep ?? "ward"} sel={sel} done={done} />
        ) : units.loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />)}</div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Ring value={uploaded} total={unitList.length} className={style.text} />
                <div>
                  <p className="display text-3xl tabular-nums">
                    {uploaded}<span className="text-muted">/{unitList.length}</span>
                  </p>
                  <p className="text-sm font-medium text-muted">{t("irev.units.uploadedShort")}</p>
                </div>
              </div>
              <div className="relative sm:w-72">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("irev.units.search")}
                  aria-label={t("irev.units.search")}
                  className="field min-h-11 rounded-full pl-10 text-sm"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border py-12 text-center text-muted">
                <SearchX aria-hidden className="size-7" />
                <p>{unitList.length ? t("units.noMatch") : t("irev.units.none")}</p>
              </div>
            ) : (
              <ul className="grid gap-3 stagger sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((u) => (
                  <li key={u.id}>
                    <button onClick={() => choose({ pu: u.id })} className="card pressable group flex w-full items-stretch overflow-hidden text-left">
                      <span className={`grid w-14 shrink-0 place-items-center ${u.documentUrl ? `${style.bg} text-e-ink` : "bg-surface-2 text-muted"}`}>
                        {u.documentUrl ? <FileCheck2 aria-hidden className="size-5" /> : <FileX2 aria-hidden className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1 px-4 py-3.5">
                        <span className="block font-mono text-[11px] font-semibold text-muted">{u.irevCode ?? "—"}</span>
                        <span className="block truncate font-semibold">{u.name}</span>
                        <span className={`mt-1 inline-block text-xs font-semibold ${u.documentUrl ? "text-ok-text" : "text-muted"}`}>
                          {u.documentUrl ? t("irev.uploaded") : t("irev.notUploaded")}
                        </span>
                      </span>
                      <ArrowUpRight aria-hidden className="mt-3.5 mr-3 size-4 shrink-0 text-muted transition group-hover:text-text" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <a href="https://www.inecelectionresults.ng" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 self-start text-xs text-muted hover:text-text">
          {t("irev.source")} <ArrowUpRight aria-hidden className="size-3" />
        </a>
      </section>
    </div>
  );
}

/** Before a ward is chosen: the five picks as a trail, with the next one highlighted. */
function NextStep({ step, sel, done }: { step: Key; sel: Sel; done: string }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-border px-6 py-10 text-center">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {ORDER.map((k, i) => {
          const isDone = !!sel[k];
          const isNext = k === step;
          return (
            <li key={k} className="flex items-center gap-1.5 sm:gap-2">
              {i > 0 && <span aria-hidden className={`h-0.5 w-4 rounded-full sm:w-8 ${isDone ? "bg-text" : "bg-border"}`} />}
              <span
                className={`grid size-9 place-items-center rounded-full text-sm font-bold sm:size-11 ${
                  isDone ? done : isNext ? "bg-text text-bg" : "bg-surface-2 text-muted"
                } ${isNext ? "animate-pulse" : ""}`}
              >
                {isDone ? "✓" : i + 1}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="flex items-center gap-2 text-lg font-semibold">
        <MousePointerClick aria-hidden className="size-5 text-muted" />
        {t("irev.next", { step: t(STEP_LABEL[step]) })}
      </p>
    </div>
  );
}

/** Uploaded / total as a solid ring. */
function Ring({ value, total, className = "" }: { value: number; total: number; className?: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const share = total ? value / total : 0;
  return (
    <svg viewBox="0 0 56 56" className="size-16 -rotate-90" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="7" className="stroke-surface-2" />
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="7" strokeLinecap="round" stroke="currentColor"
        strokeDasharray={`${c * share} ${c}`} className={`${className} transition-[stroke-dasharray] duration-700`} />
    </svg>
  );
}

