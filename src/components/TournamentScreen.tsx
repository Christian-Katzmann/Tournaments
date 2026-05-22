import { useEffect, useRef, useState } from 'react';
import { ComparisonCard } from './ComparisonCard';
import { useKeyboard } from '../hooks/useKeyboard';
import type { CurrentRound, TournamentRuntimeState } from '../hooks/useTournament';
import type { CandidateBase, KindId } from '../lib/kinds/types';
import { getKind } from '../lib/kinds/registry';

interface Props {
  kind: KindId;
  title: string;
  round: CurrentRound;
  state: TournamentRuntimeState;
  onChoice: (choice: 'left' | 'right' | 'skip') => void;
  onUndo: () => void;
  onShowResults: () => void;
  onShowWelcome: () => void;
  onToggleTheme: () => void;
  fatigue: 'normal' | 'fast' | 'slow';
}

const REVEAL_DURATION_MS = 1100;

function buildContext(kind: KindId, contentIndex: number): unknown {
  if (kind === 'typography') return { contentIndex };
  return undefined;
}

function summarize(kind: KindId, candidate: CandidateBase): string {
  try {
    return getKind(kind).summarize(candidate);
  } catch {
    return candidate.label ?? candidate.id;
  }
}

export function TournamentScreen({
  kind,
  title,
  round,
  state,
  onChoice,
  onUndo,
  onShowResults,
  onShowWelcome,
  onToggleTheme,
  fatigue,
}: Props) {
  const [reveal, setReveal] = useState<null | {
    side: 'left' | 'right' | 'skip';
    leftLabel: string;
    rightLabel: string;
  }>(null);
  const [isolating, setIsolating] = useState<'left' | 'right' | null>(null);
  const revealTimerRef = useRef<number | null>(null);

  const leftLabel = summarize(kind, round.leftCandidate);
  const rightLabel = summarize(kind, round.rightCandidate);
  const context = buildContext(kind, round.contentIndex);

  function trigger(choice: 'left' | 'right' | 'skip') {
    if (reveal) return;
    setIsolating(null);
    setReveal({ side: choice, leftLabel, rightLabel });
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => {
      onChoice(choice);
      setReveal(null);
    }, REVEAL_DURATION_MS);
  }

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const isolationKey = (k: string): 'left' | 'right' | null => {
      const key = k.toLowerCase();
      if (key === '1') return 'left';
      if (key === '2') return 'right';
      return null;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const side = isolationKey(e.key);
      if (side) {
        e.preventDefault();
        setIsolating(side);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const side = isolationKey(e.key);
      if (side) setIsolating((curr) => (curr === side ? null : curr));
    };
    const onBlur = () => setIsolating(null);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useKeyboard({
    onLeft: () => trigger('left'),
    onRight: () => trigger('right'),
    onSkip: () => trigger('skip'),
    onUndo: () => {
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
      setReveal(null);
      onUndo();
    },
    onResults: onShowResults,
    onTheme: onToggleTheme,
    enabled: true,
  });

  const meaningfulComparisons = state.history.filter((h) => h.choice !== 'skip').length;

  const leftState =
    reveal?.side === 'left'
      ? 'chosen'
      : reveal?.side === 'right'
        ? 'rejected'
        : reveal?.side === 'skip'
          ? 'skipped'
          : 'idle';
  const rightState =
    reveal?.side === 'right'
      ? 'chosen'
      : reveal?.side === 'left'
        ? 'rejected'
        : reveal?.side === 'skip'
          ? 'skipped'
          : 'idle';

  const chromeOpacity = isolating ? 0.18 : 1;
  const leftCardOpacity = isolating === 'right' ? 0 : 1;
  const rightCardOpacity = isolating === 'left' ? 0 : 1;

  const holdProps = (side: 'left' | 'right') => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      setIsolating(side);
    },
    onMouseUp: () => setIsolating(null),
    onMouseLeave: () => setIsolating((curr) => (curr === side ? null : curr)),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      setIsolating(side);
    },
    onTouchEnd: () => setIsolating(null),
    onTouchCancel: () => setIsolating(null),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="w-full py-5 px-6 flex items-center justify-between"
        style={{ opacity: chromeOpacity, transition: 'opacity 150ms' }}
      >
        <button
          onClick={onShowWelcome}
          style={{ color: 'var(--text-faint)' }}
          className="text-[11px] uppercase tracking-widest hover:text-[var(--text-muted)] transition-colors"
        >
          {title}
        </button>
        <div style={{ color: 'var(--text-muted)' }} className="text-xs tabular-nums">
          Round {round.round} · {meaningfulComparisons} ranked
          {fatigue === 'fast' && <span style={{ color: 'var(--text-faint)' }}> · slow down?</span>}
          {fatigue === 'slow' && <span style={{ color: 'var(--text-faint)' }}> · pause?</span>}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-10 items-stretch justify-center w-full max-w-[1400px]">
          <div className="flex flex-col items-center gap-4">
            <div
              style={{
                opacity: leftCardOpacity,
                transition: 'opacity 150ms',
                pointerEvents: isolating === 'right' ? 'none' : 'auto',
              }}
            >
              <ComparisonCard
                kind={kind}
                candidate={round.leftCandidate}
                context={context}
                side="left"
                state={leftState}
                onClick={() => trigger('left')}
                ariaLabel={`Choose left: ${leftLabel}`}
              />
            </div>
            <button
              {...holdProps('left')}
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
                opacity: isolating === 'right' ? 0 : 1,
                transition: 'opacity 150ms',
              }}
              className="text-xs border px-4 py-1.5 select-none hover:bg-[var(--bg-card)] transition-colors"
              aria-label="Hold to view left card alone (or press and hold 1)"
            >
              Hold to isolate · 1
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div
              style={{
                opacity: rightCardOpacity,
                transition: 'opacity 150ms',
                pointerEvents: isolating === 'left' ? 'none' : 'auto',
              }}
            >
              <ComparisonCard
                kind={kind}
                candidate={round.rightCandidate}
                context={context}
                side="right"
                state={rightState}
                onClick={() => trigger('right')}
                ariaLabel={`Choose right: ${rightLabel}`}
              />
            </div>
            <button
              {...holdProps('right')}
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
                opacity: isolating === 'left' ? 0 : 1,
                transition: 'opacity 150ms',
              }}
              className="text-xs border px-4 py-1.5 select-none hover:bg-[var(--bg-card)] transition-colors"
              aria-label="Hold to view right card alone (or press and hold 2)"
            >
              Hold to isolate · 2
            </button>
          </div>
        </div>
      </main>

      <footer
        className="w-full py-5 px-6"
        style={{ opacity: chromeOpacity, transition: 'opacity 150ms' }}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div
            style={{ color: 'var(--text-muted)', minHeight: '20px' }}
            className="text-xs tabular-nums flex items-center gap-4"
          >
            {reveal ? (
              <span>
                <span style={{ color: reveal.side === 'left' ? 'var(--text)' : 'var(--text-faint)' }}>
                  {reveal.leftLabel}
                </span>
                <span style={{ color: 'var(--text-faint)' }}> &nbsp;vs&nbsp; </span>
                <span style={{ color: reveal.side === 'right' ? 'var(--text)' : 'var(--text-faint)' }}>
                  {reveal.rightLabel}
                </span>
                {reveal.side === 'skip' && <span style={{ color: 'var(--text-faint)' }}> (skipped)</span>}
              </span>
            ) : (
              <span style={{ color: 'var(--text-faint)' }}>
                ← → choose · 1 / 2 hold to isolate · S skip · U undo · R results · T theme
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => trigger('skip')}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              className="text-xs border px-3 py-1.5 hover:bg-[var(--bg-card)] transition-colors"
            >
              Skip
            </button>
            <button
              onClick={onUndo}
              disabled={state.history.length === 0}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              className="text-xs border px-3 py-1.5 hover:bg-[var(--bg-card)] transition-colors disabled:opacity-40"
            >
              Undo
            </button>
            <button
              onClick={onToggleTheme}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              className="text-xs border px-3 py-1.5 hover:bg-[var(--bg-card)] transition-colors"
              aria-label="Toggle theme"
            >
              {state.theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <button
              onClick={onShowResults}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              className="text-xs border px-3 py-1.5 hover:bg-[var(--bg-card)] transition-colors"
            >
              Results
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
