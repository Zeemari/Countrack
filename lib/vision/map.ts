import type { CheckMeta, ExtractedResult, PartyScores, VisionExtraction } from "../schemas";

/** Converts the model's JSON into the stored result shape plus the metadata the rule checks need. */
export function fromVision(v: VisionExtraction): { result: ExtractedResult; meta: CheckMeta } {
  const party_scores: PartyScores = {};
  for (const { party, votes } of v.party_scores) party_scores[party] = votes;
  return {
    result: {
      registered: v.registered_voters,
      accredited: v.accredited_voters,
      rejected: v.rejected_ballots,
      total_valid: v.total_valid_votes,
      votes_cast: v.total_votes_cast,
      party_scores,
    },
    meta: {
      confidence: v.confidence,
      unreadable: v.unreadable_fields,
      conflicts: v.words_digits_conflicts,
      isResultSheet: v.is_result_sheet,
    },
  };
}
