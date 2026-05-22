import { useCallback, useState } from 'react';
import KindsDevPage from './dev/kinds';
import { useTournament } from './hooks/useTournament';
import { TournamentWelcomeScreen } from './components/TournamentWelcomeScreen';
import { TournamentScreen } from './components/TournamentScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { HomeScreen } from './components/HomeScreen';
import { NewTournamentForm } from './components/NewTournamentForm';
import { parseTournamentId, useLocation } from './lib/router';

type Screen = 'welcome' | 'tournament' | 'results';

function isDevKindsRoute(pathname: string): boolean {
  return pathname === '/dev/kinds' || pathname === '/dev/kinds.tsx';
}

export default function App() {
  const location = useLocation();

  if (isDevKindsRoute(location.pathname)) {
    return <KindsDevPage />;
  }

  if (location.pathname === '/new' || location.pathname === '/new/') {
    return <NewTournamentForm />;
  }

  const tournamentId = parseTournamentId(location.pathname);
  if (tournamentId) {
    return <TournamentRoute tournamentId={tournamentId} />;
  }

  return <HomeScreen />;
}

function TournamentRoute({ tournamentId }: { tournamentId: string }) {
  const { status, error, doc, state, currentRound, beginRound, recordChoice, undo, toggleTheme, fatigue } =
    useTournament(tournamentId);
  const [screen, setScreen] = useState<Screen>('welcome');

  const goTournament = useCallback(() => {
    beginRound();
    setScreen('tournament');
  }, [beginRound]);

  const goWelcome = useCallback(() => setScreen('welcome'), []);
  const goResults = useCallback(() => setScreen('results'), []);

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState message={error ?? 'Failed to load tournament'} />;
  if (!doc || !state) return <LoadingState />;

  if (screen === 'tournament' && currentRound) {
    return (
      <TournamentScreen
        kind={doc.kind}
        title={doc.title}
        round={currentRound}
        state={state}
        onChoice={recordChoice}
        onUndo={undo}
        onShowResults={goResults}
        onShowWelcome={goWelcome}
        onToggleTheme={toggleTheme}
        fatigue={fatigue}
      />
    );
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        doc={doc}
        state={state}
        onResume={goTournament}
        onShowWelcome={goWelcome}
      />
    );
  }

  return (
    <TournamentWelcomeScreen
      doc={doc}
      state={state}
      onBegin={goTournament}
      onShowResults={goResults}
    />
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div style={{ color: 'var(--text-faint)' }} className="text-sm">
        Loading tournament…
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div
          style={{ color: 'var(--text-faint)', letterSpacing: '0.12em' }}
          className="text-[11px] uppercase mb-3"
        >
          Tournament unavailable
        </div>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          {message}
        </p>
        <p style={{ color: 'var(--text-faint)' }} className="text-xs mt-6">
          <a href="/" className="underline">
            Back to the library
          </a>
        </p>
      </div>
    </main>
  );
}
