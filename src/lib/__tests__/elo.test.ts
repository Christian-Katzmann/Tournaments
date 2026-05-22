import { describe, it, expect } from 'vitest';
import {
  INITIAL_ELO,
  expectedScore,
  adaptiveK,
  computeEloDeltas,
  confidenceInterval,
  type Pairing,
} from '../elo';

const make = (overrides: Partial<Pairing> = {}): Pairing => ({
  id: 'p',
  elo: INITIAL_ELO,
  comparisons: 0,
  leftShown: 0,
  rightShown: 0,
  ...overrides,
});

describe('elo', () => {
  it('gives equal-Elo pairings a 0.5 expected score', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
  });

  it('uses the K-factor schedule across boundaries', () => {
    expect(adaptiveK(0)).toBe(40);
    expect(adaptiveK(4)).toBe(40);
    expect(adaptiveK(5)).toBe(24);
    expect(adaptiveK(14)).toBe(24);
    expect(adaptiveK(15)).toBe(16);
    expect(adaptiveK(1_000)).toBe(16);
  });

  it('produces symmetric deltas on equal-Elo first-time match', () => {
    const left = make({ id: 'a' });
    const right = make({ id: 'b' });
    const { deltaLeft, deltaRight } = computeEloDeltas(left, right, 'left');
    // Both are K=40, equal Elo → ±20 each.
    expect(deltaLeft).toBeCloseTo(20, 10);
    expect(deltaRight).toBeCloseTo(-20, 10);
  });

  it('rewards an underdog win and barely moves an overwhelming favourite', () => {
    const favourite = make({ id: 'fav', elo: 1900 });
    const underdog = make({ id: 'dog', elo: 1400 });
    const { deltaLeft, deltaRight } = computeEloDeltas(
      underdog,
      favourite,
      'left',
    );
    expect(deltaLeft).toBeGreaterThan(30); // big swing toward underdog
    expect(deltaRight).toBeLessThan(-30); // matching loss for favourite
  });

  it('returns the 999 sentinel for a pairing with zero comparisons', () => {
    expect(confidenceInterval(0)).toBe(999);
  });

  it('shrinks the confidence interval as sample size grows', () => {
    expect(confidenceInterval(16)).toBeLessThan(confidenceInterval(4));
    expect(confidenceInterval(100)).toBeLessThan(confidenceInterval(16));
  });
});
