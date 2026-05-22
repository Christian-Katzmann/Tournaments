/**
 * Pure 4-seed double-elimination bracket logic.
 *
 * Extracted from modelarena/src/lib/tournament.ts. modelarena layered a
 * model→generation indirection on top (each model produced a per-round
 * generation row); Tournaments compares static candidates directly, so
 * the indirection is dropped here and seeds/votes are expressed in
 * candidate IDs.
 *
 * Structure: 4 seeds → b1 (1v2), b2 (3v4) → b3 (winners' final, decides
 * 1st and 2nd), b4 (losers' final, decides 3rd and 4th). If b3 is
 * inconclusive (tie / both_bad) we run b5 as a tiebreaker between the
 * same two candidates.
 */

export type BracketPosition = 'b1' | 'b2' | 'b3' | 'b4' | 'b5';
export type VoteWinner = 'A' | 'B' | 'tie' | 'both_bad';

export type BracketSeed = readonly [string, string, string, string];

export interface NextBattle {
  position: BracketPosition;
  candidateAId: string;
  candidateBId: string;
  label: string;
  reason: string;
}

export interface TournamentVote {
  bracketPosition: BracketPosition;
  candidateAId: string;
  candidateBId: string;
  winner: VoteWinner;
  /** Which candidate advances. Null only if the bracket hasn't resolved this position yet. */
  advancedCandidateId: string | null;
}

/** Fisher-Yates, pick first 4. */
export function sampleSeed(allIds: readonly string[]): BracketSeed {
  if (allIds.length < 4) {
    throw new Error(
      `bracket needs >= 4 candidates for a tournament; got ${allIds.length}`,
    );
  }
  if (allIds.length === 4) {
    return [...allIds] as unknown as BracketSeed;
  }
  const a = [...allIds];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return [a[0], a[1], a[2], a[3]];
}

export function coinFlip<T>(a: T, b: T): T {
  return Math.random() < 0.5 ? a : b;
}

export function nextBattle(
  seed: BracketSeed,
  votes: readonly TournamentVote[],
): NextBattle | null {
  const byPos: Partial<Record<BracketPosition, TournamentVote>> = {};
  for (const v of votes) byPos[v.bracketPosition] = v;

  if (!byPos.b1) {
    return {
      position: 'b1',
      candidateAId: seed[0],
      candidateBId: seed[1],
      label: 'Battle 1 of 5',
      reason: 'Opening match · seed 1 vs seed 2',
    };
  }
  if (!byPos.b2) {
    return {
      position: 'b2',
      candidateAId: seed[2],
      candidateBId: seed[3],
      label: 'Battle 2 of 5',
      reason: 'Opening match · seed 3 vs seed 4',
    };
  }

  const b1Adv = byPos.b1.advancedCandidateId;
  const b2Adv = byPos.b2.advancedCandidateId;
  if (!b1Adv || !b2Adv) {
    throw new Error('b1/b2 votes exist but advancedCandidateId is missing');
  }
  const loserOf = (v: TournamentVote, advancer: string): string =>
    advancer === v.candidateAId ? v.candidateBId : v.candidateAId;
  const b1Loser = loserOf(byPos.b1, b1Adv);
  const b2Loser = loserOf(byPos.b2, b2Adv);

  if (!byPos.b3) {
    return {
      position: 'b3',
      candidateAId: b1Adv,
      candidateBId: b2Adv,
      label: 'Battle 3 of 5',
      reason: 'Winners’ final · decides 1st and 2nd',
    };
  }
  if (!byPos.b4) {
    return {
      position: 'b4',
      candidateAId: b1Loser,
      candidateBId: b2Loser,
      label: 'Battle 4 of 5',
      reason: 'Losers’ bracket · decides 3rd and 4th',
    };
  }
  const b3Inconclusive =
    byPos.b3.winner === 'tie' || byPos.b3.winner === 'both_bad';
  if (b3Inconclusive && !byPos.b5) {
    return {
      position: 'b5',
      candidateAId: byPos.b3.candidateAId,
      candidateBId: byPos.b3.candidateBId,
      label: 'Battle 5 of 5',
      reason: 'Tiebreaker · battle 3 was inconclusive',
    };
  }

  return null;
}

/**
 * Compute the advancer for a b1/b2 vote. For decisive outcomes the
 * winner's candidate advances; for tie/both_bad we coin-flip so
 * downstream matches can still resolve.
 */
export function advancerFor(vote: {
  candidateAId: string;
  candidateBId: string;
  winner: VoteWinner;
}): string {
  switch (vote.winner) {
    case 'A':
      return vote.candidateAId;
    case 'B':
      return vote.candidateBId;
    default:
      return coinFlip(vote.candidateAId, vote.candidateBId);
  }
}

export function finalRanking(
  votes: readonly TournamentVote[],
): Array<{ rank: number; candidateIds: string[] }> {
  const byPos: Partial<Record<BracketPosition, TournamentVote>> = {};
  for (const v of votes) byPos[v.bracketPosition] = v;

  const b3 = byPos.b3;
  const b4 = byPos.b4;
  const b5 = byPos.b5;
  if (!b3 || !b4) return [];

  const topPair = [b3.candidateAId, b3.candidateBId] as const;
  let topRanked: Array<{ rank: number; candidateIds: string[] }>;
  if (b3.winner === 'A') {
    topRanked = [
      { rank: 1, candidateIds: [topPair[0]] },
      { rank: 2, candidateIds: [topPair[1]] },
    ];
  } else if (b3.winner === 'B') {
    topRanked = [
      { rank: 1, candidateIds: [topPair[1]] },
      { rank: 2, candidateIds: [topPair[0]] },
    ];
  } else if (b5 && (b5.winner === 'A' || b5.winner === 'B')) {
    const winnerId = b5.winner === 'A' ? b5.candidateAId : b5.candidateBId;
    const loserId = b5.winner === 'A' ? b5.candidateBId : b5.candidateAId;
    topRanked = [
      { rank: 1, candidateIds: [winnerId] },
      { rank: 2, candidateIds: [loserId] },
    ];
  } else {
    topRanked = [{ rank: 1, candidateIds: [topPair[0], topPair[1]] }];
  }

  const botPair = [b4.candidateAId, b4.candidateBId] as const;
  let botRanked: Array<{ rank: number; candidateIds: string[] }>;
  if (b4.winner === 'A') {
    botRanked = [
      { rank: 3, candidateIds: [botPair[0]] },
      { rank: 4, candidateIds: [botPair[1]] },
    ];
  } else if (b4.winner === 'B') {
    botRanked = [
      { rank: 3, candidateIds: [botPair[1]] },
      { rank: 4, candidateIds: [botPair[0]] },
    ];
  } else {
    botRanked = [{ rank: 3, candidateIds: [botPair[0], botPair[1]] }];
  }

  return [...topRanked, ...botRanked];
}
