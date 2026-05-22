import { describe, it, expect } from 'vitest';
import { INITIAL_ELO, type Pairing } from '../elo';
import {
  selectNext,
  decidePosition,
  type MatchmakingState,
  type MatchmakingHistoryEntry,
} from '../matchmaking';

const make = (id: string, overrides: Partial<Pairing> = {}): Pairing => ({
  id,
  elo: INITIAL_ELO,
  comparisons: 0,
  leftShown: 0,
  rightShown: 0,
  ...overrides,
});

const stateOf = (
  pairings: Pairing[],
  history: MatchmakingHistoryEntry[] = [],
): MatchmakingState => ({ pairings, history });

describe('matchmaking — selectNext', () => {
  it('picks two uncovered pairings during the coverage phase', () => {
    const pairings = ['a', 'b', 'c', 'd'].map((id) => make(id));
    const [l, r] = selectNext(stateOf(pairings));
    expect(l.comparisons).toBe(0);
    expect(r.comparisons).toBe(0);
    expect(l.id).not.toBe(r.id);
  });

  it('mates the last uncovered pairing against an already-covered one', () => {
    const pairings = [
      make('a', { comparisons: 0 }),
      make('b', { comparisons: 3 }),
      make('c', { comparisons: 4 }),
      make('d', { comparisons: 5 }),
    ];
    const [l, r] = selectNext(stateOf(pairings));
    const ids = new Set([l.id, r.id]);
    expect(ids.has('a')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it('does not re-pick a pairing inside the recent-block window', () => {
    // a/b/c are in the last two history entries → must all be blocked,
    // leaving d/e/f as the only candidates for the next selection.
    const pairings = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) =>
      make(id, { comparisons: 1 }),
    );
    const history: MatchmakingHistoryEntry[] = [
      { leftId: 'a', rightId: 'b' },
      { leftId: 'a', rightId: 'c' },
    ];
    const blocked = new Set(['a', 'b', 'c']);
    for (let trial = 0; trial < 50; trial++) {
      const [l, r] = selectNext(stateOf(pairings, history));
      expect(blocked.has(l.id)).toBe(false);
      expect(blocked.has(r.id)).toBe(false);
      expect(l.id).not.toBe(r.id);
    }
  });
});

describe('matchmaking — decidePosition', () => {
  it('puts the more right-shown pairing on the left', () => {
    const a = make('a', { leftShown: 5, rightShown: 1 }); // imbalance +4
    const b = make('b', { leftShown: 1, rightShown: 5 }); // imbalance -4
    const [l] = decidePosition(a, b);
    expect(l.id).toBe('b');
  });

  it('returns the pair in some order when imbalances are tied', () => {
    const a = make('a', { leftShown: 2, rightShown: 2 });
    const b = make('b', { leftShown: 2, rightShown: 2 });
    const [l, r] = decidePosition(a, b);
    expect(new Set([l.id, r.id])).toEqual(new Set(['a', 'b']));
  });
});
