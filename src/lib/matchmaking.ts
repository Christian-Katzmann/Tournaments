/**
 * Three-phase matchmaker: coverage → stabilization → refinement.
 *
 * Ported verbatim from besk-typography-tournament/src/lib/matchmaking.ts.
 * Counterbalances left/right exposure and avoids back-to-back repeats of
 * the same pairing.
 */

import type { Pairing } from './elo';

const RECENT_BLOCK_WINDOW = 2;
const STABILIZATION_MIN = 3;
const STABILIZATION_DELTA = 150;
const REFINEMENT_DELTA = 100;
const NEAREST_POOL = 3;

export interface MatchmakingHistoryEntry {
  leftId: string;
  rightId: string;
}

export interface MatchmakingState {
  pairings: Pairing[];
  history: MatchmakingHistoryEntry[];
}

function recentlyShownIds(state: MatchmakingState): Set<string> {
  const recent = state.history.slice(-RECENT_BLOCK_WINDOW);
  return new Set(recent.flatMap((h) => [h.leftId, h.rightId]));
}

function pickAnchorAndNeighbor(
  pool: Pairing[],
  maxDelta: number,
): [Pairing, Pairing] | null {
  if (pool.length < 2) return null;
  const anchor = pool[Math.floor(Math.random() * pool.length)];
  const candidates = pool
    .filter((p) => p.id !== anchor.id)
    .map((p) => ({ p, delta: Math.abs(p.elo - anchor.elo) }))
    .sort((a, b) => a.delta - b.delta);

  const within = candidates.filter((c) => c.delta <= maxDelta);
  const usePool = within.length > 0 ? within : candidates;
  const topK = usePool.slice(0, NEAREST_POOL);
  const opponent = topK[Math.floor(Math.random() * topK.length)].p;
  return [anchor, opponent];
}

export function selectNext(state: MatchmakingState): [Pairing, Pairing] {
  const blocked = recentlyShownIds(state);
  const eligible = state.pairings.filter((p) => !blocked.has(p.id));

  const uncovered = eligible.filter((p) => p.comparisons === 0);
  if (uncovered.length >= 2) {
    const shuffled = [...uncovered].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
  }

  if (uncovered.length === 1) {
    const others = eligible.filter((p) => p.id !== uncovered[0].id);
    const opponent = others[Math.floor(Math.random() * others.length)];
    return [uncovered[0], opponent];
  }

  const underMin = eligible.filter((p) => p.comparisons < STABILIZATION_MIN);
  if (underMin.length >= 2) {
    const result = pickAnchorAndNeighbor(underMin, STABILIZATION_DELTA);
    if (result) return result;
  }

  const refined = pickAnchorAndNeighbor(eligible, REFINEMENT_DELTA);
  if (refined) return refined;

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export function decidePosition(a: Pairing, b: Pairing): [Pairing, Pairing] {
  const aImbalance = a.leftShown - a.rightShown;
  const bImbalance = b.leftShown - b.rightShown;
  if (aImbalance < bImbalance) return [a, b];
  if (bImbalance < aImbalance) return [b, a];
  return Math.random() < 0.5 ? [a, b] : [b, a];
}
