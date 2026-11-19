import { HeroSkeleton } from "@/components/HeroPanel";
import { WidePage } from "@/components/WidePage";

type Props = {
  /** Use the wide column, like pages that render <WidePage />. */
  wide?: boolean;
  /** Skip the title block when the page has none (e.g. a full-bleed explorer). */
  header?: boolean;
  /** Heights (in rem) of the content cards below the header. */
  blocks?: number[];
  children?: React.ReactNode;
};

const bar = "animate-pulse rounded-full bg-surface-2";

/**
 * The instant placeholder a route's loading.tsx shows while its server render streams in,
 * so a tap on a link changes the screen at once instead of waiting on the database.
 */
export function PageSkeleton({ wide, header = true, blocks = [16], children }: Props) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-5 md:gap-6">
      {wide && <WidePage />}
      {header && (
        <div className="flex flex-col gap-3">
          <div className={`${bar} h-3 w-28`} />
          <div className={`${bar} h-10 w-3/4 max-w-md md:h-14`} />
          <div className={`${bar} h-4 w-full max-w-xl`} />
        </div>
      )}
      {children}
      {blocks.map((h, i) => (
        <div key={i} className="card animate-pulse" style={{ height: `${h}rem` }} />
      ))}
    </div>
  );
}

/** Units list: the hero (tiles and toolbar live inside it) and a grid of unit cards. */
export function UnitsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <HeroSkeleton className="h-[34rem] md:h-[36rem]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card h-44 animate-pulse" />)}
      </div>
    </div>
  );
}

/** A hero-shaped placeholder then content cards: the loading state for pages built on <HeroPanel>. */
export function HeroPageSkeleton({ blocks = [16] }: { blocks?: number[] }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <WidePage />
      <HeroSkeleton />
      {blocks.map((h, i) => <div key={i} className="card animate-pulse" style={{ height: `${h}rem` }} />)}
    </div>
  );
}
