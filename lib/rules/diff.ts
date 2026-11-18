import type { PartyDiff, PartyScores } from "../schemas";

/** Per-party comparison of the verified wall result vs an announced figure. Missing party = 0. */
export function diffScores(wall: PartyScores, announced: PartyScores): PartyDiff[] {
  const parties = [...new Set([...Object.keys(wall), ...Object.keys(announced)])].sort();
  return parties.map((party) => {
    const wall_votes = wall[party] ?? 0;
    const announced_votes = announced[party] ?? 0;
    return { party, wall_votes, announced_votes, difference: announced_votes - wall_votes };
  });
}

export const hasMismatch = (diffs: PartyDiff[]) => diffs.some((d) => d.difference !== 0);
