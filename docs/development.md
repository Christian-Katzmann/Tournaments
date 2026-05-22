# Development

## Scripts

| Command                  | What it does                                                      |
| ------------------------ | ----------------------------------------------------------------- |
| `npm install`            | Install dependencies                                              |
| `npm start`              | Run the full app: `node server.mjs` at `http://localhost:4278`    |
| `npm run dev`            | Vite component playground at `http://localhost:5274` (no backend) |
| `npm run build`          | `tsc -b` + `vite build` → static assets in `public/`              |
| `npm test`               | Vitest run: schema, math, server integration                      |
| `npx tsc -b`             | Strict typecheck across project references                        |
| `npm run desktop:build`  | Build `desktop/Tournaments.app`                                   |
| `npm run desktop:install`| Copy app bundle to `~/Desktop/MyApps/Tournaments.app`             |
| `npm run desktop:quit`   | Kill running wrapper window + Node server                         |

## Two ways to run

**Component dev** (`npm run dev`): Vite at port 5274 with no backend. You can
hit `/dev/kinds` to preview every kind renderer with sample candidates. State
that needs the server (loading a tournament, persisting choices) won't work.

**Full app** (`npm start`): the actual Node server at port 4278. Serves the
built static assets from `public/`. To iterate on UI you must run
`npm run build` after edits, or use the appified shell which automatically
points at the built bundle.

The fastest realistic loop is *component dev for layout work*, then
`build && start` for end-to-end checks.

## Common gotchas

- **Vite port literal.** `npm run dev` hardcodes `--port 5274`. The appify
  launcher uses port 4278 and starts `node server.mjs` directly, not `vite`,
  so this never collides.
- **Server file lives at `server.mjs` (ES module).** Not `server.js`. Don't
  rename — the appified launcher's start command is `node server.mjs`.
- **Schema is the contract.** Editing `schemas/tournament.schema.json` ripples
  to the `/tournament` skill (symlinked) and to every tournament file's
  validity. Run `npm test` after edits.
- **Atomic writes.** State POSTs go through `withFileLock` + atomic rename.
  Don't edit `tournaments/*.json` while the server is running — your write
  will get clobbered by the next state POST.
- **Registry caching.** The server reads the registry JSON on every request;
  there's no in-memory cache. But external edits during a request can race —
  prefer `npm run desktop:quit` before bulk-editing.
- **Appified launches reattach.** The launcher detects a still-running server
  on its port and skips the boot — fast re-launches don't double-start. If
  it ever attaches to a stranger's server, that's a bug; check
  `~/Library/Logs/Tournaments/server.{pid,port}`.
- **TypeScript strict.** `tsconfig` enables `strict`, `noUncheckedIndexedAccess`,
  and project references. `npx tsc -b` is the truth — `vite build` cuts
  corners.
- **macOS Gatekeeper.** The `.app` is ad-hoc signed (no Developer ID) by
  `desktop-build.sh`. First-launch on iCloud-synced `~/Desktop` strips xattrs
  + re-signs in `desktop-install.sh`. If a launch fails with "X can't be
  opened," re-run `npm run desktop:install`.

## Adding a kind

1. Create `src/lib/kinds/<name>/{index.ts,renderer.tsx}`.
2. Register in `src/lib/kinds/index.ts`.
3. Add the candidate shape to `schemas/tournament.schema.json`
   (`candidate_<name>` def + the `if/then` branch).
4. Add a sample candidate set to `src/dev/kinds.tsx`.
5. Add a `templates/<name>.example.json` to `~/Dev/skills/tournament/`.
6. `npm test` to confirm the schema still validates the existing example.

## Adding a methodology

1. Update the `methodology` enum in the schema.
2. Add a `config_<id>` def + `if/then` branch under `allOf`.
3. Wire matchmaking + scoring logic in `src/lib/`.
4. Plumb the new methodology through `useTournament` + the welcome / results
   screens.
5. Update `docs/methodologies.md`.
