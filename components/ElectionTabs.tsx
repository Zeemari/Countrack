"use client";

import Link from "next/link";
import { ELECTIONS, type Election } from "@/lib/elections";
import { t } from "@/lib/i18n";

/** Keeps the selected tab visible when it sits past the right edge of the row. */
const scrollIntoView = (el: HTMLElement | null) => {
  const row = el?.parentElement;
  if (!el || !row || row.scrollWidth <= row.clientWidth) return;
  const tab = el.getBoundingClientRect();
  const box = row.getBoundingClientRect();
  // Horizontal only: never moves the page itself.
  if (tab.left < box.left || tab.right > box.right) row.scrollLeft += tab.left - box.left - (box.width - tab.width) / 2;
};

type Props = {
  value: Election;
  /** Button tabs (client state)… */
  onChange?: (e: Election) => void;
  /** …or link tabs (query string), for server-rendered pages. Plain data, so servers can pass it. */
  links?: Record<Election, string>;
  disabled?: boolean;
  className?: string;
};

/** Presidential · Governorship · Senatorial · House of Reps · State Assembly · Chairmanship · Councillorship.
 * Seven tabs never fit a phone, so the row scrolls sideways and keeps the active tab in view. */
export function ElectionTabs({ value, onChange, links, disabled, className = "" }: Props) {
  return (
    <div
      role="tablist"
      aria-label={t("election.label")}
      className={`flex max-w-full snap-x gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 [scrollbar-width:none] ${className}`}
    >
      {ELECTIONS.map((e) => {
        const active = e === value;
        const cls = `relative min-h-10 shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition ${
          active ? "bg-surface text-text shadow-card" : "text-muted hover:text-text"
        } ${disabled && !active ? "pointer-events-none opacity-50" : ""}`;
        const label = t(`election.${e}`);
        return links ? (
          <Link key={e} role="tab" ref={active ? scrollIntoView : undefined} aria-selected={active} href={links[e]} scroll={false} className={`${cls} grid place-items-center`}>
            {label}
          </Link>
        ) : (
          <button key={e} type="button" role="tab" ref={active ? scrollIntoView : undefined} aria-selected={active} disabled={disabled && !active} onClick={() => onChange?.(e)} className={cls}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
