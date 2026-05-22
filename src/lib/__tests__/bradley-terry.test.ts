import { describe, it, expect } from 'vitest';
import {
  computeBradleyTerry,
  votesToComparisons,
  invertSquareMatrix,
  type BTComparison,
} from '../bradley-terry';

describe('bradley-terry', () => {
  it('returns 1000 for every item when there are no comparisons', () => {
    const out = computeBradleyTerry(['a', 'b', 'c'], []);
    for (const id of ['a', 'b', 'c']) {
      expect(out.ratings[id]).toBeCloseTo(1000, 6);
      expect(out.seRatings[id]).toBeNull();
      expect(out.gameCount[id]).toBe(0);
      expect(out.winCount[id]).toBe(0);
      expect(out.winRate[id]).toBeNull();
    }
  });

  it('ranks A > B > C from a noisy-but-ordered set of wins', () => {
    // Each pair has a clear winner but a couple of upsets, so the
    // likelihood is finite and the MM iteration converges (a pure
    // transitive set with zero upsets is a known B-T degeneracy).
    const cmps: BTComparison[] = [];
    for (let i = 0; i < 10; i++) {
      cmps.push({ winner: 'a', loser: 'b', weight: 1 });
      cmps.push({ winner: 'b', loser: 'c', weight: 1 });
      cmps.push({ winner: 'a', loser: 'c', weight: 1 });
    }
    cmps.push({ winner: 'b', loser: 'a', weight: 1 });
    cmps.push({ winner: 'c', loser: 'b', weight: 1 });
    cmps.push({ winner: 'c', loser: 'a', weight: 1 });
    const out = computeBradleyTerry(['a', 'b', 'c'], cmps);
    expect(out.converged).toBe(true);
    expect(out.ratings.a).toBeGreaterThan(out.ratings.b);
    expect(out.ratings.b).toBeGreaterThan(out.ratings.c);
    expect(out.winRate.a!).toBeGreaterThan(out.winRate.c!);
    expect(out.seRatings.a).not.toBeNull();
  });

  it('keeps mean rating near 1000 (geometric-mean normalization)', () => {
    const cmps: BTComparison[] = [
      { winner: 'a', loser: 'b', weight: 3 },
      { winner: 'b', loser: 'a', weight: 1 },
      { winner: 'a', loser: 'c', weight: 2 },
      { winner: 'c', loser: 'b', weight: 2 },
    ];
    const out = computeBradleyTerry(['a', 'b', 'c'], cmps);
    const mean = (out.ratings.a + out.ratings.b + out.ratings.c) / 3;
    expect(mean).toBeCloseTo(1000, 4);
  });

  it('emits two half-weight rows per tie via votesToComparisons', () => {
    const cmps = votesToComparisons([
      { winnerItemId: 'a', loserItemId: 'b', outcome: 'decisive' },
      { winnerItemId: 'a', loserItemId: 'b', outcome: 'tie' },
      { winnerItemId: 'a', loserItemId: 'b', outcome: 'both_bad' },
      { winnerItemId: 'a', loserItemId: 'a', outcome: 'decisive' }, // dropped
    ]);
    expect(cmps).toHaveLength(1 + 2 + 2);
    expect(cmps[0]).toEqual({ winner: 'a', loser: 'b', weight: 1 });
    expect(cmps.filter((c) => c.weight === 0.5)).toHaveLength(4);
  });

  it('returns null for a singular matrix', () => {
    // Two identical rows are linearly dependent → singular.
    expect(invertSquareMatrix([[1, 2], [1, 2]])).toBeNull();
  });

  it('inverts the identity matrix to itself', () => {
    const inv = invertSquareMatrix([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(inv).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });
});
