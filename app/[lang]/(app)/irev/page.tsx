import { Suspense } from "react";
import { WidePage } from "@/components/WidePage";
import { IrevExplorer } from "./IrevExplorer";

export default function IrevPage() {
  return (
    <>
      <WidePage />
      {/* The explorer reads the URL for a shared view, so it renders on the client. */}
      <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-[2.5rem] bg-frame-2" />}>
        <IrevExplorer />
      </Suspense>
    </>
  );
}
