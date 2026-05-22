import { describe, it, expect } from 'vitest';
import {
  STABILITY_THRESHOLDS,
  STABILITY_LABELS,
  stabilityFor,
  votesToNextTier,
} from '../stability';

describe('stability', () => {
  it('classifies game counts inside each tier', () => {
    expect(stabilityFor(0)).toBe('directional');
    expect(stabilityFor(100)).toBe('preliminary');
    expect(stabilityFor(500)).toBe('stable');
  });

  it('uses the threshold boundary correctly (>= flips the tier)', () => {
    expect(stabilityFor(STABILITY_THRESHOLDS.preliminary - 1)).toBe(
      'directional',
    );
    expect(stabilityFor(STABILITY_THRESHOLDS.preliminary)).toBe('preliminary');
    expect(stabilityFor(STABILITY_THRESHOLDS.stable - 1)).toBe('preliminary');
    expect(stabilityFor(STABILITY_THRESHOLDS.stable)).toBe('stable');
  });

  it('reports how many votes remain to the next tier', () => {
    expect(votesToNextTier(0)).toBe(STABILITY_THRESHOLDS.preliminary);
    expect(votesToNextTier(STABILITY_THRESHOLDS.preliminary)).toBe(
      STABILITY_THRESHOLDS.stable - STABILITY_THRESHOLDS.preliminary,
    );
    expect(votesToNextTier(STABILITY_THRESHOLDS.stable)).toBeNull();
    expect(votesToNextTier(1_000)).toBeNull();
  });

  it('has a label for every tier', () => {
    expect(STABILITY_LABELS.directional).toBe('Directional');
    expect(STABILITY_LABELS.preliminary).toBe('Preliminary');
    expect(STABILITY_LABELS.stable).toBe('Stable');
  });
});
