import type { LucideIcon } from "lucide-react";
import { DoodlePattern } from "@/components/home/Sticker";

type Props = {
  /** Unique per page: the doodle pattern's SVG id. */
  id: string;
  /** Short mono label in the chip above the title. */
  eyebrow: React.ReactNode;
  eyebrowIcon?: LucideIcon;
  /** A pulsing dot in the chip, for live pages. */
  live?: boolean;
  title: string;
  /** The coloured, underlined end of the headline. */
  highlight?: string;
  /** Text colour class for the highlight (e.g. an election colour). */
  highlightClass?: string;
  subtitle?: React.ReactNode;
  /** Right-hand column on wide screens: steps, a key action, a status. */
  aside?: React.ReactNode;
  /** Controls under the headline: chips, tiles, or a <HeroTray>. */
  children?: React.ReactNode;
};

/**
 * The one page header used across the app (IReV, Collate, Units, Incidents, Queue): a dark green
 * panel with doodles, a chip, a big headline whose last words are coloured and underlined, and the
 * page's main controls inside the panel. Render <WidePage /> on the page alongside it.
 */
export function HeroPanel({ id, eyebrow, eyebrowIcon: Icon, live, title, highlight, highlightClass = "text-accent", subtitle, aside, children }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-frame-2 p-4 text-frame-ink md:rounded-[2.5rem] md:p-8">
      <DoodlePattern id={id} scale={0.8} className="text-frame-ink opacity-[0.06]" />
      <div className="relative flex flex-col gap-6 md:gap-8">
        <div className="grid gap-6 px-2 pt-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex min-w-0 flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-frame-ink/10 px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wider uppercase">
              {live && <span className="size-2 animate-pulse rounded-full bg-pop" />}
              {Icon && <Icon aria-hidden className="size-3.5" />}
              {eyebrow}
            </span>
            <h1 className="display text-5xl text-balance md:text-7xl animate-rise">
              {title}
              {highlight && (
                <>
                  {" "}
                  <span className={`relative inline-block ${highlightClass}`}>
                    {highlight}
                    <svg aria-hidden viewBox="0 0 220 14" className="absolute -bottom-1 left-0 h-3 w-full text-frame-ink/25" preserveAspectRatio="none">
                      <path d="M2 10 C 50 2, 120 2, 218 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    </svg>
                  </span>
                </>
              )}
            </h1>
            {subtitle && <p className="max-w-xl text-frame-muted md:text-lg">{subtitle}</p>}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}

/** The light tray that holds a page's pickers and inputs inside a <HeroPanel>. */
export function HeroTray({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-col gap-3 rounded-3xl bg-bg p-4 text-text shadow-lift md:p-5 ${className}`}>{children}</div>;
}

/** A placeholder of the hero's shape, for loading states. */
export function HeroSkeleton({ className = "h-[26rem] md:h-[30rem]" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[2rem] bg-frame-2 md:rounded-[2.5rem] ${className}`} />;
}
