import "server-only";
import { cacheLife } from "next/cache";
import { isStateScoped, type Election } from "../elections";
import { dataOf, matchesDate, toElection, toElections, toElectionTypes, toLgas, toUnit, toUnits, toWards } from "./map";
import { stateByCode } from "./states";
import type { IrevElection, IrevOption, IrevUnit } from "./types";

/**
 * Server-side client for INEC's Result Viewing portal (IReV). IReV has no public API; its web app
 * reads a JSON backend, and this client calls that backend the same way the site does, one level
 * at a time. Change IREV_API_BASE if INEC moves it (the address is in the site's main.*.js bundle).
 *
 * Election structure (types, elections, LGAs, wards) changes rarely and is cached for hours;
 * polling-unit uploads arrive live on election day and are cached for minutes.
 */
const BASE = (process.env.IREV_API_BASE ?? "https://dolphin-app-sleqh.ondigitalocean.app/api/v1/").replace(/\/?$/, "/");

export const IREV_SOURCE = "INEC Result Viewing portal (IReV), inecelectionresults.ng";

export class IrevError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

async function irevGet(path: string, params: Record<string, string | number | undefined> = {}): Promise<unknown> {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new IrevError("IReV did not answer in time. Try again in a moment.", 504);
  }
  if (!res.ok) throw new IrevError(`IReV answered ${res.status}.`, res.status === 404 ? 404 : 502);
  const body: unknown = await res.json().catch(() => null);
  if (!body || (typeof body === "object" && "success" in body && body.success === false)) {
    throw new IrevError("IReV refused the request.", 502);
  }
  return body;
}

async function electionTypes() {
  "use cache";
  cacheLife("hours");
  return toElectionTypes(await irevGet("election-types"));
}

/** IReV's election-type id for one CounTrack election, or null when IReV has no such type. */
export async function getElectionTypeId(election: Election): Promise<string | null> {
  return (await electionTypes()).find((t) => t.election === election)?.id ?? null;
}

async function electionsOfType(typeId: string, irevStateId: number | null) {
  "use cache";
  cacheLife("hours");
  return toElections(await irevGet("elections", { election_type: typeId, state_id: irevStateId ?? undefined }));
}

/**
 * Elections of one type, newest first. Presidential elections are national, so IReV lists them
 * without a state; every other type is listed per state. `date` narrows by "YYYY", "YYYY-MM" or a full date.
 */
export async function getElections(election: Election, stateCode: string | null, date: string | null): Promise<IrevElection[]> {
  const typeId = await getElectionTypeId(election);
  if (!typeId) return [];
  const state = stateCode ? stateByCode(stateCode) : undefined;
  if (stateCode && !state) throw new IrevError("Unknown state code.", 400);
  if (isStateScoped(election) && !state) throw new IrevError("Choose a state first.", 400);
  const list = await electionsOfType(typeId, isStateScoped(election) ? state!.irevId : null);
  return list.filter((e) => matchesDate(e, date));
}

/** LGAs that voted in one election within one state. */
export async function getLgas(electionId: string, stateCode: string): Promise<IrevOption[]> {
  "use cache";
  cacheLife("hours");
  const state = stateByCode(stateCode);
  if (!state) throw new IrevError("Unknown state code.", 400);
  const lgas = toLgas(await irevGet(`elections/${electionId}/lga/state/${state.irevId}`));
  // State-level elections (governorship and below) also answer on the election's own LGA list.
  return lgas.length ? lgas : toLgas(await irevGet(`elections/${electionId}/lga`));
}

export async function getWards(electionId: string, lgaId: string): Promise<IrevOption[]> {
  "use cache";
  cacheLife("hours");
  return toWards(await irevGet(`elections/${electionId}/lga/${lgaId}`));
}

/** Polling units in one ward, each with its uploaded result sheet when there is one. */
export async function getUnits(electionId: string, wardId: string): Promise<IrevUnit[]> {
  "use cache";
  cacheLife("minutes");
  return toUnits(await irevGet(`elections/${electionId}/pus`, { ward: wardId }));
}

/** One polling unit's upload, plus the election it belongs to. */
export async function getUnit(electionId: string, unitId: string): Promise<{ unit: IrevUnit; election: IrevElection | null }> {
  "use cache";
  cacheLife("minutes");
  const body = await irevGet(`elections/${electionId}/pu/${unitId}`);
  const raw = dataOf(body);
  const unit = toUnit(raw);
  if (!unit) throw new IrevError("IReV has no such polling unit in this election.", 404);
  const election = raw && typeof raw === "object" && "election" in raw ? toElection(raw.election) : null;
  return { unit, election };
}
