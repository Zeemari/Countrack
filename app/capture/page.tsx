import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
import { t } from "@/lib/i18n";
import { CaptureClient } from "./CaptureClient";

export default function CapturePage() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <BackLink href="/" />
      <h1 className="text-2xl font-bold">{t("capture.title")}</h1>
      <Suspense>
        <CaptureClient />
      </Suspense>
    </div>
  );
}
