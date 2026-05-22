import type { RegistryEntry } from './HomeScreen';
import { isInternalNavClick, useNavigate } from '../lib/router';

interface Props {
  entry: RegistryEntry;
}

const METHODOLOGY_LABEL: Record<string, string> = {
  'elo-pairwise': 'elo · pairwise',
  'bradley-terry': 'bradley-terry',
  'bracket-4-seed': 'bracket · 4 seeds',
  'best-of-n': 'best of n',
  'multi-axis': 'multi-axis',
  slider: 'slider',
};

const KIND_LABEL: Record<string, string> = {
  typography: 'typography',
  color: 'color',
  copy: 'copy',
  images: 'images',
  code: 'code',
  markdown: 'markdown',
  'ai-output': 'ai output',
  freeform: 'freeform',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

function progressLabel(entry: RegistryEntry): string {
  const { methodology, progress } = entry;
  if (!methodology || !progress) return '—';
  const { comparisons, pairings } = progress;

  if (methodology === 'elo-pairwise' || methodology === 'bradley-terry') {
    if (pairings && pairings > 0) {
      const total = pairings * 3; // mirrors server default of 3 per pair
      return `${comparisons} of ~${total} comparisons`;
    }
    return `${comparisons} comparisons`;
  }
  if (methodology === 'bracket-4-seed') {
    return `${comparisons} of 3 matches`;
  }
  if (methodology === 'best-of-n') {
    if (pairings && pairings > 0) return `${comparisons} of ${pairings} rounds`;
    return `${comparisons} rounds`;
  }
  if (methodology === 'multi-axis' || methodology === 'slider') {
    return `${comparisons} ratings`;
  }
  return `${comparisons} done`;
}

export function TournamentListItem({ entry }: Props) {
  const navigate = useNavigate();
  const href = `/t/${encodeURIComponent(entry.id)}`;
  const kindText = entry.kind ? (KIND_LABEL[entry.kind] ?? entry.kind) : 'unknown kind';
  const methodologyText = entry.methodology
    ? (METHODOLOGY_LABEL[entry.methodology] ?? entry.methodology)
    : '';
  const relative = formatRelative(entry.lastActiveAt ?? entry.createdAt);
  const percent = entry.progress?.percent;

  return (
    <a
      href={href}
      onClick={(e) => {
        if (isInternalNavClick(e, href)) {
          e.preventDefault();
          navigate(href);
        }
      }}
      style={{ borderColor: 'var(--border)' }}
      className="group block border-b last:border-b-0 px-5 py-4 hover:bg-[var(--bg-card)] transition-colors"
    >
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              style={{ color: entry.missing ? 'var(--text-faint)' : 'var(--text)' }}
              className="text-[15px] font-medium truncate"
            >
              {entry.title}
            </span>
            {entry.missing && (
              <span
                style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}
                className="text-[10px] uppercase tracking-widest border px-1.5 py-0.5"
              >
                file missing
              </span>
            )}
          </div>
          <div
            style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}
            className="text-[11px] uppercase mt-1.5"
          >
            {kindText}
            {methodologyText && (
              <>
                <span className="mx-2">·</span>
                {methodologyText}
              </>
            )}
            {relative && (
              <>
                <span className="mx-2">·</span>
                <span style={{ textTransform: 'none', letterSpacing: 0 }}>{relative}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div style={{ color: 'var(--text-muted)' }} className="text-xs tabular-nums">
            {progressLabel(entry)}
          </div>
          {typeof percent === 'number' && (
            <div
              style={{ background: 'var(--border)', height: '2px' }}
              className="w-24 mt-2 ml-auto"
              aria-hidden
            >
              <div
                style={{
                  background: 'var(--text)',
                  width: `${Math.round(Math.min(1, Math.max(0, percent)) * 100)}%`,
                  height: '2px',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
