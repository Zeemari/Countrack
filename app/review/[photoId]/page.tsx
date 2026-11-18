import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/Card";
import { FiguresTable } from "@/components/FiguresTable";
import { FlagList } from "@/components/FlagList";
import { HashChip } from "@/components/HashChip";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTime, photoUrl } from "@/lib/format";
import { t } from "@/lib/i18n";
import { CheckFlags, ExtractedResult, type UnitStatus } from "@/lib/schemas";
import { publicClient } from "@/lib/supabase/server";

export default function ReviewPage({ params }: PageProps<"/review/[photoId]">) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <BackLink href="/queue" label={t("queue.title")} />
      <Suspense fallback={<p className="text-muted">{t("common.loading")}</p>}>
        <Review params={params} />
      </Suspense>
    </div>
  );
}

type PhotoRow = {
  id: string;
  image_url: string;
  sha256_hash: string;
  hash_verified: boolean | null;
  captured_at: string;
  uploaded_at: string;
  sync_status: string;
  polling_units: { id: string; code: string; name: string; unit_results: { status: UnitStatus; witness_count: number } | null };
  extracted_results: Record<string, unknown> | null;
};

async function Review({ params }: Pick<PageProps<"/review/[photoId]">, "params">) {
  await connection();
  const { photoId } = await params;
  const { data: photo } = await publicClient()
    .from("result_photos")
    .select(
      "id, image_url, sha256_hash, hash_verified, captured_at, uploaded_at, sync_status, polling_units(id, code, name, unit_results(status, witness_count)), extracted_results(*)",
    )
    .eq("id", photoId)
    .maybeSingle<PhotoRow>();

  if (!photo) return <p className="text-muted">{t("review.notFound")}</p>;
  const unit = photo.polling_units;
  const x = photo.extracted_results;
  const result = x ? ExtractedResult.parse(x) : null;
  const flags = x ? CheckFlags.parse(x.check_flags) : [];
  const status = unit.unit_results?.status ?? "pending";

  return (
    <>
      <header>
        <p className="font-mono text-sm text-muted">{unit.code}</p>
        <h1 className="text-2xl font-bold">{t("review.title")}</h1>
      </header>

      <Card title={t("review.unitStatus")}>
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={status} />
          <span className="text-sm text-muted">{t(`status.${status}.detail`, { n: unit.unit_results?.witness_count ?? 0 })}</span>
        </div>
        <Link href={`/units/${unit.code}`} className="rounded-xl bg-brand p-3 text-center font-semibold text-brand-ink">
          {t("review.viewUnit")}
        </Link>
      </Card>

      {result ? (
        <>
          <Card title={t("review.numbers")}>
            <FiguresTable result={result} />
            <p className="text-xs text-muted">
              {t("review.readBy", { model: String(x?.model), confidence: Math.round(Number(x?.ai_confidence ?? 0) * 100) })}
            </p>
          </Card>
          <Card title={t("review.checks")}>
            <FlagList flags={flags} />
          </Card>
        </>
      ) : (
        <Card title={t("review.numbers")}>
          <p className="text-muted">{photo.sync_status === "failed" ? t("review.failed") : t("review.reading")}</p>
        </Card>
      )}

      <Card title={t("review.evidence")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- public storage URL, already compressed */}
        <img src={photoUrl(photo.image_url)} alt={t("review.photoAlt")} loading="lazy" className="w-full rounded-lg" />
        <HashChip hash={photo.sha256_hash} verified={photo.hash_verified} full />
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">{t("time.captured")}</dt>
          <dd>{formatTime(photo.captured_at)}</dd>
          <dt className="text-muted">{t("time.received")}</dt>
          <dd>{formatTime(photo.uploaded_at)}</dd>
        </dl>
      </Card>
    </>
  );
}
