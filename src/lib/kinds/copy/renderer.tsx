import type { CandidateBase, KindRendererProps } from '../types';

export interface CopyCandidate extends CandidateBase {
  text: string;
}

export type CopyRole = 'headline' | 'paragraph' | 'cta';

export interface CopyContext {
  role?: CopyRole;
}

const NEUTRAL_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

function detectRole(text: string): CopyRole {
  const trimmed = text.trim();
  if (trimmed.length <= 24 && !/[.!?]$/.test(trimmed)) return 'cta';
  if (trimmed.length <= 90 && trimmed.split(/\s+/).length <= 14) return 'headline';
  return 'paragraph';
}

export function CopyRenderer({ candidate, context }: KindRendererProps<CopyCandidate, CopyContext>) {
  const role: CopyRole = context?.role ?? detectRole(candidate.text);

  const base = {
    fontFamily: NEUTRAL_FONT_STACK,
    color: 'var(--text)',
  } as const;

  let style: React.CSSProperties;
  if (role === 'headline') {
    style = {
      ...base,
      fontSize: '34px',
      lineHeight: 1.15,
      fontWeight: 500,
      letterSpacing: '-0.015em',
    };
  } else if (role === 'cta') {
    style = {
      ...base,
      fontSize: '17px',
      lineHeight: 1.2,
      fontWeight: 600,
      letterSpacing: '-0.005em',
    };
  } else {
    style = {
      ...base,
      fontSize: '16px',
      lineHeight: 1.55,
      fontWeight: 400,
    };
  }

  return (
    <div className="w-full max-w-[560px]">
      <div
        style={{
          fontFamily: NEUTRAL_FONT_STACK,
          color: 'var(--text-muted)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          fontSize: '11px',
        }}
        className="uppercase mb-6"
      >
        {role}
      </div>

      {role === 'cta' ? (
        <span
          style={{
            ...style,
            display: 'inline-block',
            borderRadius: '8px',
            padding: '12px 18px',
            background: 'var(--text)',
            color: 'var(--bg)',
          }}
        >
          {candidate.text}
        </span>
      ) : (
        <div style={style}>{candidate.text}</div>
      )}
    </div>
  );
}
