import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <PageSkeleton wide header={false} blocks={[]}>
      <div className="h-[28rem] animate-pulse rounded-[2.5rem] bg-frame-2" />
    </PageSkeleton>
  );
}
