"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";
import { CaptureForm } from "@/components/capture/CaptureForm";
import { t } from "@/lib/i18n";

/** The capture page: the same form as the home hero, plus a link to the upload queue. */
export function CaptureClient() {
  return (
    <div className="flex flex-col gap-5">
      <div className="card p-4 md:p-6">
        <CaptureForm />
      </div>
      <Link href="/queue" className="btn btn-ghost self-center text-sm">
        <ListChecks aria-hidden className="size-4" /> {t("queue.title")}
      </Link>
    </div>
  );
}
