import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeEloDeltas, INITIAL_ELO } from '../lib/elo';
import { decidePosition, selectNext, type MatchmakingState } from '../lib/matchmaking';
import type { CandidateBase, KindId } from '../lib/kinds/types';

export type Methodology =
  | 'elo-pairwise'
  | 'bradley-terry'
  | 'bracket-4-seed'
  | 'best-of-n'
  | 'multi-axis'
  | 'slider';

export interface Pairing {
  id: string;
  elo: number;
  comparisons: number;
  wins: number;
  leftShown: number;
  rightShown: number;
}

export interface HistoryEntry {
  round: number;
  timestamp: string;
  leftId: string;
  rightId: string;
  contentIndex: number;
  choice: 'left' | 'right' | 'skip';
  eloDeltaLeft: number;
  eloDeltaRight: number;
  msToDecide: number;
}

export interface TournamentRuntimeState {
  pairings: Pairing[];
  history: HistoryEntry[];
  theme: 'light' | 'dark';
  finished: boolean;
  contentTemplateCount?: number;
}

export interface TournamentDoc {
  id: string;
  slug: string;
  title: string;
  kind: KindId;
  methodology: Methodology;
  candidates: CandidateBase[];
  config?: Record<string, unknown>;
  state?: Partial<TournamentRuntimeState> & Record<string, unknown>;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface CurrentRound {
  leftCandidate: CandidateBase;
  rightCandidate: CandidateBase;
  leftPairing: Pairing;
  rightPairing: Pairing;
  contentIndex: number;
  round: number;
  roundStartedAt: number;
}

export type TournamentStatus = 'loading' | 'ready' | 'error';

const PERSIST_DEBOUNCE_MS = 200;

const TYPOGRAPHY_CONTENT_COUNT = 6;

function inferContentCount(doc: TournamentDoc): number {
  if (doc.kind === 'typography') return TYPOGRAPHY_CONTENT_COUNT;
  return 1;
}

function reconcilePairings(
  candidates: CandidateBase[],
  persisted: Partial<Pairing>[] | undefined,
): Pairing[] {
  const byId = new Map<string, Partial<Pairing>>();
  for (const p of persisted ?? []) {
    if (p && typeof p.id === 'string') byId.set(p.id, p);
  }
  return candidates.map((c) => {
    const p = byId.get(c.id);
    return {
      id: c.id,
      elo: typeof p?.elo === 'number' ? p.elo : INITIAL_ELO,
      comparisons: typeof p?.comparisons === 'number' ? p.comparisons : 0,
      wins: typeof p?.wins === 'number' ? p.wins : 0,
      leftShown: typeof p?.leftShown === 'number' ? p.leftShown : 0,
      rightShown: typeof p?.rightShown === 'number' ? p.rightShown : 0,
    };
  });
}

function hydrateState(doc: TournamentDoc): TournamentRuntimeState {
  const persisted = doc.state ?? {};
  const pairings = reconcilePairings(doc.candidates, persisted.pairings as Partial<Pairing>[] | undefined);
  const history = Array.isArray(persisted.history) ? (persisted.history as HistoryEntry[]) : [];
  const theme = persisted.theme === 'dark' ? 'dark' : 'light';
  const finished = persisted.finished === true;
  return {
    pairings,
    history,
    theme,
    finished,
    contentTemplateCount: inferContentCount(doc),
  };
}

function matchmakingState(state: TournamentRuntimeState): MatchmakingState {
  return {
    pairings: state.pairings,
    history: state.history.map((h) => ({ leftId: h.leftId, rightId: h.rightId })),
  };
}

export function useTournament(tournamentId: string | null) {
  const [doc, setDoc] = useState<TournamentDoc | null>(null);
  const [state, setState] = useState<TournamentRuntimeState | null>(null);
  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null);
  const [status, setStatus] = useState<TournamentStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const candidatesById = useMemo(() => {
    const map = new Map<string, CandidateBase>();
    for (const c of doc?.candidates ?? []) map.set(c.id, c);
    return map;
  }, [doc]);

  const roundStartRef = useRef<number>(0);
  const debounceRef = useRef<number | null>(null);
  const pendingStateRef = useRef<TournamentRuntimeState | null>(null);
  const idRef = useRef<string | null>(tournamentId);
  idRef.current = tournamentId;

  // --- Theme application ----------------------------------------------------
  useEffect(() => {
    if (!state) return;
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state?.theme]);

  // --- Initial load ---------------------------------------------------------
  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    setStatus('loading');
    setError(null);

    (async () => {
      try {
        const response = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: { message: response.statusText } }));
          throw new Error(body?.error?.message ?? `Failed to load tournament: ${response.status}`);
        }
        const payload = (await response.json()) as { tournament: TournamentDoc };
        if (cancelled) return;
        const nextDoc = payload.tournament;
        const nextState = hydrateState(nextDoc);
        setDoc(nextDoc);
        setState(nextState);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  // --- Persistence (debounced) ---------------------------------------------
  const flushPersist = useCallback(async () => {
    const pending = pendingStateRef.current;
    const id = idRef.current;
    if (!pending || !id) return;
    pendingStateRef.current = null;
    try {
      await fetch(`/api/tournament/${encodeURIComponent(id)}/state`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: pending }),
      });
    } catch (err) {
      // Persistence is best-effort; the UI keeps working. Surface for debug.
      console.warn('Tournaments: failed to persist state', err);
    }
  }, []);

  const schedulePersist = useCallback(
    (next: TournamentRuntimeState) => {
      pendingStateRef.current = next;
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        void flushPersist();
      }, PERSIST_DEBOUNCE_MS);
    },
    [flushPersist],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      void flushPersist();
    };
  }, [flushPersist]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const pending = pendingStateRef.current;
      const id = idRef.current;
      if (!pending || !id) return;
      try {
        const body = JSON.stringify({ state: pending });
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(`/api/tournament/${encodeURIComponent(id)}/state`, blob);
        }
      } catch {
        // best-effort
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // --- Round selection ------------------------------------------------------
  const setNextRound = useCallback(
    (next: TournamentRuntimeState, currentDoc: TournamentDoc) => {
      if (next.pairings.length < 2) {
        setCurrentRound(null);
        return;
      }
      const [a, b] = selectNext(matchmakingState(next));
      const [leftRef, rightRef] = decidePosition(a, b);
      // The matchmaking functions return the same Pairing objects we passed in,
      // which carry our extra fields (wins). The wider type is just structural.
      const left = leftRef as Pairing;
      const right = rightRef as Pairing;
      const leftCandidate = currentDoc.candidates.find((c) => c.id === left.id);
      const rightCandidate = currentDoc.candidates.find((c) => c.id === right.id);
      if (!leftCandidate || !rightCandidate) {
        setCurrentRound(null);
        return;
      }
      const contentCount = next.contentTemplateCount ?? 1;
      const contentIndex = contentCount > 0 ? next.history.length % contentCount : 0;
      roundStartRef.current = Date.now();
      setCurrentRound({
        leftCandidate,
        rightCandidate,
        leftPairing: left,
        rightPairing: right,
        contentIndex,
        round: next.history.length + 1,
        roundStartedAt: roundStartRef.current,
      });
    },
    [],
  );

  const beginRound = useCallback(() => {
    if (!state || !doc) return;
    setNextRound(state, doc);
  }, [state, doc, setNextRound]);

  // --- Mutations ------------------------------------------------------------
  const applyState = useCallback(
    (next: TournamentRuntimeState) => {
      setState(next);
      schedulePersist(next);
    },
    [schedulePersist],
  );

  const recordChoice = useCallback(
    (choice: 'left' | 'right' | 'skip') => {
      if (!state || !currentRound || !doc) return;
      const now = Date.now();
      const msToDecide = now - currentRound.roundStartedAt;

      let deltaLeft = 0;
      let deltaRight = 0;
      if (choice !== 'skip') {
        const deltas = computeEloDeltas(currentRound.leftPairing, currentRound.rightPairing, choice);
        deltaLeft = deltas.deltaLeft;
        deltaRight = deltas.deltaRight;
      }

      const entry: HistoryEntry = {
        round: currentRound.round,
        timestamp: new Date(now).toISOString(),
        leftId: currentRound.leftPairing.id,
        rightId: currentRound.rightPairing.id,
        contentIndex: currentRound.contentIndex,
        choice,
        eloDeltaLeft: deltaLeft,
        eloDeltaRight: deltaRight,
        msToDecide,
      };

      const newPairings = state.pairings.map((p) => {
        if (p.id === currentRound.leftPairing.id) {
          return {
            ...p,
            elo: p.elo + deltaLeft,
            comparisons: p.comparisons + (choice === 'skip' ? 0 : 1),
            wins: p.wins + (choice === 'left' ? 1 : 0),
            leftShown: p.leftShown + 1,
          };
        }
        if (p.id === currentRound.rightPairing.id) {
          return {
            ...p,
            elo: p.elo + deltaRight,
            comparisons: p.comparisons + (choice === 'skip' ? 0 : 1),
            wins: p.wins + (choice === 'right' ? 1 : 0),
            rightShown: p.rightShown + 1,
          };
        }
        return p;
      });

      const next: TournamentRuntimeState = {
        ...state,
        pairings: newPairings,
        history: [...state.history, entry],
      };
      applyState(next);
      setNextRound(next, doc);
    },
    [state, currentRound, doc, applyState, setNextRound],
  );

  const undo = useCallback(() => {
    if (!state || !doc || state.history.length === 0) return;
    const last = state.history[state.history.length - 1];
    const newPairings = state.pairings.map((p) => {
      if (p.id === last.leftId) {
        return {
          ...p,
          elo: p.elo - last.eloDeltaLeft,
          comparisons: p.comparisons - (last.choice === 'skip' ? 0 : 1),
          wins: p.wins - (last.choice === 'left' ? 1 : 0),
          leftShown: Math.max(0, p.leftShown - 1),
        };
      }
      if (p.id === last.rightId) {
        return {
          ...p,
          elo: p.elo - last.eloDeltaRight,
          comparisons: p.comparisons - (last.choice === 'skip' ? 0 : 1),
          wins: p.wins - (last.choice === 'right' ? 1 : 0),
          rightShown: Math.max(0, p.rightShown - 1),
        };
      }
      return p;
    });
    const next: TournamentRuntimeState = {
      ...state,
      pairings: newPairings,
      history: state.history.slice(0, -1),
    };
    applyState(next);

    const leftPairing = newPairings.find((p) => p.id === last.leftId);
    const rightPairing = newPairings.find((p) => p.id === last.rightId);
    const leftCandidate = candidatesById.get(last.leftId);
    const rightCandidate = candidatesById.get(last.rightId);
    if (leftPairing && rightPairing && leftCandidate && rightCandidate) {
      roundStartRef.current = Date.now();
      setCurrentRound({
        leftPairing,
        rightPairing,
        leftCandidate,
        rightCandidate,
        contentIndex: last.contentIndex,
        round: last.round,
        roundStartedAt: roundStartRef.current,
      });
    } else {
      setNextRound(next, doc);
    }
  }, [state, doc, applyState, candidatesById, setNextRound]);

  const toggleTheme = useCallback(() => {
    if (!state) return;
    const next: TournamentRuntimeState = {
      ...state,
      theme: state.theme === 'light' ? 'dark' : 'light',
    };
    applyState(next);
  }, [state, applyState]);

  // --- Fatigue --------------------------------------------------------------
  const fatigue = useMemo<'normal' | 'fast' | 'slow'>(() => {
    if (!state || state.history.length < 10) return 'normal';
    const last10 = state.history.slice(-10);
    const avgMs = last10.reduce((sum, h) => sum + h.msToDecide, 0) / last10.length;
    if (avgMs < 2000) return 'fast';
    if (avgMs > 25000) return 'slow';
    return 'normal';
  }, [state]);

  return {
    status,
    error,
    doc,
    state,
    currentRound,
    beginRound,
    recordChoice,
    undo,
    toggleTheme,
    fatigue,
  };
}
