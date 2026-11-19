import "server-only";
import type { UnitStatus } from "@/lib/schemas";
import { publicClient } from "@/lib/supabase/server";
import type { Filter, UnitsPage, UnitsQuery } from "./shared";

type Row = { id: string; code: string; name: string; ward: string; lga: string; state: string; moved: boolean; is_simulated: boolean };
const COLUMNS = "id, code, name, ward, lga, state, moved, is_simulated";

export async function loadUnits(query: UnitsQuery): Promise<UnitsPage> {
  const db = publicClient();
  const { election, q, state } = query;
  const pattern = q ? `%${q.replace(/[%_*,()]/g, " ")}%` : null;

  /** One query over polling_units, narrowed to a status, the search and the state. */
  function units(status: Filter, opts: { head?: boolean } = {}) {
    const join =
      status === "verified" || status === "flagged" ? ", unit_results!inner(status)"
      : status === "pending" ? ", unit_results(status)"
      : status === "mismatch" ? ", discrepancies!inner(id)"
      : "";
    let b = db.from("polling_units").select(`${COLUMNS}${join}`, { count: "exact", head: opts.head });
    if (status === "verified" || status === "flagged") b = b.eq("unit_results.election", election).eq("unit_results.status", status);
    // Pending = no verified or flagged result for this election (one witness, or none yet).
    if (status === "pending") b = b.eq("unit_results.election", election).in("unit_results.status", ["verified", "flagged"]).is("unit_results", null);
    if (status === "mismatch") b = b.eq("discrepancies.election", election);
    if (pattern) b = b.or(`code.ilike.${pattern},name.ilike.${pattern},ward.ilike.${pattern},lga.ilike.${pattern}`);
    if (state) b = b.eq("state", state);
    return b;
  }

  const list = (pageNo: number) =>
    units(query.status)
      .order("is_simulated", { ascending: false }) // demo units first: they carry results
      .order(query.sort)
      .order("code")
      .range((pageNo - 1) * query.size, pageNo * query.size - 1)
      .overrideTypes<Row[], { merge: false }>();

  // With no status filter the list's own count is the "all" tile, so skip the duplicate scan.
  const noRows = Promise.resolve({ count: null, error: null });
  const tiles = () =>
    Promise.all([
      query.status === "all" ? noRows : units("all", { head: true }),
      units("verified", { head: true }),
      units("flagged", { head: true }),
      units("mismatch", { head: true }),
    ]);
  const statesReq = db.from("polling_unit_directory_states").select("name").order("name");
  // A text search scans every unit until the trigram indexes exist (migration 20261119000400), so
  // the list goes first and the tile counts after, instead of all competing for the same timeout.
  const [first, [allRes, verified, flagged, mismatch], states] = pattern
    ? await (async () => { const l = await list(query.page); return [l, await tiles(), await statesReq] as const; })()
    : await Promise.all([list(query.page), tiles(), statesReq]);

  let page = first;
  let pageNo = query.page;
  // Past the last page (an old link, or the total shrank): show the last page instead.
  if (page.error?.code === "PGRST103") {
    const n = (await units(query.status, { head: true })).count ?? 0;
    pageNo = Math.max(1, Math.ceil(n / query.size));
    page = await list(pageNo);
  }
  if (page.error) throw new Error(page.error.message);
  // Tile counts are a nice-to-have: a slow one shows "—" rather than failing the page.
  const tally = (r: { count: number | null; error: unknown }) => (r.error ? null : r.count);
  const all = query.status === "all" ? page.count : tally(allRes);

  // Witness counts and mismatches for just the units on this page.
  const rows = page.data ?? [];
  const ids = rows.map((r) => r.id);
  const [results, diffs] = ids.length
    ? await Promise.all([
        db.from("unit_results").select("unit_id, status, witness_count").eq("election", election).in("unit_id", ids),
        db.from("discrepancies").select("unit_id").eq("election", election).in("unit_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const resultRows = (results.data ?? []) as { unit_id: string; status: UnitStatus; witness_count: number }[];
  const resultBy = new Map(resultRows.map((r) => [r.unit_id, r]));
  const diffCount = new Map<string, number>();
  for (const d of (diffs.data ?? []) as { unit_id: string }[]) diffCount.set(d.unit_id, (diffCount.get(d.unit_id) ?? 0) + 1);

  const v = tally(verified);
  const f = tally(flagged);
  const counts: Record<Filter, number | null> = {
    all,
    verified: v,
    flagged: f,
    pending: all !== null && v !== null && f !== null ? Math.max(0, all - v - f) : null,
    mismatch: tally(mismatch),
  };

  return {
    units: rows.map((u) => {
      const r = resultBy.get(u.id);
      return {
        id: u.id, code: u.code, name: u.name, ward: u.ward, lga: u.lga, state: u.state,
        moved: u.moved, simulated: u.is_simulated,
        status: r?.status ?? "pending",
        witnesses: r?.witness_count ?? 0,
        mismatches: diffCount.get(u.id) ?? 0,
      };
    }),
    total: page.count ?? 0,
    page: pageNo,
    counts,
    states: (states.data ?? []).map((s) => s.name as string),
  };
}
