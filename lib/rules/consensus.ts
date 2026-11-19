import type { Consensus, ExtractedResult, Reading } from "../schemas";
import { isBlocked } from "./checks";

export const SOLO_EC8_WAIT_MS = 5 * 60 * 60 * 1000;

/** Order-independent key for "these two readings say the same thing". A party at 0 equals an absent party. */
export function readingKey(r: ExtractedResult): string {
  const parties = Object.entries(r.party_scores)
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([r.registered, r.accredited, r.rejected, r.total_valid, r.votes_cast, parties]);
}

/**
 * verified: the largest group of identical, unblocked readings has ≥2 DISTINCT witnesses
 *           and is strictly larger than every other group, or one clear EC8A is at least
 *           five hours old and there is no conflicting clear EC8A.
 * flagged:  ≥2 witnesses but no such group, i.e. their records don't match.
 * pending:  fewer than 2 witnesses.
 * Readings must be ordered oldest → newest; only each witness's latest reading counts.
 */
export function computeConsensus(readings: Reading[], now = Date.now()): Consensus {
  const latestByUser = new Map<string, Reading>();
  for (const r of readings) latestByUser.set(r.userId, r);
  const witnessCount = latestByUser.size;

  const groups = new Map<string, Reading[]>();
  for (const r of latestByUser.values()) {
    if (isBlocked(r.flags)) continue;
    const key = readingKey(r.result);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const sizes = [...groups.values()].map((g) => g.length).sort((a, b) => b - a);
  const [best = 0, runnerUp = 0] = sizes;

  if (best >= 2 && best > runnerUp) {
    const winner = [...groups.values()].find((g) => g.length === best)!;
    return { status: "verified", agreed: winner[0].result, witnessCount };
  }

  // A lone result can establish the wall result after five hours, but only when it is
  // specifically a clear, reliable EC8A. Conflicting eligible EC8s remain flagged.
  const clearEc8Readings = [...latestByUser.values()].filter((r) => r.clearEc8 && !isBlocked(r.flags));
  const clearKeys = new Set(clearEc8Readings.map((r) => readingKey(r.result)));
  if (clearEc8Readings.length > 0 && clearKeys.size === 1) {
    const submittedAt = clearEc8Readings[0].submittedAt;
    const uploadedAt = submittedAt ? Date.parse(submittedAt) : Number.NaN;
    if (Number.isFinite(uploadedAt) && now - uploadedAt >= SOLO_EC8_WAIT_MS) {
      return { status: "verified", agreed: clearEc8Readings[0].result, witnessCount };
    }
  }
  return { status: witnessCount >= 2 ? "flagged" : "pending", agreed: null, witnessCount };
}
