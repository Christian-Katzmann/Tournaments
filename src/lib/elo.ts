/**
 * Adaptive-K Elo for pairwise tournaments.
 *
 * Ported verbatim from besk-typography-tournament/src/lib/elo.ts. The
 * Pairing type is kept minimal here so this module is candidate-shape
 * agnostic and reusable across every tournament `kind`.
 */

export const INITIAL_ELO = 1500;

export interface Pairing {
  id: string;
  elo: number;
  comparisons: number;
  leftShown: number;
  rightShown: number;
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function adaptiveK(comparisons: number): number {
  if (comparisons < 5) return 40;
  if (comparisons < 15) return 24;
  return 16;
}

export interface EloDeltas {
  deltaLeft: number;
  deltaRight: number;
}

export function computeEloDeltas(
  left: Pairing,
  right: Pairing,
  choice: 'left' | 'right',
): EloDeltas {
  const expectedLeft = expectedScore(left.elo, right.elo);
  const kLeft = adaptiveK(left.comparisons);
  const kRight = adaptiveK(right.comparisons);
  const scoreLeft = choice === 'left' ? 1 : 0;
  const scoreRight = 1 - scoreLeft;
  return {
    deltaLeft: kLeft * (scoreLeft - expectedLeft),
    deltaRight: kRight * (scoreRight - (1 - expectedLeft)),
  };
}

export function confidenceInterval(comparisons: number): number {
  if (comparisons === 0) return 999;
  return Math.round(400 / Math.sqrt(comparisons));
}
