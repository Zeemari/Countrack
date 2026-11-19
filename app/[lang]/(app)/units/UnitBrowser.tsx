"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight, ChevronDown, CircleCheck, Clock, LayoutGrid, List, Loader2, MapPin, Rows3, Scale, Search, SearchX, TriangleAlert,
  Truck, X, type LucideIcon,
} from "lucide-react";
import { ElectionTabs } from "@/components/ElectionTabs";
import { Pagination } from "@/components/Pagination";
import { StatusBadge, WitnessMeter } from "@/components/StatusBadge";
import { electionLinks, type Election } from "@/lib/elections";
import { t, type MessageKey } from "@/lib/i18n";
import { useAppPath } from "@/lib/i18n/path";
import { PAGE_SIZES, SORTS, type Filter, type UnitCardData, type UnitsPage, type UnitsQuery } from "./shared";

export type { UnitCardData };

const TILES: { key: Filter; label: MessageKey; icon: LucideIcon; tone: string; bar: string }[] = [
  { key: "all", label: "units.filter.all", icon: Rows3, tone: "text-text", bar: "bg-text" },
  { key: "verified", label: "status.verified", icon: CircleCheck, tone: "text-ok-text", bar: "bg-brand" },
  { key: "pending", label: "status.pending", icon: Clock, tone: "text-pending-text", bar: "bg-muted" },
  { key: "flagged", label: "status.flagged", icon: TriangleAlert, tone: "text-review-text", bar: "bg-accent" },
  { key: "mismatch", label: "units.filter.mismatch", icon: Scale, tone: "text-review-text", bar: "bg-accent" },
];

const number = new Intl.NumberFormat("en-NG");
type View = "grid" | "list";

/** Defaults are left out of the URL to keep links short. */
const DEFAULTS: Partial<Record<keyof UnitsQuery, string>> = { status: "all", sort: "code", page: "1", size: "12", election: "presidential" };

function hrefFor(query: UnitsQuery, path: string, view: View) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    const s = String(v);
    if (s && DEFAULTS[k as keyof UnitsQuery] !== s) sp.set(k, s);
  }
  if (view === "list") sp.set("view", view);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Polling units as filterable, searchable, paginated cards or rows. The server pages; this drives the URL. */
export function UnitBrowser({ query: asked, units, total, page, counts, states }: UnitsPage & { query: UnitsQuery }) {
  const query = { ...asked, page };
  const router = useRouter();
  const path = useAppPath();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);
  // Layout lives in the URL (not sent to the server) so a shared link opens the same way.
  const [view, setView] = useState<View>(useSearchParams().get("view") === "list" ? "list" : "grid");
  const resultsRef = useRef<HTMLElement>(null);
  const pickView = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "list") url.searchParams.set("view", v);
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };

  /** Any change except paging goes back to page 1. */
  const go = (patch: Partial<UnitsQuery>, opts: { scroll?: boolean } = {}) => {
    const next = { ...query, ...patch, page: patch.page ?? 1 };
    startTransition(() => router.replace(hrefFor(next, path, view), { scroll: false }));
    if (opts.scroll) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Debounced search: the server searches all ~176k units, not just this page.
  useEffect(() => {
    if (search.trim() === query.q) return;
    const id = window.setTimeout(() => go({ q: search.trim() }), 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should trigger a search
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(total / query.size));
  const from = total ? (query.page - 1) * query.size + 1 : 0;
  const to = Math.min(query.page * query.size, total);
  const filtered = query.q || query.state || query.status !== "all";

  return (
    <div className="flex flex-col gap-6">
      {/* Summary tiles double as the status filter. */}
      <div role="tablist" aria-label={t("units.filter.label")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map(({ key, label, icon: Icon, tone, bar }, i) => {
          const active = query.status === key;
          const n = counts[key];
          const share = counts.all && n ? (n / counts.all) * 100 : 0;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => go({ status: key })}
              className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition ${i === 0 ? "col-span-2 sm:col-span-1" : ""} ${
                active ? "border-text bg-surface shadow-card" : "border-border bg-surface/60 hover:bg-surface"
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium text-muted">
                {t(label)}
                <Icon aria-hidden className={`size-4 ${tone}`} />
              </span>
              <span className="font-display text-3xl leading-none font-bold tabular-nums">{n === null ? "—" : number.format(n)}</span>
              <span aria-hidden className="h-1 overflow-hidden rounded-full bg-surface-2">
                <span className={`block h-full rounded-full ${bar}`} style={{ width: `${key === "all" ? 100 : Math.max(share, n ? 2 : 0)}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-3 shadow-card">
        <ElectionTabs value={query.election} links={electionLinks((e: Election) => hrefFor({ ...query, election: e, page: 1 }, path, view))} />
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("units.search")}
              aria-label={t("units.search")}
              className="field min-h-12 bg-bg pr-11 pl-12"
            />
            {pending ? (
              <Loader2 aria-hidden className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-muted" />
            ) : search ? (
              <button
                onClick={() => setSearch("")}
                aria-label={t("compare.clear")}
                className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-muted"
              >
                <X aria-hidden className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 lg:flex">
            <ToolbarSelect label={t("units.state.label")} value={query.state} onChange={(v) => go({ state: v })} className="lg:w-48">
              <option value="">{t("units.state.all")}</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </ToolbarSelect>
            <ToolbarSelect label={t("units.sort.label")} value={query.sort} onChange={(v) => go({ sort: v as UnitsQuery["sort"] })} className="lg:w-44">
              {SORTS.map((s) => <option key={s} value={s}>{t(`units.sort.${s}`)}</option>)}
            </ToolbarSelect>
            <div role="group" aria-label={t("units.view.label")} className="flex shrink-0 gap-1 rounded-2xl bg-surface-2 p-1">
              {([["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  aria-label={t(`units.view.${v}`)}
                  onClick={() => pickView(v)}
                  className={`grid size-10 place-items-center rounded-xl transition ${view === v ? "bg-surface text-text shadow-card" : "text-muted hover:text-text"}`}
                >
                  <Icon aria-hidden className="size-4.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <section ref={resultsRef} className={`flex scroll-mt-24 flex-col gap-4 transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <p aria-live="polite">
            {total === 0 ? t("units.noMatch") : t("units.showing", { from: number.format(from), to: number.format(to), total: number.format(total) })}
          </p>
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">{t("units.perPage")}</span>
            <select
              value={query.size}
              onChange={(e) => go({ size: Number(e.target.value) })}
              className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-xs"
              aria-label={t("units.perPage")}
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        {units.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-16 text-center text-muted">
            <SearchX aria-hidden className="size-8" />
            <p>{t("units.noMatch")}</p>
            {filtered && (
              <button className="btn btn-secondary min-h-10 px-4 text-sm" onClick={() => { setSearch(""); go({ q: "", state: "", status: "all" }); }}>
                {t("units.reset")}
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          <ul className="grid gap-3 stagger sm:grid-cols-2 lg:grid-cols-3">
            {units.map((u) => <UnitCard key={u.id} u={u} election={query.election} />)}
          </ul>
        ) : (
          <UnitTable units={units} election={query.election} />
        )}

        <Pagination page={query.page} pageCount={pageCount} onChange={(p) => go({ page: p }, { scroll: true })} />
      </section>
    </div>
  );
}

function ToolbarSelect({ label, value, onChange, className = "", children }: {
  label: string; value: string; onChange: (v: string) => void; className?: string; children: React.ReactNode;
}) {
  return (
    <label className={`relative min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field min-h-12 cursor-pointer appearance-none truncate bg-bg pr-9 text-sm font-medium"
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </label>
  );
}

const unitHref = (u: UnitCardData, election: Election) => `/units/${encodeURIComponent(u.code)}?election=${election}`;

function UnitCard({ u, election }: { u: UnitCardData; election: Election }) {
  const mismatch = u.mismatches > 0;
  return (
    <li>
      <Link href={unitHref(u, election)} className={`card pressable group flex h-full flex-col overflow-hidden ${mismatch ? "ring-2 ring-accent/70" : ""}`}>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="rounded-lg bg-surface-2 px-2 py-1 font-mono text-xs font-semibold tracking-tight">{u.code}</span>
              {u.simulated && <span className="rounded-md bg-sim-bg px-1.5 py-0.5 text-[10px] font-bold text-sim-text">{t("common.simulated")}</span>}
            </span>
            <StatusBadge status={u.status} size="sm" />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 leading-snug font-semibold">{u.name}</p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
              <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-1">{[u.ward, u.lga, u.state].filter(Boolean).join(" · ")}</span>
            </p>
          </div>
          {(mismatch || u.moved) && (
            <div className="flex flex-wrap gap-1.5">
              {mismatch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-review-bg px-2.5 py-1 text-xs font-semibold text-review-text">
                  <Scale aria-hidden className="size-3.5" /> {t("units.mismatch")}
                </span>
              )}
              {u.moved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
                  <Truck aria-hidden className="size-3.5" /> {t("units.moved.short")}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-2/40 px-4 py-3">
          {u.status === "flagged" ? (
            <span className="text-xs text-review-text">{t("status.flagged.detail")}</span>
          ) : (
            <WitnessMeter count={u.witnesses} status={u.status} />
          )}
          <ArrowUpRight aria-hidden className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
        </div>
      </Link>
    </li>
  );
}

const COLS = "md:grid-cols-[8rem_minmax(0,2fr)_minmax(0,1.6fr)_9.5rem_8.5rem_1rem]";

function UnitTable({ units, election }: { units: UnitCardData[]; election: Election }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className={`hidden gap-4 border-b border-border bg-surface-2/50 px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase md:grid ${COLS}`}>
        <span>{t("units.col.code")}</span>
        <span>{t("units.col.unit")}</span>
        <span>{t("units.col.area")}</span>
        <span>{t("units.col.witnesses")}</span>
        <span>{t("units.col.status")}</span>
        <span />
      </div>
      <ul className="divide-y divide-border">
        {units.map((u) => (
          <li key={u.id}>
            <Link
              href={unitHref(u, election)}
              className={`group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-5 py-3.5 transition hover:bg-surface-2/50 ${COLS}`}
            >
              <span className="font-mono text-xs font-semibold text-muted md:text-sm md:text-text">{u.code}</span>
              <span className="row-start-2 flex min-w-0 items-center gap-2 font-semibold md:row-start-auto">
                <span className="truncate">{u.name}</span>
                {u.mismatches > 0 && <Scale aria-label={t("units.mismatch")} className="size-4 shrink-0 text-review-text" />}
              </span>
              <span className="row-start-3 truncate text-sm text-muted md:row-start-auto">{u.ward} · {u.lga}</span>
              <span className="hidden md:block">
                {u.status === "flagged" ? <span className="text-xs text-review-text">—</span> : <WitnessMeter count={u.witnesses} status={u.status} />}
              </span>
              <span className="col-start-2 row-span-3 row-start-1 md:col-start-auto md:row-span-1 md:row-start-auto">
                <StatusBadge status={u.status} size="sm" />
              </span>
              <ArrowUpRight aria-hidden className="hidden size-4 text-muted group-hover:text-brand md:block" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
