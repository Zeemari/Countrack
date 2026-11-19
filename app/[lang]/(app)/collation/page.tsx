import { Suspense } from "react";
import { WidePage } from "@/components/WidePage";
import { CollationForm } from "./CollationForm";
import { CollationSkeleton } from "./CollationSkeleton";

/** Anyone can enter an official figure (no login); it is only ever compared, never trusted on its own. */
export default function CollationPage() {
  return (
    <>
      <WidePage />
      <Suspense fallback={<CollationSkeleton />}>
        <CollationForm />
      </Suspense>
    </>
  );
}
