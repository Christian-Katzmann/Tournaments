import { useEffect, useState } from 'react';
import { isInternalNavClick, useNavigate } from '../lib/router';
import { TournamentListItem } from './TournamentListItem';

export interface RegistryEntry {
  id: string;
  slug: string | null;
  title: string;
  kind: string | null;
  methodology: string | null;
  filePath: string;
  createdAt: string | null;
  lastActiveAt: string | null;
  progress: {
    comparisons: number;
    pairings: number | null;
    percent: number | null;
  };
  missing: boolean;
}

type Status = 'loading' | 'ready' | 'error';

function sortByMostRecent(a: RegistryEntry, b: RegistryEntry): number {
  const aTime = new Date(a.lastActiveAt ?? a.createdAt ?? 0).getTime();
  const bTime = new Date(b.lastActiveAt ?? b.createdAt ?? 0).getTime();
  return bTime - aTime;
}

export function HomeScreen() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const response = await fetch('/api/registry');
        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: { message: response.statusText } }));
          throw new Error(body?.error?.message ?? `Failed to load registry: ${response.status}`);
        }
        const payload = (await response.json()) as { tournaments: RegistryEntry[] };
        if (cancelled) return;
        const sorted = [...(payload.tournaments ?? [])].sort(sortByMostRecent);
        setEntries(sorted);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const newHref = '/new';

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <div
            style={{ color: 'var(--text-faint)', letterSpacing: '0.12em' }}
            className="text-[11px] uppercase mb-3"
          >
            Library
          </div>
          <div className="flex items-baseline justify-between gap-6 flex-wrap">
            <h1
              style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
              className="text-3xl font-medium"
            >
              Tournaments
            </h1>
            <a
              href={newHref}
              onClick={(e) => {
                if (isInternalNavClick(e, newHref)) {
                  e.preventDefault();
                  navigate(newHref);
                }
              }}
              style={{ background: 'var(--accent)', color: 'var(--bg-card)' }}
              className="text-sm px-4 py-2 transition-opacity hover:opacity-90"
            >
              New tournament
            </a>
          </div>
        </header>

        {status === 'loading' && (
          <div style={{ color: 'var(--text-faint)' }} className="text-sm">
            Loading…
          </div>
        )}

        {status === 'error' && (
          <div
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
            className="border-l-2 pl-4 text-sm"
          >
            Couldn’t load tournaments. {error}
          </div>
        )}

        {status === 'ready' && entries.length === 0 && <EmptyState />}

        {status === 'ready' && entries.length > 0 && (
          <div
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            className="border-y"
          >
            {entries.map((entry) => (
              <TournamentListItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        <footer
          style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}
          className="text-xs mt-16 pt-6 border-t"
        >
          A tournament is N candidates of any kind, judged by any methodology.
          Local-first — nothing leaves this machine.
        </footer>
      </div>
    </main>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div
      style={{ borderColor: 'var(--border)' }}
      className="border rounded-none px-8 py-14 text-center"
    >
      <div
        style={{ color: 'var(--text-faint)', letterSpacing: '0.12em' }}
        className="text-[11px] uppercase mb-4"
      >
        No tournaments yet
      </div>
      <p
        style={{ color: 'var(--text-muted)' }}
        className="text-sm leading-relaxed max-w-md mx-auto mb-8"
      >
        Spin one up the careful way with the{' '}
        <code
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          className="border px-1.5 py-0.5 text-[12px]"
        >
          /tournament
        </code>{' '}
        skill — it picks the right kind and methodology and writes the file for
        you. Or skip the chat and create one in-app.
      </p>
      <button
        onClick={() => navigate('/new')}
        style={{ background: 'var(--accent)', color: 'var(--bg-card)' }}
        className="text-sm px-4 py-2 transition-opacity hover:opacity-90"
      >
        Create tournament
      </button>
    </div>
  );
}
