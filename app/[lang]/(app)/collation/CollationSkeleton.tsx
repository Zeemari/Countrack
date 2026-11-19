import { WidePage } from "@/components/WidePage";

/** The hero panel and an empty board, shown while the page loads. */
export function CollationSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <WidePage />
      <div className="h-[30rem] animate-pulse rounded-[2rem] bg-frame-2 md:h-[34rem] md:rounded-[2.5rem]" />
      <div className="h-64 animate-pulse rounded-[2rem] bg-surface-2" />
    </div>
  );
}
