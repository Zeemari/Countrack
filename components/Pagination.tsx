"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { pageItems } from "@/lib/paginate";

type Props = { page: number; pageCount: number; onChange: (page: number) => void };

/** Prev · 1 … 4 5 6 … 20 · Next. Phones get "Page 5 of 20" between the arrows instead of numbers. */
export function Pagination({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null;
  const arrow = "inline-flex min-h-10 items-center gap-1 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav aria-label={t("pagination.label")} className="flex items-center justify-between gap-2 sm:justify-center">
      <button type="button" className={arrow} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft aria-hidden className="size-4" /> {t("pagination.prev")}
      </button>
      <p className="text-sm text-muted sm:hidden">{t("pagination.of", { page, total: pageCount })}</p>
      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="w-6 text-center text-muted">…</li>
          ) : (
            <li key={p}>
              <button
                type="button"
                aria-current={p === page ? "page" : undefined}
                aria-label={t("pagination.page", { page: p })}
                onClick={() => onChange(p)}
                className={`grid size-10 place-items-center rounded-full font-mono text-sm tabular-nums transition ${
                  p === page ? "bg-text font-bold text-bg" : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ul>
      <button type="button" className={arrow} disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        {t("pagination.next")} <ChevronRight aria-hidden className="size-4" />
      </button>
    </nav>
  );
}
