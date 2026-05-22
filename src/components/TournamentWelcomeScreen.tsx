import type { Methodology, TournamentDoc, TournamentRuntimeState } from '../hooks/useTournament';
import { getKind } from '../lib/kinds/registry';

interface Props {
  doc: TournamentDoc;
  state: TournamentRuntimeState;
  onBegin: () => void;
  onShowResults: () => void;
}

const METHODOLOGY_LABELS: Record<Methodology, string> = {
  'elo-pairwise': 'Elo · pairwise',
  'bradley-terry': 'Bradley–Terry',
  'bracket-4-seed': 'Bracket · 4 seeds',
  'best-of-n': 'Best of N',
  'multi-axis': 'Multi-axis',
  slider: 'Slider rating',
};

const METHODOLOGY_GUIDANCE: Record<Methodology, string> = {
  'elo-pairwise': 'Judge the pairing as a whole — pick the one that works better. Repeat until rankings stabilize.',
  'bradley-terry':
    'Pick a winner each round. The Bradley–Terry model turns your decisions into a probabilistic ranking.',
  'bracket-4-seed':
    'Four candidates, three matches: two semifinals and a final. Only the winners advance.',
  'best-of-n':
    'Each round shows a small group. Pick the one that stands out. Best for a quick read on a short list.',
  'multi-axis':
    'For each axis, choose the candidate that performs best on that criterion. Different axes can have different winners.',
  slider: 'Rate each candidate on a continuous scale. Decisions accumulate into a per-candidate average.',
};

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TournamentWelcomeScreen({ doc, state, onBegin, onShowResults }: Props) {
  const kindLabel = (() => {
    try {
      return getKind(doc.kind).displayName;
    } catch {
      return doc.kind;
    }
  })();
  const methodologyLabel = METHODOLOGY_LABELS[doc.methodology] ?? doc.methodology;
  const guidance = METHODOLOGY_GUIDANCE[doc.methodology] ?? '';

  const completed = state.history.length;
  const hasProgress = completed > 0;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl w-full">
        <div
          style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}
          className="text-[11px] uppercase mb-6"
        >
          {kindLabel} · {methodologyLabel}
        </div>
        <h1
          style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
          className="text-3xl font-medium mb-3"
        >
          {doc.title}
        </h1>
        {guidance && (
          <p style={{ color: 'var(--text-muted)' }} className="text-base leading-relaxed mb-6">
            {guidance}
          </p>
        )}
        <p style={{ color: 'var(--text-muted)' }} className="text-base leading-relaxed mb-10">
          {doc.candidates.length} candidates. Resumable across browser closes and restarts. Your
          decisions are saved to disk on every choice.
        </p>

        <div className="space-y-3 mb-12">
          <button
            onClick={onBegin}
            style={{ background: 'var(--accent)', color: 'var(--bg-card)' }}
            className="w-full py-3 px-4 text-sm font-medium transition-opacity hover:opacity-90"
          >
            {hasProgress ? `Resume — ${completed} comparisons done` : 'Begin'}
          </button>
          {hasProgress && (
            <button
              onClick={onShowResults}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              className="w-full py-3 px-4 text-sm border transition-colors hover:bg-[var(--bg-card)]"
            >
              See current standings
            </button>
          )}
          {(doc.createdAt || doc.lastActiveAt) && (
            <div style={{ color: 'var(--text-faint)' }} className="text-xs pt-2">
              {doc.createdAt && <>Started {formatDate(doc.createdAt)}</>}
              {doc.createdAt && doc.lastActiveAt && ' · '}
              {doc.lastActiveAt && <>Last active {formatDate(doc.lastActiveAt)}</>}
            </div>
          )}
        </div>

        <div
          style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}
          className="text-xs leading-relaxed border-t pt-6 space-y-2"
        >
          <div>
            Keyboard: <span style={{ color: 'var(--text-muted)' }}>← →</span> choose ·
            <span style={{ color: 'var(--text-muted)' }}> 1 / 2</span> hold to isolate one card ·
            <span style={{ color: 'var(--text-muted)' }}> S</span> skip ·
            <span style={{ color: 'var(--text-muted)' }}> U</span> undo ·
            <span style={{ color: 'var(--text-muted)' }}> R</span> results ·
            <span style={{ color: 'var(--text-muted)' }}> T</span> theme
          </div>
        </div>
      </div>
    </div>
  );
}
