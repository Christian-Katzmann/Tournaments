# Agent guide — Tournaments

## Start here

- **What this repo is:** the Tournaments app — a local-first comparison-decision
  tool. Each tournament file under `tournaments/` holds both the spec and the
  state.
- **Stack:** vanilla Node HTTP server (no framework), Vite + React 19 +
  TypeScript (strict), Tailwind v4, Vitest. Eight kinds x six methodologies.
- **Safest first command:** `git status --short`.
- **Port:** 4278. Logs directory and registry location are platform-specific
  (see `server.mjs` for defaults).

## Operating rules

- Use `npm`, not pnpm or yarn. Source of truth is `package-lock.json`.
- **The schema (`schemas/tournament.schema.json`) is canonical.** Any paired
  skill that creates tournaments should reference this schema. Run the schema
  test (`npm test`) after edits.
- **Tournament JSON files are atomic-rename writes.** Don't read+modify+write a
  `tournaments/*.json` file from the outside while the app is running — the
  server's per-file lock keeps state POSTs consistent, but external writes can
  race. Stop the server before bulk-editing.
- **Never use an HTTP framework.** Vanilla `http.createServer` + URL parsing
  only. The constraint is part of the contract.

## Architecture and boundaries

- `src/lib/` — pure modules: `elo`, `matchmaking`, `bradley-terry`, `bracket`,
  `stability`. No React or DOM. `index.ts` is the barrel export.
- `src/lib/kinds/` — one folder per kind. Each registers itself by importing
  through `src/lib/kinds/index.ts`. The `Kind<C>` interface lives in `types.ts`.
- `src/components/` — UI shell: `HomeScreen`, `NewTournamentForm`,
  `TournamentWelcomeScreen`, `TournamentScreen`, `ComparisonCard`,
  `KindRenderer`, `ResultsScreen`, `TournamentListItem`.
- `src/hooks/` — `useTournament` (fetch + debounced persist), `useKeyboard`.
- `src/dev/` — `/dev/kinds` preview page. Renders every kind with sample data.
- `server.mjs` — single-file Node HTTP server. SPA shell at `/`, `/new`, `/t/:id`.
  REST under `/api/`. Atomic writes for tournament files, serial queue for
  registry mutations, per-file lock for state POSTs.
- `schemas/tournament.schema.json` — canonical JSON Schema.
- `scripts/` — `desktop-*.sh` appify launcher pipeline, `wrapper.swift` WebKit
  shell.
- `tournaments/` — one JSON file per tournament. Spec + state in the same file.

## Common commands

```bash
npm install              # one time
npm run dev              # Vite at http://localhost:5274 (component dev, not the full app)
npm start                # full app: node server.mjs at http://localhost:4278
npm test                 # Vitest (schema + math + server)
npx tsc -b               # strict typecheck across the project references

npm run desktop:build    # build desktop/Tournaments.app (macOS only)
npm run desktop:install  # copy to desktop app location (macOS only)
npm run desktop:quit     # kill server + wrapper windows
```

Run from the repo root unless a script says otherwise.

## Verification

- Docs-only changes: read the diff and run `git status --short`.
- Frontend changes: `npx tsc -b`, then open the running app and verify the
  feature in the browser. Type-check passes does not equal feature works.
- Server changes: `npm test` (server integration tests run against a random
  port), plus `npx tsc -b`.
- Math changes: `npm test`. Don't ship without unit tests.
- Schema changes: `npm test` (validates the example), plus update the in-app
  form if new shapes appear.

## Dangerous areas

- **`schemas/tournament.schema.json`** — canonical. Backwards-incompatible
  changes break every existing tournament file. Add a field or `oneOf` branch,
  don't reshape existing ones.
- **`server.mjs` registry + state writes** — atomic-rename and a serial mutation
  queue guard concurrency. Don't add code paths that bypass them.
- **`scripts/wrapper.swift`** — the appified shell. The comments inside it
  document traps (NFC/NFD pgrep, descendant-walk reattach, PATH for various
  Node version managers, two-stage cleanup). Don't re-derive them.
- **`tournaments/*.json`** — the running app writes to these. Bulk-edits
  require the server to be down.
- **Hardcoded port 4278** — don't move it without updating documentation.

## Do not

- Do not commit local tournament data from `tournaments/`; they are gitignored.
- Do not make the app depend on a specific home directory. Use platform defaults
  or configurable environment variables.
- Do not add broad agent instructions or generic architecture prose; if a doc
  does not encode a Tournaments-specific decision, leave it out.
