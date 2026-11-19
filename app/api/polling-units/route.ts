import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SOURCE = "INEC CVR portal via the community-maintained nigeria-inec-geo snapshot";
const SOURCE_TAG = "INEC CVR portal via nigeria-inec-geo";
const CODE = /^\d{2}\/\d{2}\/\d{2}\/\d{3}$/;
const SAFE_FILTER = /^[\p{L}\p{N} /-]+$/u;

function normalizeCode(input: string): string | null {
  const compact = input.trim().replace(/\s/g, "");
  const packed = compact.padStart(9, "0");
  const parts = /^\d{8,9}$/.test(compact)
    ? [packed.slice(0, 2), packed.slice(2, 4), packed.slice(4, 6), packed.slice(6)]
    : compact.split(/[/-]+/).filter(Boolean);
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return null;
  const code = `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2].padStart(2, "0")}/${parts[3].padStart(3, "0")}`;
  return CODE.test(code) ? code : null;
}

function safeFilter(value: string | null, name: string): string | null | Response {
  if (value === null || !value.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length > 80 || !SAFE_FILTER.test(trimmed)) {
    return NextResponse.json({ error: `Invalid ${name} filter` }, { status: 400 });
  }
  return trimmed;
}

/** Public real-world directory API. Supports exact PVC PU code lookup and paginated text search. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawCode = params.get("code");
  const query = params.get("q")?.trim() ?? "";
  if (rawCode && query) return NextResponse.json({ error: "Use either code or q, not both" }, { status: 400 });

  const code = rawCode ? normalizeCode(rawCode) : null;
  if (rawCode && !code) {
    return NextResponse.json({ error: "Send the full PU code, for example 01/02/03/004 or its 8–9 digit form" }, { status: 400 });
  }
  if (query.length > 80 || (query && !SAFE_FILTER.test(query))) {
    return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
  }

  const state = safeFilter(params.get("state"), "state");
  const lga = safeFilter(params.get("lga"), "LGA");
  const ward = safeFilter(params.get("ward"), "ward");
  for (const result of [state, lga, ward]) if (result instanceof Response) return result;

  const limitRaw = Number(params.get("limit") ?? 20);
  const offsetRaw = Number(params.get("offset") ?? 0);
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100 || !Number.isInteger(offsetRaw) || offsetRaw < 0 || offsetRaw > 1_000_000) {
    return NextResponse.json({ error: "limit must be 1–100 and offset must be a non-negative integer" }, { status: 400 });
  }

  let queryBuilder = publicClient()
    .from("polling_units")
    .select(
      "id, code, name, location, ward, lga, state, lat, lng, directory_source, directory_snapshot, unit_results(status, witness_count), discrepancies(count)",
      { count: "exact" },
    )
    .eq("is_simulated", false)
    .eq("directory_is_current", true)
    .eq("directory_source", SOURCE_TAG);

  if (code) queryBuilder = queryBuilder.eq("code", code);
  if (query) {
    const pattern = `%${query.replace(/[%_*]/g, " ")}%`;
    queryBuilder = queryBuilder.or(`code.ilike.${pattern},name.ilike.${pattern},location.ilike.${pattern},ward.ilike.${pattern},lga.ilike.${pattern},state.ilike.${pattern}`);
  }
  if (typeof state === "string") queryBuilder = queryBuilder.ilike("state", state);
  if (typeof lga === "string") queryBuilder = queryBuilder.ilike("lga", lga);
  if (typeof ward === "string") queryBuilder = queryBuilder.ilike("ward", ward);

  const { data, count, error } = await queryBuilder
    .order("code")
    .range(offsetRaw, offsetRaw + limitRaw - 1);

  if (error) {
    console.error("polling unit lookup failed", error.message);
    return NextResponse.json({ error: "Polling unit directory is temporarily unavailable" }, { status: 503 });
  }

  const first = data?.[0] as { directory_snapshot?: string | null; directory_source?: string | null } | undefined;
  const body = {
    data,
    pagination: { limit: limitRaw, offset: offsetRaw, total: count ?? 0 },
    source: first?.directory_source ?? SOURCE,
    snapshot: first?.directory_snapshot ?? null,
    official_lookup: "https://cvr.inecnigeria.org/pu",
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" },
  });
}
