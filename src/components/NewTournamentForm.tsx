import { useMemo, useState } from 'react';
import { isInternalNavClick, useNavigate } from '../lib/router';
import type { KindId } from '../lib/kinds/types';
import { SANS, SERIFS } from '../lib/kinds/typography/fonts';

type MethodologyId =
  | 'elo-pairwise'
  | 'bradley-terry'
  | 'bracket-4-seed'
  | 'best-of-n'
  | 'multi-axis'
  | 'slider';

interface KindOption {
  id: KindId;
  label: string;
  description: string;
}

interface MethodologyOption {
  id: MethodologyId;
  label: string;
  description: string;
}

const KIND_OPTIONS: KindOption[] = [
  { id: 'typography', label: 'Typography', description: 'serif × sans pairings on shared content' },
  { id: 'color', label: 'Color', description: 'swatches with optional names' },
  { id: 'copy', label: 'Copy', description: 'short text variants — headlines, CTAs' },
  { id: 'images', label: 'Images', description: 'logos, mockups, photographs' },
  { id: 'code', label: 'Code', description: 'syntax-highlighted snippets' },
  { id: 'markdown', label: 'Markdown', description: 'rendered prose — plans, strategies' },
  { id: 'ai-output', label: 'AI output', description: 'model responses' },
  { id: 'freeform', label: 'Freeform', description: 'sandboxed raw HTML — escape hatch' },
];

const METHODOLOGY_OPTIONS: MethodologyOption[] = [
  {
    id: 'elo-pairwise',
    label: 'Elo · pairwise',
    description: 'Pool 8+. Pick a winner each round; ratings stabilise.',
  },
  {
    id: 'bradley-terry',
    label: 'Bradley–Terry',
    description: 'Pool 8+. Rigorous probabilistic ranking.',
  },
  {
    id: 'bracket-4-seed',
    label: 'Bracket · 4 seeds',
    description: 'Exactly 4 candidates, 2 semis + final.',
  },
  {
    id: 'best-of-n',
    label: 'Best of N',
    description: 'Small pool (3–6). Pick the best from each round.',
  },
  {
    id: 'multi-axis',
    label: 'Multi-axis',
    description: 'Score on multiple named criteria.',
  },
  {
    id: 'slider',
    label: 'Slider',
    description: 'Continuous rating (e.g. 1–10).',
  },
];

const METHODOLOGY_BY_KIND: Record<KindId, MethodologyId[]> = {
  typography: ['elo-pairwise', 'bradley-terry', 'bracket-4-seed', 'best-of-n', 'multi-axis'],
  color: ['elo-pairwise', 'bradley-terry', 'bracket-4-seed', 'best-of-n', 'slider'],
  copy: ['elo-pairwise', 'bradley-terry', 'bracket-4-seed', 'best-of-n', 'multi-axis'],
  images: ['bracket-4-seed', 'elo-pairwise', 'best-of-n'],
  code: ['elo-pairwise', 'bradley-terry', 'best-of-n', 'multi-axis'],
  markdown: ['elo-pairwise', 'bradley-terry', 'best-of-n', 'multi-axis'],
  'ai-output': ['elo-pairwise', 'bradley-terry', 'best-of-n', 'multi-axis'],
  freeform: ['elo-pairwise', 'bradley-terry', 'best-of-n'],
};

const SCHEMA_VERSION = 1;
const SUBMIT_HINT_BY_KIND: Record<KindId, string> = {
  typography: 'One pair per line, as `Label | serif-id × sans-id`. Example: `Editorial | newsreader × inter`.',
  color: 'One per line, as `Name #hex` or just `#hex`. Hex may be #rgb, #rrggbb, or #rrggbbaa.',
  copy: 'One per line. Each line becomes one candidate (label and text are the same).',
  images: 'Pick image files — each becomes one candidate. The filename is used as the label.',
  code: 'One snippet per *block* separated by a line of three dashes (`---`). First non-blank line of each block is the label.',
  markdown: 'One document per *block* separated by `---`. First non-blank line is the label.',
  'ai-output': 'One response per *block* separated by `---`. First non-blank line is the label.',
  freeform: 'One HTML document per *block* separated by `---`. First non-blank line is the label.',
};

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (base.length > 0) return base;
  return `tournament-${Date.now().toString(36)}`;
}

function uid(prefix = 'c'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

interface ParsedCandidate {
  id: string;
  label: string;
  [key: string]: unknown;
}

interface ParseOk {
  ok: true;
  candidates: ParsedCandidate[];
}
interface ParseErr {
  ok: false;
  message: string;
}
type ParseResult = ParseOk | ParseErr;

function splitBlocks(input: string): string[] {
  return input
    .split(/^\s*---\s*$/m)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function firstNonBlankLine(text: string): string {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function parseTypography(input: string): ParseResult {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, message: 'Add at least one pair.' };
  const serifIds = new Set(SERIFS.map((f) => f.id));
  const sansIds = new Set(SANS.map((f) => f.id));
  const candidates: ParsedCandidate[] = [];
  for (const [i, line] of lines.entries()) {
    const labelMatch = line.match(/^(?<label>[^|]+)\|\s*(?<rest>.+)$/);
    if (!labelMatch?.groups) {
      return {
        ok: false,
        message: `Line ${i + 1}: expected "Label | serif-id × sans-id".`,
      };
    }
    const pairMatch = labelMatch.groups.rest.match(/^(?<serif>[\w-]+)\s*[×x*]\s*(?<sans>[\w-]+)$/i);
    if (!pairMatch?.groups) {
      return {
        ok: false,
        message: `Line ${i + 1}: expected "serif-id × sans-id" after the pipe.`,
      };
    }
    const label = labelMatch.groups.label.trim();
    const serif = pairMatch.groups.serif.trim();
    const sans = pairMatch.groups.sans.trim();
    if (!serifIds.has(serif)) {
      return {
        ok: false,
        message: `Line ${i + 1}: unknown serif "${serif}". Known: ${[...serifIds].join(', ')}.`,
      };
    }
    if (!sansIds.has(sans)) {
      return {
        ok: false,
        message: `Line ${i + 1}: unknown sans "${sans}". Known: ${[...sansIds].join(', ')}.`,
      };
    }
    candidates.push({ id: uid('p'), label, serif, sans });
  }
  return { ok: true, candidates };
}

function parseColor(input: string): ParseResult {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, message: 'Add at least one color.' };
  const candidates: ParsedCandidate[] = [];
  const hexRe = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})/;
  for (const [i, line] of lines.entries()) {
    const hexMatch = line.match(hexRe);
    if (!hexMatch) {
      return { ok: false, message: `Line ${i + 1}: missing hex color (e.g. #ff0044).` };
    }
    const hex = hexMatch[0];
    const namePart = line.replace(hex, '').trim().replace(/^[-:|·]+/, '').trim();
    const label = namePart || hex;
    const candidate: ParsedCandidate = { id: uid('c'), label, hex };
    if (namePart) candidate.name = namePart;
    candidates.push(candidate);
  }
  return { ok: true, candidates };
}

function parseCopy(input: string): ParseResult {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, message: 'Add at least one line of copy.' };
  return {
    ok: true,
    candidates: lines.map((line) => ({ id: uid('c'), label: line, text: line })),
  };
}

function parseBlockKind(
  input: string,
  field: 'code' | 'markdown' | 'response' | 'html',
  language?: string,
): ParseResult {
  const blocks = splitBlocks(input);
  if (blocks.length === 0) return { ok: false, message: 'Add at least one block (separated by `---`).' };
  const candidates: ParsedCandidate[] = blocks.map((block, i) => {
    const label = firstNonBlankLine(block) || `Candidate ${i + 1}`;
    const candidate: ParsedCandidate = { id: uid('c'), label, [field]: block };
    if (language) candidate.language = language;
    return candidate;
  });
  return { ok: true, candidates };
}

async function readFilesAsDataUrls(files: FileList): Promise<ParsedCandidate[]> {
  const tasks = Array.from(files).map(
    (file) =>
      new Promise<ParsedCandidate>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
        reader.onload = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          resolve({
            id: uid('img'),
            label: file.name.replace(/\.[^.]+$/, '') || file.name,
            src: dataUrl,
            alt: file.name,
          });
        };
        reader.readAsDataURL(file);
      }),
  );
  return Promise.all(tasks);
}

function defaultConfig(methodology: MethodologyId): Record<string, unknown> {
  switch (methodology) {
    case 'elo-pairwise':
      return {
        kFactors: { early: 40, mid: 24, late: 16 },
        minComparisonsPerPair: 3,
      };
    case 'bradley-terry':
      return { maxIterations: 200, convergenceTolerance: 1e-6 };
    case 'bracket-4-seed':
      return { seeding: 'shuffled' };
    case 'best-of-n':
      return { roundSize: 4 };
    case 'multi-axis':
      return { axes: [{ id: 'overall', label: 'Overall' }] };
    case 'slider':
      return { min: 1, max: 10, step: 1 };
  }
}

export function NewTournamentForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<KindId>('copy');
  const [methodology, setMethodology] = useState<MethodologyId>('elo-pairwise');
  const [candidatesText, setCandidatesText] = useState('');
  const [imageCandidates, setImageCandidates] = useState<ParsedCandidate[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedMethodologies = useMemo(() => {
    const allowed = new Set(METHODOLOGY_BY_KIND[kind]);
    return METHODOLOGY_OPTIONS.filter((m) => allowed.has(m.id));
  }, [kind]);

  function onChangeKind(next: KindId) {
    setKind(next);
    const allowed = METHODOLOGY_BY_KIND[next];
    if (!allowed.includes(methodology)) {
      setMethodology(allowed[0]);
    }
    setError(null);
  }

  async function onPickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImagesError(null);
    try {
      const next = await readFilesAsDataUrls(files);
      setImageCandidates((current) => [...current, ...next]);
    } catch (err) {
      setImagesError(err instanceof Error ? err.message : String(err));
    }
  }

  function removeImage(id: string) {
    setImageCandidates((current) => current.filter((c) => c.id !== id));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    let parsed: ParseResult;
    switch (kind) {
      case 'typography':
        parsed = parseTypography(candidatesText);
        break;
      case 'color':
        parsed = parseColor(candidatesText);
        break;
      case 'copy':
        parsed = parseCopy(candidatesText);
        break;
      case 'images':
        if (imageCandidates.length === 0) {
          setError('Pick at least one image.');
          return;
        }
        parsed = { ok: true, candidates: imageCandidates };
        break;
      case 'code': {
        const languageMatch = candidatesText.match(/^@lang\s+(\S+)\s*$/m);
        const language = languageMatch?.[1]?.trim() || 'text';
        const stripped = candidatesText.replace(/^@lang\s+\S+\s*\n?/m, '');
        parsed = parseBlockKind(stripped, 'code', language);
        break;
      }
      case 'markdown':
        parsed = parseBlockKind(candidatesText, 'markdown');
        break;
      case 'ai-output':
        parsed = parseBlockKind(candidatesText, 'response');
        break;
      case 'freeform':
        parsed = parseBlockKind(candidatesText, 'html');
        break;
    }
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (parsed.candidates.length < 2) {
      setError('Add at least two candidates.');
      return;
    }
    if (methodology === 'bracket-4-seed' && parsed.candidates.length !== 4) {
      setError('Bracket · 4 seeds requires exactly 4 candidates.');
      return;
    }

    const now = new Date().toISOString();
    const tournament = {
      id: `tour-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      slug: slugify(trimmedTitle),
      title: trimmedTitle,
      kind,
      methodology,
      schemaVersion: SCHEMA_VERSION,
      createdAt: now,
      lastActiveAt: now,
      candidates: parsed.candidates,
      config: defaultConfig(methodology),
      state: { finished: false, history: [] },
    };

    setSubmitting(true);
    try {
      const response = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tournament),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload?.error?.message ??
          `Server rejected the tournament (HTTP ${response.status}).`;
        const details = payload?.error?.details;
        const detailLines = Array.isArray(details?.errors)
          ? details.errors
              .map((e: { instancePath?: string; message?: string }) =>
                `${e.instancePath || '(root)'} ${e.message ?? ''}`.trim(),
              )
              .slice(0, 3)
              .join(' · ')
          : null;
        setError(detailLines ? `${message} — ${detailLines}` : message);
        setSubmitting(false);
        return;
      }
      const { id } = payload as { id: string };
      navigate(`/t/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const homeHref = '/';

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12">
          <div
            style={{ color: 'var(--text-faint)', letterSpacing: '0.12em' }}
            className="text-[11px] uppercase mb-3"
          >
            <a
              href={homeHref}
              onClick={(e) => {
                if (isInternalNavClick(e, homeHref)) {
                  e.preventDefault();
                  navigate(homeHref);
                }
              }}
              className="hover:text-[var(--text-muted)] transition-colors"
            >
              ← Library
            </a>
          </div>
          <h1
            style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
            className="text-3xl font-medium mb-3"
          >
            New tournament
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm leading-relaxed">
            Quick path — for the careful path, use{' '}
            <code
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              className="border px-1.5 py-0.5 text-[12px]"
            >
              /tournament
            </code>{' '}
            in a chat session.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-10">
          <Field label="Title" htmlFor="title">
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hero copy variants"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
              }}
              className="w-full border px-3 py-2 text-sm focus:outline-none focus:border-[var(--border-strong)]"
              required
            />
          </Field>

          <Field label="Kind">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {KIND_OPTIONS.map((opt) => {
                const selected = kind === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => onChangeKind(opt.id)}
                    style={{
                      background: selected ? 'var(--accent)' : 'var(--bg-card)',
                      color: selected ? 'var(--bg-card)' : 'var(--text)',
                      borderColor: selected ? 'var(--accent)' : 'var(--border)',
                    }}
                    className="text-left border px-3 py-2 transition-colors hover:border-[var(--border-strong)]"
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div
                      style={{
                        color: selected ? 'var(--bg-card)' : 'var(--text-faint)',
                        opacity: selected ? 0.7 : 1,
                      }}
                      className="text-[11px] mt-1 leading-snug"
                    >
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Methodology">
            <div className="space-y-2">
              {allowedMethodologies.map((opt) => {
                const selected = methodology === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setMethodology(opt.id)}
                    style={{
                      background: selected ? 'var(--bg-card)' : 'transparent',
                      color: 'var(--text)',
                      borderColor: selected ? 'var(--border-strong)' : 'var(--border)',
                    }}
                    className="w-full text-left border px-3 py-2 transition-colors hover:border-[var(--border-strong)]"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {selected && (
                        <span
                          style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}
                          className="text-[10px] uppercase"
                        >
                          selected
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[12px] mt-1">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Candidates" htmlFor="candidates">
            <p style={{ color: 'var(--text-faint)' }} className="text-xs mb-3 leading-relaxed">
              {SUBMIT_HINT_BY_KIND[kind]}
            </p>

            {kind === 'images' ? (
              <ImagePicker
                inputId="candidates"
                candidates={imageCandidates}
                onPick={onPickImages}
                onRemove={removeImage}
                error={imagesError}
              />
            ) : (
              <textarea
                id="candidates"
                name="candidates"
                value={candidatesText}
                onChange={(e) => setCandidatesText(e.target.value)}
                rows={kind === 'copy' || kind === 'color' || kind === 'typography' ? 8 : 14}
                placeholder={PLACEHOLDER_BY_KIND[kind]}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text)',
                  borderColor: 'var(--border)',
                  fontFamily:
                    kind === 'copy'
                      ? 'inherit'
                      : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
                className="w-full border px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-[var(--border-strong)]"
              />
            )}
          </Field>

          {error && (
            <div
              style={{ color: 'var(--text)', borderColor: 'var(--border-strong)' }}
              className="border-l-2 pl-4 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <a
              href={homeHref}
              onClick={(e) => {
                if (isInternalNavClick(e, homeHref)) {
                  e.preventDefault();
                  navigate(homeHref);
                }
              }}
              style={{ color: 'var(--text-faint)' }}
              className="text-sm hover:text-[var(--text-muted)] transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={submitting}
              style={{ background: 'var(--accent)', color: 'var(--bg-card)' }}
              className="text-sm px-5 py-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create & play'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        style={{ color: 'var(--text-faint)', letterSpacing: '0.12em' }}
        className="block text-[11px] uppercase mb-3"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const PLACEHOLDER_BY_KIND: Record<KindId, string> = {
  typography: 'Editorial | newsreader × inter\nUtility | ibm-plex-serif × ibm-plex-sans',
  color: 'Tundra #efece6\nIron #1f2937\nClay #b45309',
  copy: 'Welcome back — pick up where you left off\nReady to continue? Your draft is saved\nResume',
  images: '(use the picker)',
  code: '@lang ts\nfunction add(a: number, b: number) {\n  return a + b;\n}\n---\nexport const add = (a: number, b: number) => a + b;',
  markdown: '# Plan A\n\nShip narrow. One kind, one methodology.\n---\n# Plan B\n\nShip wide. All kinds at once.',
  'ai-output': 'Response A\n\nLong, careful, hedged.\n---\nResponse B\n\nShort, opinionated, direct.',
  freeform: '<div style="padding:24px;background:#111;color:#eee">Variant A</div>\n---\n<div style="padding:24px;background:#eee;color:#111">Variant B</div>',
};

function ImagePicker({
  inputId,
  candidates,
  onPick,
  onRemove,
  error,
}: {
  inputId: string;
  candidates: ParsedCandidate[];
  onPick: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        style={{
          background: 'var(--bg-card)',
          color: 'var(--text-muted)',
          borderColor: 'var(--border)',
        }}
        className="block border border-dashed px-4 py-6 text-center cursor-pointer hover:border-[var(--border-strong)] transition-colors text-sm"
      >
        <input
          id={inputId}
          name={inputId}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onPick(e.currentTarget.files)}
          className="sr-only"
        />
        Pick image files
      </label>
      {error && (
        <div style={{ color: 'var(--text)' }} className="text-xs">
          {error}
        </div>
      )}
      {candidates.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {candidates.map((c) => (
            <li
              key={c.id}
              style={{ borderColor: 'var(--border)' }}
              className="border p-2 flex flex-col gap-2"
            >
              <div
                style={{
                  background: 'var(--bg)',
                  aspectRatio: '1 / 1',
                  backgroundImage: `url(${String(c.src ?? '')})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                aria-label={c.label}
              />
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[11px] truncate"
                  title={c.label}
                >
                  {c.label}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  style={{ color: 'var(--text-faint)' }}
                  className="text-[11px] hover:text-[var(--text-muted)] transition-colors"
                  aria-label={`Remove ${c.label}`}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
