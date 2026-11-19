import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { t } from "@/lib/i18n";
import { CaptureClient } from "./CaptureClient";

export default function CapturePage() {
  return (
    <>
      <PageHeader title={t("capture.title")} subtitle={t("capture.subtitle")} />
      <Suspense>
        <CaptureClient />
      </Suspense>
    </>
  );
}
