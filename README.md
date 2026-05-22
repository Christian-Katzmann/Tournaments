# Tournaments

A local-first comparison-decision tool. One tournament = N candidates of a single
kind, judged by a single methodology. Eight kinds (`typography`, `color`, `copy`,
`images`, `code`, `markdown`, `ai-output`, `freeform`), six methodologies
(`elo-pairwise`, `bradley-terry`, `bracket-4-seed`, `best-of-n`, `multi-axis`,
`slider`). Sibling of [Campaigns](../Campaigns/) — same shape, different verb.
Local only. No accounts, no cloud, no telemetry.

## Quick start

```bash
npm install
npm start              # vanilla Node HTTP server at http://localhost:4278
```

The double-clickable version is `~/Desktop/MyApps/Tournaments.app`. Build/install
with `npm run desktop:build && npm run desktop:install`. `Cmd+Q` quits cleanly.

## Creating a tournament

Two paths, both produce the same JSON file under `tournaments/<slug>.json`:

- **`/tournament` skill** — preferred. Distills a casual ask ("compare these 3
  logos") into a valid tournament, writes the file, registers it with the running
  server, returns a URL. Skill lives at `~/Dev/skills/tournament/`.
- **In-app form** — open the homescreen, click *New tournament*, pick kind +
  methodology, drop candidates. Less polished than the skill, useful when you
  don't want to drop to a chat session.

Existing tournaments appear on the homescreen, most-recently-active first.

## Where state lives

| What                        | Where                                                                |
| --------------------------- | -------------------------------------------------------------------- |
| Tournament spec + state     | `tournaments/<slug>.json` (one file, atomic-rename writes)           |
| Registry (id ↔ filePath)    | `~/Library/Application Support/Tournaments/registry.json`            |
| Server port / pid / log     | `~/Library/Logs/Tournaments/server.{port,pid,log}`                   |
| Built `.app` bundle         | `desktop/Tournaments.app` (build), `~/Desktop/MyApps/...` (install)  |

The file at `tournaments/<slug>.json` is the source of truth. The browser keeps a
debounced cache for snappy resume, but every choice posts back to the server,
which atomic-renames the file. Closing the window does not lose state.

## Sibling-to-Campaigns relationship

Both apps share a structural pattern: vanilla Node HTTP server, registry under
`~/Library/Application Support/<App>/`, per-item JSON files inside the repo,
appified to `~/Desktop/MyApps/`. They do not share code — Tournaments copied
the appify scripts and rebuilt the server. Port: Campaigns 4178, Tournaments
4278. They cohabit without coordination.

## Docs

- [`AGENTS.md`](AGENTS.md) — operating rules for AI agents working in this repo
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — original design doc (locked decisions)
- [`docs/kinds.md`](docs/kinds.md) — one paragraph per kind
- [`docs/methodologies.md`](docs/methodologies.md) — one paragraph per methodology
- [`docs/development.md`](docs/development.md) — scripts, tests, common gotchas
- [`docs/server.md`](docs/server.md) — REST endpoints with curl examples
- [`docs/migrations.md`](docs/migrations.md) — migrating the standalone typography app
- [`schemas/README.md`](schemas/README.md) — candidate shapes per kind
