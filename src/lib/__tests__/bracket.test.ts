import { describe, it, expect } from 'vitest';
import {
  sampleSeed,
  nextBattle,
  advancerFor,
  finalRanking,
  type BracketSeed,
  type TournamentVote,
} from '../bracket';

const SEED: BracketSeed = ['a', 'b', 'c', 'd'];

const vote = (
  position: TournamentVote['bracketPosition'],
  candidateAId: string,
  candidateBId: string,
  winner: TournamentVote['winner'],
): TournamentVote => ({
  bracketPosition: position,
  candidateAId,
  candidateBId,
  winner,
  advancedCandidateId: advancerFor({ candidateAId, candidateBId, winner }),
});

describe('bracket — sampleSeed', () => {
  it('returns the input untouched when given exactly 4 candidates', () => {
    expect(sampleSeed(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('throws on fewer than 4 candidates', () => {
    expect(() => sampleSeed(['a', 'b', 'c'])).toThrow();
  });

  it('returns 4 distinct candidates drawn from the input pool', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f'];
    const seed = sampleSeed(pool);
    expect(seed).toHaveLength(4);
    expect(new Set(seed).size).toBe(4);
    for (const id of seed) expect(pool).toContain(id);
  });
});

describe('bracket — nextBattle progression', () => {
  it('opens with b1 (seeds 1 vs 2)', () => {
    const battle = nextBattle(SEED, []);
    expect(battle?.position).toBe('b1');
    expect(battle?.candidateAId).toBe('a');
    expect(battle?.candidateBId).toBe('b');
  });

  it('walks b1 → b2 → b3 → b4 → finished on decisive outcomes', () => {
    const votes: TournamentVote[] = [];
    votes.push(vote('b1', 'a', 'b', 'A'));
    expect(nextBattle(SEED, votes)?.position).toBe('b2');
    votes.push(vote('b2', 'c', 'd', 'A'));
    expect(nextBattle(SEED, votes)?.position).toBe('b3');
    votes.push(vote('b3', 'a', 'c', 'A'));
    expect(nextBattle(SEED, votes)?.position).toBe('b4');
    votes.push(vote('b4', 'b', 'd', 'A'));
    expect(nextBattle(SEED, votes)).toBeNull();
  });

  it('runs b5 as a tiebreaker only when b3 is inconclusive', () => {
    const votes: TournamentVote[] = [
      vote('b1', 'a', 'b', 'A'),
      vote('b2', 'c', 'd', 'A'),
      vote('b3', 'a', 'c', 'tie'),
      vote('b4', 'b', 'd', 'A'),
    ];
    expect(nextBattle(SEED, votes)?.position).toBe('b5');
  });
});

describe('bracket — finalRanking', () => {
  it('returns an empty array when the bracket is unfinished', () => {
    expect(finalRanking([vote('b1', 'a', 'b', 'A')])).toEqual([]);
  });

  it('produces 1 / 2 / 3 / 4 on a clean decisive tournament', () => {
    const ranking = finalRanking([
      vote('b1', 'a', 'b', 'A'),
      vote('b2', 'c', 'd', 'A'),
      vote('b3', 'a', 'c', 'A'),
      vote('b4', 'b', 'd', 'A'),
    ]);
    expect(ranking).toEqual([
      { rank: 1, candidateIds: ['a'] },
      { rank: 2, candidateIds: ['c'] },
      { rank: 3, candidateIds: ['b'] },
      { rank: 4, candidateIds: ['d'] },
    ]);
  });

  it('collapses ranks when every late battle is a tie', () => {
    const ranking = finalRanking([
      vote('b1', 'a', 'b', 'A'),
      vote('b2', 'c', 'd', 'A'),
      vote('b3', 'a', 'c', 'tie'),
      vote('b4', 'b', 'd', 'tie'),
      vote('b5', 'a', 'c', 'tie'),
    ]);
    expect(ranking).toEqual([
      { rank: 1, candidateIds: ['a', 'c'] },
      { rank: 3, candidateIds: ['b', 'd'] },
    ]);
  });

  it('routes b3-tie through the b5 winner', () => {
    const ranking = finalRanking([
      vote('b1', 'a', 'b', 'A'),
      vote('b2', 'c', 'd', 'A'),
      vote('b3', 'a', 'c', 'tie'),
      vote('b4', 'b', 'd', 'A'),
      vote('b5', 'a', 'c', 'B'),
    ]);
    expect(ranking[0]).toEqual({ rank: 1, candidateIds: ['c'] });
    expect(ranking[1]).toEqual({ rank: 2, candidateIds: ['a'] });
  });
});

describe('bracket — advancerFor', () => {
  it('advances the chosen side on decisive votes', () => {
    expect(advancerFor({ candidateAId: 'a', candidateBId: 'b', winner: 'A' })).toBe('a');
    expect(advancerFor({ candidateAId: 'a', candidateBId: 'b', winner: 'B' })).toBe('b');
  });

  it('coin-flips an advancer on tie / both_bad (must be one of the two)', () => {
    for (const winner of ['tie', 'both_bad'] as const) {
      const adv = advancerFor({ candidateAId: 'a', candidateBId: 'b', winner });
      expect(['a', 'b']).toContain(adv);
    }
  });
});
