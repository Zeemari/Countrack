/**
 * Shared types and zod schemas for client and server.
 * DB row types come from `supabase gen types` (lib/database.types.ts); this file holds
 * the JSONB shapes, API payloads, and the vision-model contract.
 */
import { z } from "zod";

// ── Primitives ─────────────────────────────────────────────────────────
export const PartyCode = z.string().regex(/^[A-Z0-9]{1,8}$/);
const Count = z.number().int().min(0).max(100_000);

// ── Vision contract: the EXACT JSON the model must return ──────────────
// Sent to the API as the structured-output schema, then re-validated here with safeParse
// (the API's schema subset drops checks like max/regex). Rule for the model: if a figure
// can't be read with certainty, return null. Never guess.
export const VisionExtraction = z.object({
  is_result_sheet: z.boolean(),
  form_type: z.enum(["EC8A", "OTHER", "UNKNOWN"]),
  polling_unit_code: z.string().max(40).nullable(),
  registered_voters: Count.nullable(),
  accredited_voters: Count.nullable(),
  rejected_ballots: Count.nullable(),
  total_valid_votes: Count.nullable(),
  total_votes_cast: Count.nullable(),
  party_scores: z.array(z.object({ party: PartyCode, votes: Count })).max(30),
  unreadable_fields: z.array(z.string().max(40)).max(40), // field names or party codes
  words_digits_conflicts: z.array(z.string().max(40)).max(40), // EC8A writes figures in words AND digits
  confidence: z.number().min(0).max(1),
  notes: z.string().max(300),
});
export type VisionExtraction = z.infer<typeof VisionExtraction>;

// ── Domain shapes (extracted_results columns, unit_results.agreed_scores) ──
export const PartyScores = z.record(PartyCode, Count);
export type PartyScores = z.infer<typeof PartyScores>;

export const ExtractedResult = z.object({
  registered: Count.nullable(),
  accredited: Count.nullable(),
  rejected: Count.nullable(),
  total_valid: Count.nullable(),
  votes_cast: Count.nullable(),
  party_scores: PartyScores,
});
export type ExtractedResult = z.infer<typeof ExtractedResult>;

// ── Rule checks (plain code). Codes map to i18n keys; wording never accuses anyone. ──
export const CheckCode = z.enum([
  "VOTES_CAST_GT_ACCREDITED", // votes cast > accredited
  "ACCREDITED_GT_REGISTERED", // accredited > registered
  "PARTY_SUM_NE_TOTAL_VALID", // sum(parties) ≠ total valid
  "VALID_PLUS_REJECTED_NE_CAST", // valid + rejected ≠ votes cast
  "MISSING_FIELD", // a required figure was unreadable
  "WORDS_DIGITS_CONFLICT", // figure in words ≠ figure in digits
  "LOW_CONFIDENCE", // model confidence below threshold
  "NOT_A_RESULT_SHEET",
]);
export type CheckCode = z.infer<typeof CheckCode>;

/**
 * blocking: the reading itself is unusable (unreadable / not a result sheet), so it
 *           can't count toward verification.
 * warning:  the reading is usable, but the numbers on the sheet look impossible.
 *           Two witnesses can still verify WHAT THE WALL SAYS; the warning stays visible.
 */
export const CheckFlag = z.object({
  code: CheckCode,
  severity: z.enum(["blocking", "warning"]),
  field: z.string().optional(),
  expected: z.number().optional(),
  actual: z.number().optional(),
});
export type CheckFlag = z.infer<typeof CheckFlag>;
export const CheckFlags = z.array(CheckFlag);

export type CheckMeta = {
  confidence?: number;
  unreadable?: string[];
  conflicts?: string[];
  isResultSheet?: boolean;
};

// ── Consensus ──────────────────────────────────────────────────────────
export type UnitStatus = "pending" | "verified" | "flagged";
export type Reading = { userId: string; result: ExtractedResult; flags: CheckFlag[] };
export type Consensus = {
  status: UnitStatus;
  agreed: ExtractedResult | null;
  witnessCount: number;
};

// ── Diff ───────────────────────────────────────────────────────────────
export type PartyDiff = {
  party: string;
  wall_votes: number;
  announced_votes: number;
  difference: number; // announced − wall
};

// ── API payloads (validated in route handlers) ─────────────────────────
export const ExtractRequest = z.object({ photoId: z.uuid() });

export const CollationInput = z.object({
  level: z.enum(["ward", "lga", "state", "national"]),
  areaCode: z.string().min(1).max(40),
  unitId: z.uuid().nullable(),
  partyScores: PartyScores,
  source: z.string().min(1).max(80),
  announcedAt: z.iso.datetime(),
});

export const CheckInInput = z.object({
  unitId: z.uuid(),
  officialsArrived: z.boolean(),
  bvasPresent: z.boolean(),
  materialsOk: z.boolean(),
  openedAt: z.iso.datetime().nullable(),
  notes: z.string().max(500).optional(),
});

export const MoveFlagInput = z.object({
  unitId: z.uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ── Offline queue item (IndexedDB, browser only) ───────────────────────
export type QueuedCapture = {
  localId: string;
  unitId: string;
  blob: Blob; // the compressed JPEG: exactly the bytes that were hashed
  sha256: string;
  capturedAt: string; // ISO, device clock
  status: "queued" | "uploading" | "uploaded" | "extracting" | "done" | "failed";
  attempts: number;
  photoId?: string;
  error?: string;
};

// ── Public unit page timeline ──────────────────────────────────────────
export type TimelineEvent =
  | { kind: "check_in"; at: string; officialsArrived: boolean; bvasPresent: boolean; materialsOk: boolean }
  | { kind: "photo"; at: string; uploadedAt: string; sha256: string; hashVerified: boolean | null; witness: number }
  | { kind: "verified"; at: string; witnessCount: number }
  | { kind: "collation"; at: string; level: string; matches: boolean }
  | { kind: "packet"; at: string; url: string };
