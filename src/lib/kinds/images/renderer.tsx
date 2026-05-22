import type { CandidateBase, KindRendererProps } from '../types';

export interface ImagesCandidate extends CandidateBase {
  src: string;
  alt?: string;
}

export interface ImagesContext {
  aspectRatio?: string;
  showLabel?: boolean;
}

export function ImagesRenderer({ candidate, context }: KindRendererProps<ImagesCandidate, ImagesContext>) {
  const aspectRatio = context?.aspectRatio ?? '4 / 3';
  const showLabel = context?.showLabel ?? true;

  return (
    <div className="w-full max-w-[520px]">
      <div
        className="w-full overflow-hidden rounded-md"
        style={{
          aspectRatio,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
        }}
      >
        <img
          src={candidate.src}
          alt={candidate.alt ?? candidate.label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          loading="lazy"
        />
      </div>
      {showLabel ? (
        <div
          style={{
            fontFamily: 'var(--font-system)',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
          }}
          className="mt-3"
        >
          {candidate.label}
        </div>
      ) : null}
    </div>
  );
}
