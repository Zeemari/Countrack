import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Camera } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/Card";
import { DiffTable } from "@/components/DiffTable";
import { FiguresTable } from "@/components/FiguresTable";
import { FlagList } from "@/components/FlagList";
import { HashChip } from "@/components/HashChip";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTime, photoUrl } from "@/lib/format";
import { t } from "@/lib/i18n";
import { checkResult } from "@/lib/rules/checks";
import { readingKey } from "@/lib/rules/consensus";
import { diffScores } from "@/lib/rules/diff";
import { ExtractedResult, PartyScores, type UnitStatus } from "@/lib/schemas";
import { publicClient } from "@/lib/supabase/server";

export default function UnitPage({ params }: PageProps<"/units/[code]">) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <BackLink href="/units" label={t("units.title")} />
      <Suspense fallback={<p className="text-muted">{t("common.loading")}</p>}>
        <Unit params={params} />
      </Suspense>
    </div>
  );
}

type UnitRow = {
  id: string;
  code: string;
  name: string;
  ward: string;
  lga: string;
  is_simulated: boolean;
  unit_results: { status: UnitStatus; witness_count: number; agreed_scores: unknown; verified_at: string | null } | null;
  result_photos: {
    id: string;
    user_id: string;
    image_url: string;
    sha256_hash: string;
    hash_verified: boolean | null;
    captured_at: string;
    uploaded_at: string;
    extracted_results: Record<string, unknown> | null;
  }[];
  collation_results: { id: string; level: string; party_scores: unknown; source: string; announced_at: string; is_simulated: boolean }[];
};

async function Unit({ params }: Pick<PageProps<"/units/[code]">, "params">) {
  await connection();
  const { code } = await params;
  const { data: unit } = await publicClient()
    .from("polling_units")
    .select(
      `id, code, name, ward, lga, is_simulated,
       unit_results(status, witness_count, agreed_scores, verified_at),
       result_photos(id, user_id, image_url, sha256_hash, hash_verified, captured_at, uploaded_at, extracted_results(*)),
       collation_results(id, level, party_scores, source, announced_at, is_simulated)`,
    )
    .eq("code", decodeURIComponent(code))
    .order("uploaded_at", { referencedTable: "result_photos" })
    .order("announced_at", { referencedTable: "collation_results", ascending: false })
    .maybeSingle<UnitRow>();

  if (!unit) return <p className="text-muted">{t("unit.notFound")}</p>;

  const status = unit.unit_results?.status ?? "pending";
  const agreed = status === "verified" ? ExtractedResult.parse(unit.unit_results?.agreed_scores) : null;
  const agreedKey = agreed ? readingKey(agreed) : null;
  // Number witnesses by first appearance, never by name or id.
  const witnessNo = new Map<string, number>();
  for (const p of unit.result_photos) if (!witnessNo.has(p.user_id)) witnessNo.set(p.user_id, witnessNo.size + 1);

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="font-mono text-sm text-muted">
          {unit.code}
          {unit.is_simulated && <span className="ml-2 rounded bg-sim-bg px-1.5 py-0.5 font-sans text-xs font-semibold text-sim-text">{t("common.simulated")}</span>}
        </p>
        <h1 className="text-2xl font-bold leading-tight">{unit.name}</h1>
        <p className="text-sm text-muted">{unit.ward} · {unit.lga}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-sm text-muted">{t(`status.${status}.detail`, { n: unit.unit_results?.witness_count ?? 0 })}</span>
        </div>
      </header>

      <Link
        href={`/capture?unit=${encodeURIComponent(unit.code)}`}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-brand-ink shadow-sm"
      >
        <Camera aria-hidden className="size-6" /> {t("unit.addPhoto")}
      </Link>

      <Card title={t("unit.wallResult")}>
        {agreed ? (
          <>
            <FiguresTable result={agreed} />
            <FlagList flags={checkResult(agreed)} />
            {unit.unit_results?.verified_at && (
              <p className="text-xs text-muted">{t("unit.verifiedAt", { time: formatTime(unit.unit_results.verified_at) })}</p>
            )}
          </>
        ) : (
          <p className="text-muted">{status === "flagged" ? t("unit.flaggedHint") : t("unit.pendingHint")}</p>
        )}
      </Card>

      <Card title={t("unit.compare")}>
        {unit.collation_results.length === 0 && <p className="text-muted">{t("unit.noCollation")}</p>}
        {unit.collation_results.length > 0 && !agreed && <p className="text-muted">{t("unit.waitingForWall")}</p>}
        {agreed &&
          unit.collation_results.map((c) => (
            <DiffTable
              key={c.id}
              diffs={diffScores(agreed.party_scores, PartyScores.parse(c.party_scores))}
              source={`${c.source} · ${t(`level.${c.level}` as "level.ward")}`}
              announcedAt={formatTime(c.announced_at)}
              wallAccredited={agreed.accredited}
            />
          ))}
      </Card>

      <Card title={t("unit.photos", { n: unit.result_photos.length })}>
        <ul className="flex flex-col gap-4">
          {unit.result_photos.map((p) => {
            const reading = p.extracted_results ? ExtractedResult.parse(p.extracted_results) : null;
            const matches = reading && agreedKey ? readingKey(reading) === agreedKey : null;
            return (
              <li key={p.id} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- public storage URL, already compressed */}
                <img src={photoUrl(p.image_url)} alt="" loading="lazy" className="size-20 shrink-0 rounded-lg object-cover" />
                <div className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="font-semibold">
                    {t("unit.witness", { n: witnessNo.get(p.user_id) ?? 0 })}
                    {matches === true && <span className="ml-2 font-normal text-ok-text">{t("unit.readingMatches")}</span>}
                    {matches === false && <span className="ml-2 font-normal text-review-text">{t("unit.readingDiffers")}</span>}
                    {!reading && <span className="ml-2 font-normal text-muted">{t("review.reading")}</span>}
                  </span>
                  <span className="text-xs text-muted">{t("time.captured")}: {formatTime(p.captured_at)}</span>
                  <span className="text-xs text-muted">{t("time.received")}: {formatTime(p.uploaded_at)}</span>
                  <HashChip hash={p.sha256_hash} verified={p.hash_verified} />
                  <Link href={`/review/${p.id}`} className="text-xs font-medium text-brand">{t("unit.seeReading")} →</Link>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
