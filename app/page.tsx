import { Suspense } from "react";
import Link from "next/link";
import { Camera, ClipboardCheck, ClipboardPen, MapPin } from "lucide-react";
import { BigButton } from "@/components/BigButton";
import { QueueBadge } from "@/components/QueueBadge";
import { UserChip } from "@/components/UserChip";
import { t } from "@/lib/i18n";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 pt-4">
      <Suspense fallback={<div className="h-14" />}>
        <UserChip />
      </Suspense>

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("app.name")}</h1>
        <p className="text-muted">{t("app.tagline")}</p>
      </header>

      <QueueBadge />

      <nav className="flex flex-col gap-3">
        <BigButton href="/capture" icon={Camera} label={t("home.capture")} hint={t("home.capture.hint")} primary />
        <BigButton href="/units" icon={MapPin} label={t("home.find")} hint={t("home.find.hint")} />
        <BigButton href="/checkin" icon={ClipboardCheck} label={t("home.checkin")} hint={t("home.checkin.hint")} badge={t("home.soon")} />
      </nav>

      <Link href="/collation" className="inline-flex min-h-11 items-center gap-2 self-center font-medium text-brand">
        <ClipboardPen aria-hidden className="size-5" /> {t("home.collation")}
      </Link>

      <p className="text-center text-sm font-medium text-muted">{t("home.principle")}</p>
    </div>
  );
}
