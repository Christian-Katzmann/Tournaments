# Tournaments — Architecture

A local-first app for running comparison decisions across any content type, using rigorous judgment methodologies.

## North-star principle

> **A tournament is a comparison of N candidates of any kind, using any judgment method.**

Don't anchor on typography (the seed case). Fonts, color palettes, copy variants, logos, code snippets, AI prompt outputs, plan options, raw HTML — all are tournaments. The architecture must accommodate the future cases as cleanly as the current one.

## Three orthogonal axes

These compose. Any tournament picks one from each.

### Axis 1 — Tournament `kind` (what's being compared)

Closed taxonomy at launch, extensible later:

| kind | candidate shape | preview renderer |
|---|---|---|
| `typography` | `{ id, label, serif: fontId, sans: fontId }` plus shared content templates | text rendered in serif/sans on the live product canvas |
| `color` | `{ id, label, hex, name? }` | swatch + name + sample text on the color |
| `copy` | `{ id, label, text }` | text rendered on a canvas (headline, paragraph, CTA) |
| `images` | `{ id, label, src }` (local path or URL) | image, fitted to a fixed aspect ratio |
| `code` | `{ id, label, language, code }` | syntax-highlighted code block |
| `markdown` | `{ id, label, markdown }` | rendered markdown (for comparing plans/strategies) |
| `ai-output` | `{ id, label, prompt?, response, model? }` | response panel; optional prompt above |
| `freeform` | `{ id, label, html }` | sandboxed iframe rendering raw HTML — escape hatch for anything else |

### Axis 2 — `methodology` (how judgments combine)

| methodology | best when | math source |
|---|---|---|
| `elo-pairwise` | pool 8+, want stable per-pairing rating | adapted from a typography comparison prototype |
| `bradley-terry` | pool 8+, want rigorous probabilistic ranks | maximum-likelihood ranking algorithm |
| `bracket-4-seed` | pool exactly 4, want decisive winner | single-elimination bracket logic |
| `best-of-n` | small pool (3-6), each round shows N candidates and you pick best | group-comparison selection |
| `multi-axis` | multiple criteria matter ("best for mobile" + "best for desktop") | independent multi-criteria scoring |
| `slider` | continuous rating (e.g., 1-10 quality) | direct continuous rating |

### Axis 3 — `candidate count`

Determines coverage strategy and total comparisons. The Elo matchmaker has three phases (coverage / stabilization / refinement); same pattern generalizes.

## Elo-pairwise patterns

- Adaptive K-factor (K=40 / 24 / 16 by comparison count)
- Coverage phase then stabilization (3+ per pairing) then refinement (close-Elo matchups)
- Counterbalanced left/right; no back-to-back pairing repeats
- Skip = no info (not penalized, not credited)
- Single-step undo with delta reversal
- Fatigue heuristic (advisory only, never blocks)
- localStorage persistence with version field
- Resumable across browser closes/restarts
- **Hold-to-isolate** (`1` / `2` keys, also UI buttons under each card): hides the non-focus card and dims chrome, letting you judge one in isolation

## App architecture

```
<project-root>/
├── server.mjs                          # Node HTTP, vanilla http.createServer
├── package.json
├── public/                             # Static frontend assets, served by server.mjs
│   ├── index.html                      # SPA shell (output of vite build)
│   └── assets/                         # JS/CSS bundles
├── src/                                # React + TypeScript source
│   ├── App.tsx                         # Router: /, /new, /t/:id, /dev/kinds
│   ├── components/                     # UI shell
│   ├── hooks/                          # useTournament, useKeyboard
│   ├── lib/                            # Pure modules: elo, matchmaking, etc.
│   │   └── kinds/                      # Per-kind renderer + logic
│   └── dev/                            # /dev/kinds preview page
├── tournaments/                        # Per-tournament JSON files (gitignored)
│   └── <slug>.json
├── schemas/
│   └── tournament.schema.json          # Single source of truth
├── examples/                           # Sample tournament files for new users
├── scripts/                            # Desktop launcher pipeline (macOS)
└── docs/                               # Reference documentation
```

Platform-specific state (macOS defaults shown):

```
~/Library/Application Support/Tournaments/
└── registry.json                       # { id, slug, filePath, title, kind, createdAt, lastActiveAt }

~/Library/Logs/Tournaments/
├── server.log
├── server.pid
└── server.port                         # Runtime port for paired skills to discover
```

## Server contract

Port: default 4278. Persisted to the platform-specific logs directory on startup.

```
GET  /                       -> SPA shell (homescreen)
GET  /t/:id                  -> SPA shell (tournament view, hydrated client-side)
GET  /api/registry           -> List all registered tournaments
POST /api/registry           -> { filePath }; register a new tournament file. Returns { id }
GET  /api/tournament/:id     -> Full tournament JSON (file + persisted state)
POST /api/tournament/:id/state -> Persist judgment state
POST /api/tournament         -> Create a new tournament from JSON body
DELETE /api/registry/:id     -> Unregister (does not delete the file)
```

State persistence lives in server-side JSON files. The browser keeps a localStorage cache for snappy resume, but the source of truth is the file. This lets the app survive cache clears, browser switches, and machine moves via dotfile sync.

## Non-goals (the explicit list)

- **No multi-user/sharing.** Local only.
- **No cloud sync.** State is local. Dotfile sync is the user's concern.
- **No analytics, no telemetry.** Nothing leaves the machine.
- **No tournament editing once started.** Adding/removing candidates mid-tournament corrupts the math.
- **No real-time leaderboard during judging.** Could bias the user. Standings only on the Results page or via explicit "Show standings" action.
- **No AI agent that judges for you.** The whole point is your taste.
