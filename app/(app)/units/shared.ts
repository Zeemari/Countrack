import { parseElection, type Election } from "@/lib/elections";
import type { UnitStatus } from "@/lib/schemas";

/**
 * Shared by the units page (server) and UnitBrowser (client).
 * The polling-unit directory holds the whole INEC list (~176k units), so filtering, search,
 * counting and paging all happen in the database. The page only ever receives one page of rows.
 */

export type Filter = "all" | UnitStatus | "mismatch";
export const FILTERS: Filter[] = ["all", "verified", "pending", "flagged", "mismatch"];
export type Sort = "code" | "name" | "state";
export const SORTS: Sort[] = ["code", "name", "state"];
export const PAGE_SIZES = [12, 24, 48];

export type UnitsQuery = { election: Election; status: Filter; q: string; state: string; sort: Sort; page: number; size: number };

export type UnitCardData = {
  id: string;
  code: string;
  name: string;
  ward: string;
  lga: string;
  state: string;
  moved: boolean;
  simulated: boolean;
  status: UnitStatus;
  witnesses: number;
  mismatches: number;
};

export type UnitsPage = {
  units: UnitCardData[];
  /** Units matching every filter, for pagination. */
  total: number;
  /** The page shown, clamped to the last page when the URL asks for one past the end. */
  page: number;
  /** Per-status totals within the current search and state, for the summary tiles (null = unavailable). */
  counts: Record<Filter, number | null>;
  states: string[];
};

const SAFE_SEARCH = /^[\p{L}\p{N} .,'’&()/-]+$/u;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseUnitsQuery(sp: Record<string, string | string[] | undefined>): UnitsQuery {
  const status = one(sp.status) as Filter;
  const sort = one(sp.sort) as Sort;
  const size = Number(one(sp.size));
  const q = one(sp.q).trim().slice(0, 80);
  const state = one(sp.state).trim().slice(0, 80);
  return {
    election: parseElection(one(sp.election) || undefined),
    status: FILTERS.includes(status) ? status : "all",
    q: SAFE_SEARCH.test(q) ? q : "",
    state: SAFE_SEARCH.test(state) ? state : "",
    sort: SORTS.includes(sort) ? sort : "code",
    page: Math.max(1, Math.floor(Number(one(sp.page))) || 1),
    size: PAGE_SIZES.includes(size) ? size : 12,
  };
}

