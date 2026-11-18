import { BackLink } from "@/components/BackLink";
import { t } from "@/lib/i18n";
import { QueueClient } from "./QueueClient";

export default function QueuePage() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <BackLink href="/" />
      <h1 className="text-2xl font-bold">{t("queue.title")}</h1>
      <QueueClient />
    </div>
  );
}
