import type { CandidateBase, KindRendererProps } from '../types';
import { getFont } from './fonts';
import { CONTENT, type ContentTemplate, getContent } from './content';

export interface TypographyCandidate extends CandidateBase {
  serif: string;
  sans: string;
}

export interface TypographyContext {
  content?: ContentTemplate;
  contentIndex?: number;
}

export function TypographyRenderer({
  candidate,
  context,
}: KindRendererProps<TypographyCandidate, TypographyContext>) {
  const serif = getFont(candidate.serif);
  const sans = getFont(candidate.sans);
  const content = context?.content ?? getContent(context?.contentIndex ?? 0);

  return (
    <div className="text-left w-full max-w-[660px]">
      <div
        style={{
          fontFamily: sans.family,
          color: 'var(--text-muted)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          fontSize: '12px',
        }}
        className="uppercase mb-8"
      >
        {content.label}
      </div>

      <div
        style={{
          fontFamily: serif.family,
          color: 'var(--text)',
          fontWeight: 500,
          fontSize: '64px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum" 1',
          letterSpacing: '-0.02em',
        }}
        className="mb-8"
      >
        {content.hero}
      </div>

      <h2
        style={{
          fontFamily: serif.family,
          color: 'var(--text)',
          fontWeight: 500,
          fontSize: '30px',
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
        }}
        className="mb-6"
      >
        {content.headline}
      </h2>

      <p
        style={{
          fontFamily: sans.family,
          color: 'var(--text)',
          fontSize: '16px',
          lineHeight: 1.55,
          fontWeight: 400,
        }}
        className="mb-8"
      >
        {content.body}
      </p>

      <div
        style={{
          fontFamily: sans.family,
          color: 'var(--text-faint)',
          fontSize: '12px',
          fontWeight: 400,
        }}
      >
        {content.attribution}
      </div>
    </div>
  );
}

export const TYPOGRAPHY_CONTENT_TEMPLATES = CONTENT;
