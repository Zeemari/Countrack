/**
 * Turns IReV's raw JSON into CounTrack's shapes. Pure functions, no network: IReV has no public
 * API or schema, so everything here reads defensively and drops what it cannot understand.
 *
 * Field names come from IReV's web app (inecelectionresults.ng): election types → elections
 * (`full_name`, `election_date`) → LGAs (`{ lga: { _id, name, code } }`) → wards
 * (`{ wards: [...] }`) → polling units (`pu_code`, `document.url` / `document.document_url`).
 */
import { normalizePuCode } from "../directory";
import type { Election } from "../elections";
import type { IrevElection, IrevOption, IrevUnit } from "./types";

/** Older uploads store a bucket-relative path in `document.document` instead of a full URL. */
export const IREV_BUCKET = "https://etransmission-result-docs.s3.eu-west-2.amazonaws.com/";

/** IReV ids are MongoDB ObjectIds. Anything else is rejected before it reaches IReV. */
export const IREV_ID = /^[a-f0-9]{24}$/i;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const id = (o: Obj): string | null => {
  const v = str(o._id) ?? str(o.id);
  return v && IREV_ID.test(v) ? v : null;
};

/** IReV wraps everything as { success, data, ... }. */
export const dataOf = (body: unknown): unknown => (isObj(body) ? body.data : undefined);

/** Order matters: "Area Council Chairmanship" contains "council", so chairmanship is tried first. */
const TYPE_PATTERNS: [Election, RegExp][] = [
  ["presidential", /presiden|\bpres\b/i],
  ["governorship", /governor|\bgov\b/i],
  ["senatorial", /senat|\bsen\b/i],
  ["state_assembly", /assembly|\bhoa\b|\bsha\b/i],
  ["house_of_reps", /representatives|house of rep|\breps?\b|\bhor\b/i],
  ["chairmanship", /chairm/i],
  ["councillorship", /counc?ill?or/i],
];

/** Which CounTrack election an IReV election type (by its name and code) is, if any. */
export function electionOfType(type: { name?: unknown; code?: unknown }): Election | null {
  const label = `${str(type.name) ?? ""} ${str(type.code) ?? ""}`;
  return TYPE_PATTERNS.find(([, re]) => re.test(label))?.[0] ?? null;
}

export function toElectionTypes(body: unknown): (IrevOption & { election: Election | null })[] {
  return arr(dataOf(body)).flatMap((raw) => {
    if (!isObj(raw)) return [];
    const typeId = id(raw);
    const name = str(raw.name);
    return typeId && name ? [{ id: typeId, name, code: str(raw.code), election: electionOfType(raw) }] : [];
  });
}

const isoDate = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

export function toElection(raw: unknown): IrevElection | null {
  if (!isObj(raw)) return null;
  const electionId = id(raw);
  const name = str(raw.full_name) ?? str(raw.name);
  if (!electionId || !name) return null;
  return { id: electionId, name, date: isoDate(raw.election_date) ?? isoDate(raw.date) };
}

export const toElections = (body: unknown): IrevElection[] =>
  arr(dataOf(body))
    .map(toElection)
    .filter((e): e is IrevElection => e !== null)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.name.localeCompare(b.name));

/** "2023", "2023-02" or "2023-02-25" against an election's date, or the year in its name when it has no date. */
export function matchesDate(e: IrevElection, date: string | null): boolean {
  if (!date) return true;
  if (e.date) return e.date.startsWith(date);
  return e.name.includes(date.slice(0, 4));
}

const toOption = (raw: unknown): IrevOption | null => {
  if (!isObj(raw)) return null;
  const optId = id(raw);
  const name = str(raw.name);
  return optId && name ? { id: optId, name, code: str(raw.code) } : null;
};

const byName = (a: IrevOption, b: IrevOption) => a.name.localeCompare(b.name);
const options = (list: unknown[]) => list.map(toOption).filter((o): o is IrevOption => o !== null).sort(byName);

/** LGA rows look like { lga: { _id, name, code }, state, wards }. */
export const toLgas = (body: unknown): IrevOption[] =>
  options(arr(dataOf(body)).map((row) => (isObj(row) && isObj(row.lga) ? row.lga : row)));

/** One LGA's page: { data: { lga, wards: [...] } } (some responses put wards at the top level). */
export function toWards(body: unknown): IrevOption[] {
  const data = dataOf(body);
  const wards = isObj(data) && Array.isArray(data.wards) ? data.wards : isObj(body) ? arr(body.wards) : [];
  return options(wards);
}

function documentUrl(doc: Obj): string | null {
  const full = str(doc.document_url) ?? str(doc.url);
  const rel = str(doc.document);
  const url = full ?? (rel ? IREV_BUCKET + rel.replace(/^\/+/, "") : null);
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function toUnit(raw: unknown): IrevUnit | null {
  if (!isObj(raw)) return null;
  const unitId = id(raw);
  const pu = isObj(raw.polling_unit) ? raw.polling_unit : {};
  const name = str(raw.name) ?? str(pu.name);
  if (!unitId || !name) return null;
  const irevCode = str(raw.pu_code) ?? str(pu.pu_code);
  const doc = isObj(raw.document) ? raw.document : {};
  const url = documentUrl(doc);
  return {
    id: unitId,
    name,
    irevCode,
    code: irevCode ? normalizePuCode(irevCode) : null,
    documentUrl: url,
    isPdf: !!url && /\.pdf($|\?)/i.test(url),
    isSupplement: doc.is_supplement === true,
    uploadedAt: url ? (str(doc.updated_at) ?? str(raw.updated_at)) : null,
  };
}

export const toUnits = (body: unknown): IrevUnit[] =>
  arr(dataOf(body))
    .map(toUnit)
    .filter((u): u is IrevUnit => u !== null)
    .sort((a, b) => (a.code ?? a.name).localeCompare(b.code ?? b.name));
