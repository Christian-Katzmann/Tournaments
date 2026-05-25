#!/usr/bin/env node
// Migrate a saved typography-tournament localStorage value into a
// Tournaments JSON file.
//
// Two modes:
//   1. Fresh seed (no input)  — produces a tournament with all 48 serif×sans
//      candidates at Elo 1500 and empty history.
//   2. Resume migration       — reads the standalone app's localStorage JSON
//      (value of key `besk-typography-tournament-v1`) from stdin or a file
//      and preserves every pairing's Elo, comparisons, wins, leftShown,
//      rightShown, plus the full history array.
//
// Usage:
//   node scripts/migrate-typography-state.mjs                       # fresh
//   node scripts/migrate-typography-state.mjs --from state.json     # from file
//   pbpaste | node scripts/migrate-typography-state.mjs --from -    # from stdin
//
// Output:
//   tournaments/beskaeftigelse-typography.json   (overwrites if present)
//
// After write: POST the file path to http://localhost:4278/api/registry so
// the running server picks it up. Skip silently if the server is unreachable.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const SLUG = 'beskaeftigelse-typography';
const TITLE = 'Beskæftigelse typography pairings';
const OUTPUT_PATH = path.join(REPO_ROOT, 'tournaments', `${SLUG}.json`);
const INITIAL_ELO = 1500;

const SERIFS = [
  { id: 'newsreader', name: 'Newsreader' },
  { id: 'faustina', name: 'Faustina' },
  { id: 'source-serif-4', name: 'Source Serif 4' },
  { id: 'lora', name: 'Lora' },
  { id: 'alegreya', name: 'Alegreya' },
  { id: 'ibm-plex-serif', name: 'IBM Plex Serif' },
];
const SANS = [
  { id: 'hanken-grotesk', name: 'Hanken Grotesk' },
  { id: 'inter', name: 'Inter' },
  { id: 'geist', name: 'Geist' },
  { id: 'work-sans', name: 'Work Sans' },
  { id: 'mulish', name: 'Mulish' },
  { id: 'lato', name: 'Lato' },
  { id: 'ibm-plex-sans', name: 'IBM Plex Sans' },
  { id: 'public-sans', name: 'Public Sans' },
];

const FONTS_BY_ID = Object.fromEntries(
  [...SERIFS, ...SANS].map((f) => [f.id, f]),
);

function buildCandidates() {
  const candidates = [];
  for (const s of SERIFS) {
    for (const ss of SANS) {
      candidates.push({
        id: `${s.id}__${ss.id}`,
        label: `${s.name} × ${ss.name}`,
        serif: s.id,
        sans: ss.id,
      });
    }
  }
  return candidates;
}

function buildFreshState() {
  const candidates = buildCandidates();
  return {
    pairings: candidates.map((c) => ({
      id: c.id,
      elo: INITIAL_ELO,
      comparisons: 0,
      wins: 0,
      leftShown: 0,
      rightShown: 0,
    })),
    history: [],
    theme: 'light',
    finished: false,
  };
}

/**
 * Convert the standalone app's TournamentState to the Tournaments runtime
 * state shape. The two shapes are deliberately close — only `serifId/sansId`
 * are dropped (now stored on the candidate, not the pairing) and `version`/
 * `startedAt`/`lastActiveAt`/`contentIndex` move to top-level fields.
 *
 * Returns { state, warnings }. Warnings list any pairings or history
 * entries that reference fonts not present in the current candidate set;
 * those entries are dropped from the output.
 */
function migrateState(legacy) {
  const candidates = buildCandidates();
  const validIds = new Set(candidates.map((c) => c.id));
  const warnings = [];

  const legacyById = new Map();
  for (const p of legacy.pairings ?? []) {
    if (p && typeof p.id === 'string') legacyById.set(p.id, p);
  }

  // One pairing per candidate. Unknown ids in legacy data are noted.
  for (const id of legacyById.keys()) {
    if (!validIds.has(id)) {
      warnings.push(
        `Legacy pairing ${id} references fonts not in the current candidate set — dropped.`,
      );
    }
  }

  const pairings = candidates.map((c) => {
    const p = legacyById.get(c.id);
    return {
      id: c.id,
      elo: typeof p?.elo === 'number' ? p.elo : INITIAL_ELO,
      comparisons: typeof p?.comparisons === 'number' ? p.comparisons : 0,
      wins: typeof p?.wins === 'number' ? p.wins : 0,
      leftShown: typeof p?.leftShown === 'number' ? p.leftShown : 0,
      rightShown: typeof p?.rightShown === 'number' ? p.rightShown : 0,
    };
  });

  const history = [];
  for (const h of legacy.history ?? []) {
    if (!h || typeof h !== 'object') continue;
    if (!validIds.has(h.leftId) || !validIds.has(h.rightId)) {
      warnings.push(
        `History entry round=${h.round} references unknown pairing ids (${h.leftId} vs ${h.rightId}) — dropped.`,
      );
      continue;
    }
    history.push({
      round: Number(h.round) || history.length + 1,
      timestamp: typeof h.timestamp === 'string' ? h.timestamp : new Date().toISOString(),
      leftId: h.leftId,
      rightId: h.rightId,
      contentIndex: Number.isInteger(h.contentIndex) ? h.contentIndex : 0,
      choice: h.choice === 'left' || h.choice === 'right' || h.choice === 'skip' ? h.choice : 'skip',
      eloDeltaLeft: Number(h.eloDeltaLeft) || 0,
      eloDeltaRight: Number(h.eloDeltaRight) || 0,
      msToDecide: Number(h.msToDecide) || 0,
    });
  }

  return {
    state: {
      pairings,
      history,
      theme: legacy.theme === 'dark' ? 'dark' : 'light',
      finished: legacy.finished === true,
    },
    warnings,
  };
}

function buildTournament(state) {
  const now = new Date().toISOString();
  return {
    id: 'tour-beskaeftigelse-typography',
    slug: SLUG,
    title: TITLE,
    kind: 'typography',
    methodology: 'elo-pairwise',
    schemaVersion: 1,
    createdAt: now,
    lastActiveAt: now,
    candidates: buildCandidates(),
    config: {
      kFactors: { early: 40, mid: 24, late: 16 },
      minComparisonsPerPair: 3,
    },
    state,
  };
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function parseArgs(argv) {
  const args = { from: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--from') {
      args.from = argv[i + 1] ?? null;
      i += 1;
    } else if (a.startsWith('--from=')) {
      args.from = a.slice('--from='.length);
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

async function registerWithServer(filePath) {
  const url = 'http://localhost:4278/api/registry';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`Registry returned ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn(
      `Could not reach Tournaments server at ${url} — start it with \`npm start\` and re-register if needed.`,
    );
    return null;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (args.help) {
    console.log(
      [
        'Usage:',
        '  node scripts/migrate-typography-state.mjs                  # fresh seed',
        '  node scripts/migrate-typography-state.mjs --from <file>    # migrate from JSON file',
        '  pbpaste | node scripts/migrate-typography-state.mjs --from -',
        '',
        'Input must be the value of localStorage key `besk-typography-tournament-v1`.',
      ].join('\n'),
    );
    return;
  }

  let state;
  let warnings = [];
  let mode = 'fresh';

  if (args.from) {
    let raw;
    if (args.from === '-') {
      raw = await readStdin();
    } else {
      raw = await readFile(args.from, 'utf8');
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      console.error('Input is empty.');
      process.exit(1);
    }
    let legacy;
    try {
      legacy = JSON.parse(trimmed);
    } catch (err) {
      console.error(`Input is not valid JSON: ${err.message}`);
      process.exit(1);
    }
    if (typeof legacy !== 'object' || legacy === null) {
      console.error('Input must be a JSON object (the localStorage value).');
      process.exit(1);
    }
    if (!Array.isArray(legacy.pairings) || !Array.isArray(legacy.history)) {
      console.error(
        'Input does not look like a TournamentState (missing pairings/history arrays).',
      );
      process.exit(1);
    }
    const migrated = migrateState(legacy);
    state = migrated.state;
    warnings = migrated.warnings;
    mode = 'migrated';
  } else {
    state = buildFreshState();
  }

  const tournament = buildTournament(state);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(tournament, null, 2) + '\n', 'utf8');

  const totalComparisons = state.history.length;
  const wonRounds = state.history.filter((h) => h.choice !== 'skip').length;
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  mode:        ${mode}`);
  console.log(`  candidates:  ${tournament.candidates.length} (expected 48)`);
  console.log(`  history:     ${totalComparisons} rounds (${wonRounds} decided)`);
  if (warnings.length > 0) {
    console.log(`  warnings:    ${warnings.length}`);
    for (const w of warnings) console.log(`    - ${w}`);
  }

  const registered = await registerWithServer(OUTPUT_PATH);
  if (registered) {
    console.log(`  registered:  id=${registered.id} → http://localhost:4278/t/${registered.id}`);
  } else {
    console.log(`  registered:  skipped (server not reachable; run \`npm start\` and re-run, or POST manually).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
