import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { WidePage } from "@/components/WidePage";
import { t } from "@/lib/i18n";
import { IrevExplorer } from "./IrevExplorer";

export default function IrevPage() {
  return (
    <>
      <WidePage />
      <PageHeader eyebrow={t("irev.eyebrow")} title={t("irev.title")} subtitle={t("irev.subtitle")} />
      {/* The explorer reads the URL for a shared view, so it renders on the client. */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface-2" />}>
        <IrevExplorer />
      </Suspense>
      <p className="text-xs text-muted">{t("irev.disclaimer")}</p>
    </>
  );
}
