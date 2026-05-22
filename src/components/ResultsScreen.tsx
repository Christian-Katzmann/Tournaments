import { useMemo, useState } from 'react';
import type { Methodology, Pairing, TournamentDoc, TournamentRuntimeState } from '../hooks/useTournament';
import { confidenceInterval } from '../lib/elo';
import { STABILITY_LABELS, stabilityFor, votesToNextTier } from '../lib/stability';
import type { CandidateBase, KindId } from '../lib/kinds/types';
import { getKind } from '../lib/kinds/registry';

interface Props {
  doc: TournamentDoc;
  state: TournamentRuntimeState;
  onResume: () => void;
  onShowWelcome: () => void;
}

interface RankedRow {
  pairing: Pairing;
  candidate: CandidateBase | null;
  label: string;
  ci: number;
  tier: ReturnType<typeof stabilityFor>;
}

function summarize(kind: KindId, candidate: CandidateBase): string {
  try {
    return getKind(kind).summarize(candidate);
  } catch {
    return candidate.label ?? candidate.id;
  }
}

const METHODOLOGY_LABEL: Record<Methodology, string> = {
  'elo-pairwise': 'Elo · pairwise',
  'bradley-terry': 'Bradley–Terry',
  'bracket-4-seed': 'Bracket · 4 seeds',
  'best-of-n': 'Best of N',
  'multi-axis': 'Multi-axis',
  slider: 'Slider rating',
};

export function ResultsScreen({ doc, state, onResume, onShowWelcome }: Props) {
  const [copied, setCopied] = useState(false);

  const ranked = useMemo<RankedRow[]>(() => {
    const candidates = new Map<string, CandidateBase>();
    for (const c of doc.candidates) candidates.set(c.id, c);
    const rows: RankedRow[] = state.pairings.map((p) => {
      const candidate = candidates.get(p.id) ?? null;
      return {
        pairing: p,
        candidate,
        label: candidate ? summarize(doc.kind, candidate) : p.id,
        ci: confidenceInterval(p.comparisons),
        tier: stabilityFor(p.comparisons),
      };
    });
    rows.sort((a, b) => b.pairing.elo - a.pairing.elo);
    return rows;
  }, [doc, state]);

  const meaningful = state.history.filter((h) => h.choice !== 'skip').length;
  const skipped = state.history.length - meaningful;
  const totalComparisons = state.pairings.reduce((sum, p) => sum + p.comparisons, 0);
  const avgComparisons = state.pairings.length > 0 ? totalComparisons / state.pairings.length : 0;
  const minComparisons = state.pairings.reduce(
    (min, p) => Math.min(min, p.comparisons),
    state.pairings.length > 0 ? Infinity : 0,
  );

  const overallTier = Number.isFinite(minComparisons) ? stabilityFor(minComparisons) : 'directional';
  const votesToNext = Number.isFinite(minComparisons) ? votesToNextTier(minComparisons) : null;

  const lowDataPairings = ranked.filter((r) => r.pairing.comparisons < 3).length;
  const top3 = ranked.slice(0, Math.min(3, ranked.length));
  const obviousLosers = [...ranked].reverse().slice(0, Math.min(3, ranked.length));

  const methodologyLabel = METHODOLOGY_LABEL[doc.methodology] ?? doc.methodology;
  const kindLabel = (() => {
    try {
      return getKind(doc.kind).displayName;
    } catch {
      return doc.kind;
    }
  })();

  const summary = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# ${doc.title} — Results`);
    lines.push('');
    lines.push(`Kind: ${kindLabel} · Methodology: ${methodologyLabel}`);
    lines.push(`Comparisons: ${meaningful} ranked, ${skipped} skipped`);
    lines.push(`Average comparisons per candidate: ${avgComparisons.toFixed(1)}`);
    lines.push(`Stability tier (overall): ${STABILITY_LABELS[overallTier]}`);
    if (votesToNext !== null) {
      lines.push(`Votes until next tier: ${votesToNext}`);
    }
    if (doc.createdAt) lines.push(`Started: ${doc.createdAt}`);
    if (doc.lastActiveAt) lines.push(`Last active: ${doc.lastActiveAt}`);
    lines.push('');
    lines.push('## Top candidates');
    top3.forEach((row, i) => {
      lines.push(
        `${i + 1}. ${row.label} — Elo ${Math.round(row.pairing.elo)} ±${row.ci} (n=${row.pairing.comparisons}, wins=${row.pairing.wins}, ${STABILITY_LABELS[row.tier]})`,
      );
    });
    lines.push('');
    lines.push('## Full ranking');
    ranked.forEach((row, i) => {
      lines.push(
        `${i + 1}. ${row.label} — Elo ${Math.round(row.pairing.elo)} (n=${row.pairing.comparisons}, ${STABILITY_LABELS[row.tier]})`,
      );
    });
    lines.push('');
    lines.push('## Obvious losers');
    obviousLosers.forEach((row) => {
      lines.push(`- ${row.label} — Elo ${Math.round(row.pairing.elo)} (n=${row.pairing.comparisons})`);
    });
    if (lowDataPairings > 0) {
      lines.push('');
      lines.push(`Note: ${lowDataPairings} candidates have <3 comparisons (low confidence).`);
    }
    return lines.join('\n');
  }, [
    doc,
    kindLabel,
    methodologyLabel,
    meaningful,
    skipped,
    avgComparisons,
    overallTier,
    votesToNext,
    ranked,
    top3,
    obviousLosers,
    lowDataPairings,
  ]);

  function copy() {
    navigator.clipboard.writeText(summary).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div
          style={{ color: 'var(--text-faint)' }}
          className="text-[11px] uppercase tracking-widest mb-3"
        >
          {kindLabel} · {methodologyLabel}
        </div>
        <div className="flex items-center justify-between mb-10 flex-wrap gap-3">
          <h1
            style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
            className="text-2xl font-medium"
          >
            {doc.title} — Results
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onResume}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              className="text-xs border px-3 py-1.5 hover:bg-[var(--bg-card)] transition-colors"
            >
              Continue tournament
            </button>
            <button
              onClick={onShowWelcome}
              style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}
              className="text-xs border px-3 py-1.5 hover:bg-[var(--bg-card)] transition-colors"
            >
              Back to welcome
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <StabilityBadge tier={overallTier} />
          <div style={{ color: 'var(--text-muted)' }} className="text-xs tabular-nums">
            {meaningful} ranked · {skipped} skipped · avg {avgComparisons.toFixed(1)}/candidate
            {lowDataPairings > 0 && (
              <span style={{ color: 'var(--text-faint)' }}>
                {' '}
                · {lowDataPairings} with low data (n&lt;3)
              </span>
            )}
            {votesToNext !== null && (
              <span style={{ color: 'var(--text-faint)' }}>
                {' '}
                · {votesToNext} more votes for {nextTierLabel(overallTier)}
              </span>
            )}
          </div>
        </div>

        {overallTier === 'directional' && (
          <p
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
            className="text-sm leading-relaxed border-l-2 pl-4 mb-10"
          >
            Rankings below are <em>directional</em> — there isn't enough data yet for the ordering to
            be trusted. Keep judging until each candidate has at least 50 comparisons.
          </p>
        )}

        <Section title="Top candidates">
          <ol className="space-y-6">
            {top3.map((row, i) => (
              <li
                key={row.pairing.id}
                style={{ borderColor: 'var(--border)' }}
                className="border-t pt-6"
              >
                <div className="flex items-baseline justify-between mb-2 gap-3">
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span
                      style={{ color: 'var(--text-faint)' }}
                      className="text-sm tabular-nums shrink-0"
                    >
                      #{i + 1}
                    </span>
                    <span style={{ color: 'var(--text)' }} className="text-sm font-medium truncate">
                      {row.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StabilityBadge tier={row.tier} compact />
                    <span
                      style={{ color: 'var(--text-muted)' }}
                      className="text-xs tabular-nums"
                    >
                      Elo {Math.round(row.pairing.elo)} ±{row.ci} · n={row.pairing.comparisons}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Full ranking">
          <RankedList rows={ranked} />
        </Section>

        <Section title="Obvious losers">
          <ol className="space-y-2">
            {obviousLosers.map((row) => (
              <li key={row.pairing.id} className="flex items-baseline justify-between text-sm gap-3">
                <span style={{ color: 'var(--text-muted)' }} className="truncate">
                  {row.label}
                </span>
                <span
                  style={{ color: 'var(--text-faint)' }}
                  className="text-xs tabular-nums shrink-0"
                >
                  Elo {Math.round(row.pairing.elo)} · n={row.pairing.comparisons}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Copy-paste summary">
          <div className="space-y-3">
            <pre
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
              className="border p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap"
            >
              {summary}
            </pre>
            <button
              onClick={copy}
              style={{ background: 'var(--accent)', color: 'var(--bg-card)' }}
              className="text-xs px-4 py-2 transition-opacity hover:opacity-90"
            >
              {copied ? 'Copied' : 'Copy to clipboard'}
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2
        style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}
        className="text-[11px] uppercase mb-5"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function RankedList({ rows }: { rows: RankedRow[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.pairing.elo));
  const min = Math.min(...rows.map((r) => r.pairing.elo));
  const range = Math.max(1, max - min);
  return (
    <ol className="space-y-2.5">
      {rows.map((row, i) => {
        const pct = range > 0 ? ((row.pairing.elo - min) / range) * 100 : 50;
        return (
          <li
            key={row.pairing.id}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)_6rem_5.5rem_3rem] gap-3 items-center text-sm"
          >
            <span style={{ color: 'var(--text-faint)' }} className="text-xs tabular-nums">
              #{i + 1}
            </span>
            <span style={{ color: 'var(--text)' }} className="truncate">
              {row.label}
            </span>
            <div style={{ background: 'var(--border)', height: '2px' }} className="w-full">
              <div
                style={{
                  background: 'var(--text)',
                  width: `${pct}%`,
                  height: '2px',
                }}
              />
            </div>
            <span style={{ color: 'var(--text-faint)' }} className="text-xs tabular-nums">
              n={row.pairing.comparisons} · {STABILITY_LABELS[row.tier]}
            </span>
            <span
              style={{ color: 'var(--text-muted)' }}
              className="text-xs tabular-nums text-right"
            >
              {Math.round(row.pairing.elo)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StabilityBadge({
  tier,
  compact = false,
}: {
  tier: ReturnType<typeof stabilityFor>;
  compact?: boolean;
}) {
  const palette: Record<typeof tier, { bg: string; fg: string }> = {
    directional: { bg: 'var(--bg-card)', fg: 'var(--text-faint)' },
    preliminary: { bg: 'var(--bg-card)', fg: 'var(--text-muted)' },
    stable: { bg: 'var(--accent)', fg: 'var(--bg-card)' },
  };
  const { bg, fg } = palette[tier];
  return (
    <span
      style={{ background: bg, color: fg, borderColor: 'var(--border)' }}
      className={`text-[10px] uppercase tracking-widest border ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'}`}
    >
      {STABILITY_LABELS[tier]}
    </span>
  );
}

function nextTierLabel(current: ReturnType<typeof stabilityFor>): string {
  if (current === 'directional') return STABILITY_LABELS.preliminary.toLowerCase();
  if (current === 'preliminary') return STABILITY_LABELS.stable.toLowerCase();
  return '';
}
