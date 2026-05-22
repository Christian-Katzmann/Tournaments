import { KindRenderer } from './KindRenderer';
import type { CandidateBase, KindId } from '../lib/kinds/types';

interface Props {
  kind: KindId;
  candidate: CandidateBase;
  context?: unknown;
  side: 'left' | 'right';
  state: 'idle' | 'chosen' | 'rejected' | 'skipped';
  onClick: () => void;
  ariaLabel?: string;
}

export function ComparisonCard({ kind, candidate, context, side, state, onClick, ariaLabel }: Props) {
  const isChosen = state === 'chosen';
  const isRejected = state === 'rejected';

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? `Choose ${side} candidate`}
      style={{
        background: 'var(--bg-card)',
        borderColor: isChosen ? 'var(--accent)' : 'transparent',
        borderWidth: '1px',
        borderStyle: 'solid',
        opacity: isRejected ? 0.32 : 1,
      }}
      className="text-left w-full max-w-[660px] p-20 transition-[opacity,border-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:ring-[var(--accent)]"
    >
      <KindRenderer kind={kind} candidate={candidate} context={context} />
    </button>
  );
}
