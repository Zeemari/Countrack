import { describe, expect, it } from "vitest";
import { checkResult } from "@/lib/rules/checks";
import { computeConsensus } from "@/lib/rules/consensus";
import { diffScores, hasMismatch } from "@/lib/rules/diff";
import type { ExtractedResult } from "@/lib/schemas";

const good: ExtractedResult = {
  registered: 690,
  accredited: 403,
  rejected: 6,
  total_valid: 397,
  votes_cast: 403,
  party_scores: { PA: 131, PB: 142, PC: 98, PD: 26 },
};
const codes = (r: ExtractedResult, meta = {}) => checkResult(r, meta).map((f) => f.code);

describe("checkResult", () => {
  it("passes a consistent sheet", () => {
    expect(checkResult(good, { confidence: 0.95 })).toEqual([]);
  });

  it("flags votes cast > accredited", () => {
    expect(codes({ ...good, accredited: 400 })).toContain("VOTES_CAST_GT_ACCREDITED");
  });

  it("flags accredited > registered", () => {
    expect(codes({ ...good, registered: 300 })).toContain("ACCREDITED_GT_REGISTERED");
  });

  it("flags party scores not summing to total valid", () => {
    const flags = checkResult({ ...good, party_scores: { ...good.party_scores, PC: 96 } });
    expect(flags).toContainEqual({ code: "PARTY_SUM_NE_TOTAL_VALID", severity: "warning", expected: 397, actual: 395 });
  });

  it("flags valid + rejected ≠ votes cast", () => {
    expect(codes({ ...good, rejected: 10 })).toContain("VALID_PLUS_REJECTED_NE_CAST");
  });

  it("blocks on unreadable required fields, once per field", () => {
    const flags = checkResult({ ...good, accredited: null }, { unreadable: ["accredited", "PB"] });
    expect(flags.filter((f) => f.code === "MISSING_FIELD").map((f) => f.field)).toEqual(["accredited", "PB"]);
    expect(flags.every((f) => f.severity === "blocking")).toBe(true);
  });

  it("returns only NOT_A_RESULT_SHEET for non-sheets", () => {
    expect(codes(good, { isResultSheet: false })).toEqual(["NOT_A_RESULT_SHEET"]);
  });

  it("warns on low confidence and words/digits conflicts", () => {
    expect(codes(good, { confidence: 0.4, conflicts: ["PB"] })).toEqual(["WORDS_DIGITS_CONFLICT", "LOW_CONFIDENCE"]);
  });
});

describe("computeConsensus", () => {
  const read = (userId: string, r = good) => ({ userId, result: r, flags: checkResult(r) });
  const misread = { ...good, party_scores: { ...good.party_scores, PC: 96 } };

  it("is pending with one witness", () => {
    expect(computeConsensus([read("a")])).toMatchObject({ status: "pending", witnessCount: 1, agreed: null });
  });

  it("verifies when two distinct witnesses agree", () => {
    expect(computeConsensus([read("a"), read("b")])).toMatchObject({ status: "verified", witnessCount: 2, agreed: good });
  });

  it("does not count the same witness twice", () => {
    expect(computeConsensus([read("a"), read("a")])).toMatchObject({ status: "pending", witnessCount: 1 });
  });

  it("uses only a witness's latest reading", () => {
    expect(computeConsensus([read("a", misread), read("a"), read("b")]).status).toBe("verified");
  });

  it("flags when two witnesses disagree", () => {
    expect(computeConsensus([read("a"), read("b", misread)])).toMatchObject({ status: "flagged", agreed: null });
  });

  it("verifies the majority (2 vs 1)", () => {
    expect(computeConsensus([read("a"), read("b", misread), read("c")]).status).toBe("verified");
  });

  it("does not verify a 2-vs-2 split", () => {
    expect(computeConsensus([read("a"), read("b"), read("c", misread), read("d", misread)]).status).toBe("flagged");
  });

  it("ignores blocked readings", () => {
    const blocked = { userId: "b", result: good, flags: checkResult(good, { isResultSheet: false }) };
    expect(computeConsensus([read("a"), blocked]).status).toBe("flagged");
  });

  it("treats party order and zero-vote parties as equal", () => {
    const reordered = { ...good, party_scores: { PD: 26, PC: 98, PB: 142, PA: 131, PE: 0 } };
    expect(computeConsensus([read("a"), read("b", reordered)]).status).toBe("verified");
  });
});

describe("diffScores", () => {
  it("shows the SIM-003 mismatch", () => {
    const diffs = diffScores(good.party_scores, { ...good.party_scores, PB: 241 });
    expect(diffs.find((d) => d.party === "PB")).toEqual({ party: "PB", wall_votes: 142, announced_votes: 241, difference: 99 });
    expect(hasMismatch(diffs)).toBe(true);
  });

  it("reports no mismatch when equal", () => {
    expect(hasMismatch(diffScores(good.party_scores, { ...good.party_scores }))).toBe(false);
  });

  it("treats a party missing on one side as 0", () => {
    expect(diffScores({ PA: 5 }, { PB: 3 })).toEqual([
      { party: "PA", wall_votes: 5, announced_votes: 0, difference: -5 },
      { party: "PB", wall_votes: 0, announced_votes: 3, difference: 3 },
    ]);
  });
});
