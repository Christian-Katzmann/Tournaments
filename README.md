# Tournaments

A local-first comparison-decision tool. Put N candidates side by side, judge them with a real methodology, and get a defensible ranking instead of a gut call.

Eight kinds of content (`typography`, `color`, `copy`, `images`, `code`, `markdown`, `ai-output`, `freeform`) combined with six judgment methodologies (`elo-pairwise`, `bradley-terry`, `bracket-4-seed`, `best-of-n`, `multi-axis`, `slider`). Local only. No accounts, no cloud, no telemetry.

Status: usable public alpha. The Node server and sample tournaments are portable; the optional desktop wrapper is macOS-only.

## What This Is Not

- Not a hosted bracket or polling service.
- Not a voting tool with multiple users. Tournaments is single-user, local-first.
- Not a database. Each tournament is one JSON file. Close the browser, move the file, come back later.

## Quick Start

Requirements:

- Node.js 20 or newer

```bash
git clone https://github.com/Christian-Katzmann/Tournaments.git
cd Tournaments
./install.sh
npm run start:sample
```

Then open `http://localhost:4278`. The sample tournament loads a color comparison you can start judging immediately.

Start fresh with an empty homescreen:

```bash
npm start
```

## Choose Your Path

- **Try the product:** run `npm run start:sample` and judge the sample color tournament.
- **Create a tournament:** open the homescreen, click *New tournament*, pick kind + methodology, add candidates.
- **Pair it with an agent skill:** register tournaments through the local `POST /api/registry` contract.
- **Package the desktop launcher:** run `npm run desktop:build` on macOS.
- **Work on the repo:** run `npm test` and `npx tsc -b` before handing changes back.

## Kinds

A *kind* is what one candidate looks like:

| Kind | What you compare |
|---|---|
| `typography` | Font pairings (serif + sans) rendered on real content |
| `color` | Hex colors with swatches and contrast text |
| `copy` | Headlines, taglines, CTAs on a neutral canvas |
| `images` | Logos, photos, screenshots at fixed aspect ratio |
| `code` | Syntax-highlighted code snippets |
| `markdown` | Plans, proposals, long-form text as rendered prose |
| `ai-output` | Model responses, optionally with prompts |
| `freeform` | Arbitrary HTML in a sandboxed iframe |

## Methodologies

A *methodology* is how judgments combine into a ranking:

| Methodology | When to use |
|---|---|
| `elo-pairwise` | Default for 5+ candidates. Pairwise comparisons, adaptive Elo |
| `bradley-terry` | Rigorous probabilistic ranking with confidence intervals |
| `bracket-4-seed` | Exactly 4 candidates, single-elimination bracket |
| `best-of-n` | See all candidates at once, pick the best each round |
| `multi-axis` | Score candidates on multiple labeled criteria independently |
| `slider` | Continuous score per candidate (e.g. 1-10 quality) |

## How It Works

```text
Tournament JSON file
  -> server validates against schema, registers in library
  -> browser loads tournament, presents judgment rounds
  -> each choice posts back, server atomic-writes the state
  -> results page shows Elo ratings, confidence, history
```

The JSON file is the source of truth. The browser keeps a debounced cache for snappy resume, but every choice posts to the server, which atomic-renames the file. Closing the window does not lose state.

## Where State Lives

| What | Where |
|---|---|
| Tournament spec + state | `tournaments/<slug>.json` (one file, atomic-rename writes) |
| Registry (id to filePath) | Platform-specific app support directory |
| Server port / pid / log | Platform-specific logs directory |

On macOS, the registry is at `~/Library/Application Support/Tournaments/registry.json` and logs are at `~/Library/Logs/Tournaments/`.

## Paired Skills

Tournaments is designed to pair with agent skills that create and register tournament JSON files.

The expected flow is:

1. A skill writes a tournament JSON file into the `tournaments/` directory.
2. It discovers the running Tournaments server port.
3. It registers the file with `POST /api/registry`.
4. The file appears in the library and is reachable at `http://localhost:<port>/t/<id>`.

The server writes the active port to a platform-specific path on startup. On macOS: `~/Library/Logs/Tournaments/server.port`.

## API Contract

The local server exposes the endpoints paired skills rely on:

```http
GET  /api/health
GET  /api/schema
GET  /api/registry
POST /api/registry
DELETE /api/registry/:id
GET  /api/tournament/:id
POST /api/tournament/:id/state
POST /api/tournament
```

Register a tournament:

```json
{ "filePath": "/absolute/path/to/tournament.json" }
```

Create a tournament:

```bash
curl -X POST http://localhost:4278/api/tournament \
  -H 'content-type: application/json' \
  -d @./examples/sample-color-tournament.json
```

See [docs/server.md](docs/server.md) for full endpoint documentation with curl examples.

## Desktop Launcher

The optional desktop wrapper is macOS-only. It builds a local `.app` that starts the Node server and opens a WebKit window.

```bash
npm run desktop:build
npm run desktop:install
npm run desktop:quit
```

The plain Node server is the portable path.

## Development

```bash
npm test          # schema, math, server integration tests
npx tsc -b        # strict typecheck
npm run dev       # Vite playground at localhost:5274 (no backend)
npm start         # full app at localhost:4278
```

See [docs/development.md](docs/development.md) for the full development guide.

## Docs

- [`AGENTS.md`](AGENTS.md) — operating rules for AI agents working in this repo
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — design decisions and system map
- [`docs/kinds.md`](docs/kinds.md) — one paragraph per kind
- [`docs/methodologies.md`](docs/methodologies.md) — one paragraph per methodology
- [`docs/development.md`](docs/development.md) — scripts, tests, common gotchas
- [`docs/server.md`](docs/server.md) — REST endpoints with curl examples
- [`schemas/README.md`](schemas/README.md) — candidate shapes per kind

## License

MIT.
