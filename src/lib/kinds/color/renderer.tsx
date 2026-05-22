import type { CandidateBase, KindRendererProps } from '../types';

export interface ColorCandidate extends CandidateBase {
  hex: string;
  name?: string;
}

function normalizeHex(hex: string): string {
  const stripped = hex.replace(/^#/, '');
  if (stripped.length === 3) {
    return stripped
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (stripped.length === 8) return stripped.slice(0, 6);
  return stripped;
}

function relativeLuminance(hex: string): number {
  const h = normalizeHex(hex);
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toLin = (c: number): number => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function pickReadableTextColor(hex: string): '#000000' | '#ffffff' {
  return relativeLuminance(hex) > 0.45 ? '#000000' : '#ffffff';
}

export function ColorRenderer({ candidate }: KindRendererProps<ColorCandidate>) {
  const ink = pickReadableTextColor(candidate.hex);
  const upperHex = `#${normalizeHex(candidate.hex).toUpperCase()}`;

  return (
    <div className="w-full max-w-[420px]">
      <div
        className="w-full aspect-[4/3] rounded-md flex flex-col justify-between p-6"
        style={{
          background: candidate.hex,
          color: ink,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            opacity: 0.8,
          }}
          className="uppercase"
        >
          Sample text on color
        </div>
        <div
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: '28px',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}
        >
          The quick brown fox jumps over the lazy dog.
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--text)',
          }}
        >
          {candidate.name ?? candidate.label}
        </div>
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            fontSize: '13px',
            color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {upperHex}
        </div>
      </div>
    </div>
  );
}
