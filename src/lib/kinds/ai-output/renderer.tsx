import type { CandidateBase, KindRendererProps } from '../types';

export interface AiOutputCandidate extends CandidateBase {
  prompt?: string;
  response: string;
  model?: string;
}

export interface AiOutputContext {
  showPrompt?: boolean;
  maxHeight?: string;
}

const MONO_STACK =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export function AiOutputRenderer({
  candidate,
  context,
}: KindRendererProps<AiOutputCandidate, AiOutputContext>) {
  const showPrompt = context?.showPrompt ?? true;
  const maxHeight = context?.maxHeight ?? '440px';

  return (
    <div className="w-full max-w-[680px]">
      {showPrompt && candidate.prompt ? (
        <div className="mb-4">
          <div
            style={{
              fontFamily: 'var(--font-system)',
              color: 'var(--text-faint)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              fontSize: '11px',
            }}
            className="uppercase mb-2"
          >
            prompt{candidate.model ? ` · ${candidate.model}` : ''}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-system)',
              color: 'var(--text-faint)',
              fontSize: '13px',
              lineHeight: 1.5,
              fontStyle: 'italic',
              borderLeft: '2px solid var(--border)',
              padding: '4px 0 4px 12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {candidate.prompt}
          </div>
        </div>
      ) : null}

      <div
        style={{
          fontFamily: 'var(--font-system)',
          color: 'var(--text-muted)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          fontSize: '11px',
        }}
        className="uppercase mb-3"
      >
        response{!showPrompt && candidate.model ? ` · ${candidate.model}` : ''}
      </div>

      <div
        style={{
          fontFamily: MONO_STACK,
          background: 'var(--bg-card)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '16px 18px',
          fontSize: '13.5px',
          lineHeight: 1.6,
          overflow: 'auto',
          maxHeight,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {candidate.response}
      </div>
    </div>
  );
}
