import { describe, expect, it } from "vitest";
import { checkResult } from "@/lib/rules/checks";
import { VisionExtraction } from "@/lib/schemas";
import { fromVision } from "@/lib/vision/map";

const sample = {
  is_result_sheet: true,
  form_type: "EC8A",
  polling_unit_code: "SIM-003",
  registered_voters: 690,
  accredited_voters: 403,
  rejected_ballots: 6,
  total_valid_votes: 397,
  total_votes_cast: 403,
  party_scores: [
    { party: "PA", votes: 131 },
    { party: "PB", votes: 142 },
    { party: "PC", votes: 98 },
    { party: "PD", votes: 26 },
  ],
  unreadable_fields: [],
  words_digits_conflicts: [],
  confidence: 0.92,
  notes: "",
};

describe("VisionExtraction contract", () => {
  it("accepts the documented example", () => {
    expect(VisionExtraction.safeParse(sample).success).toBe(true);
  });

  it("rejects negative votes, bad party codes and missing keys", () => {
    expect(VisionExtraction.safeParse({ ...sample, total_votes_cast: -1 }).success).toBe(false);
    expect(VisionExtraction.safeParse({ ...sample, party_scores: [{ party: "pa", votes: 1 }] }).success).toBe(false);
    const missing: Partial<typeof sample> = { ...sample };
    delete missing.notes;
    expect(VisionExtraction.safeParse(missing).success).toBe(false);
  });
});

describe("fromVision", () => {
  it("maps to the stored shape and passes rule checks", () => {
    const { result, meta } = fromVision(VisionExtraction.parse(sample));
    expect(result).toEqual({
      registered: 690, accredited: 403, rejected: 6, total_valid: 397, votes_cast: 403,
      party_scores: { PA: 131, PB: 142, PC: 98, PD: 26 },
    });
    expect(checkResult(result, meta)).toEqual([]);
  });

  it("carries unreadable fields through as blocking flags", () => {
    const v = VisionExtraction.parse({ ...sample, accredited_voters: null, unreadable_fields: ["accredited_voters"] });
    const { result, meta } = fromVision(v);
    expect(checkResult(result, meta).filter((f) => f.severity === "blocking").length).toBeGreaterThan(0);
  });
});
