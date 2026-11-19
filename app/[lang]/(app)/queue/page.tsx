import { PageHeader } from "@/components/PageHeader";
import { t } from "@/lib/i18n";
import { QueueClient } from "./QueueClient";

export default function QueuePage() {
  return (
    <>
      <PageHeader title={t("queue.title")} subtitle={t("queue.subtitle")} />
      <QueueClient />
    </>
  );
}
