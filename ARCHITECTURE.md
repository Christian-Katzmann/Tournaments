# Tournaments — Architecture

A local-first app for running comparison decisions across any content type, using rigorous judgment methodologies. Sibling to the Campaigns app pattern.

## North-star principle

> **A tournament is a comparison of N candidates of any kind, using any judgment method.**

Don't anchor on typography (the seed case). Fonts, color palettes, copy variants, logos, code snippets, AI prompt outputs, plan options, raw HTML — all are tournaments. The architecture must accommodate the future cases as cleanly as the current one.

## Three orthogonal axes

These compose. Any tournament picks one from each.

### Axis 1 — Tournament `kind` (what's being compared)

Closed taxonomy at launch, extensible later:

| kind | candidate shape | preview renderer |
|---|---|---|
| `typography` | `{ id, label, serif: fontId, sans: fontId }` plus shared Danish content templates | text rendered in serif/sans on the live product canvas |
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
| `elo-pairwise` | pool 8+, want stable per-pairing rating | tonight's typography tournament |
| `bradley-terry` | pool 8+, want rigorous probabilistic ranks | copied from `modelarena/src/server/bradley-terry.ts` |
| `bracket-4-seed` | pool exactly 4, want decisive winner | copied from `modelarena/src/lib/tournament.ts` |
| `best-of-n` | small pool (3-6), each round shows N candidates and you pick best | adapted from `modelarena/src/components/voting/BestOfNStepView.tsx` |
| `multi-axis` | multiple criteria matter ("best for mobile" + "best for desktop") | adapted from `modelarena/src/components/voting/MultiAxisStepView.tsx` |
| `slider` | continuous rating (e.g., 1-10 quality) | adapted from `modelarena/src/components/voting/SliderStepView.tsx` |

### Axis 3 — `candidate count`

Determines coverage strategy and total comparisons. The Elo matchmaker tonight has three phases (coverage / stabilization / refinement); same pattern generalizes.

## What we copy from modelarena (one-way, no coupling)

Files to copy into `lib/`, then evolve independently:

- `src/server/bradley-terry.ts` → `lib/bradley-terry.ts`
- `src/server/ratings.ts` → reference only; we have simpler ratings in `lib/elo.ts`
- `src/lib/tournament.ts` (bracket logic) → `lib/bracket.ts`
- `src/lib/stability.ts` → `lib/stability.ts` (directional/preliminary/stable tiers)
- `src/components/voting/*.tsx` → reference only; redesign UI fresh per kit verdict

After copy: zero coupling. ïdea.com / modelarena can do whatever it wants.

## Pattern from the typography tournament (kept)

- Adaptive K-factor (K=40 / 24 / 16 by comparison count)
- Coverage phase → stabilization (≥3 per pairing) → refinement (close-Elo matchups)
- Counterbalanced left/right; no back-to-back pairing repeats
- Skip = no info (not penalized, not credited)
- Single-step undo with delta reversal
- Fatigue heuristic (advisory only, never blocks)
- localStorage persistence with version field
- Resumable across browser closes/restarts
- **Hold-to-isolate** (`1` / `2` keys, also UI buttons under each card): hides the non-focus card and dims chrome, letting you judge one in isolation

## App architecture

```
~/Dev/Projects/Tournaments/
├── server.mjs                          # Node HTTP, mirrors Campaigns/server.mjs
├── package.json
├── public/                             # Static frontend assets, served by server.mjs
│   ├── index.html                      # SPA shell
│   ├── homescreen.html or routes/      # Library of all tournaments
│   └── tournament/                     # The judgment UI
├── tournaments/                        # Per-tournament JSON files live here
│   └── <slug>.json                     # Example: beskaeftigelse-typography.json
├── schemas/
│   └── tournament.schema.json          # Single source of truth; skill vendors this
├── lib/
│   ├── elo.ts                          # From typography app
│   ├── matchmaking.ts                  # From typography app
│   ├── bradley-terry.ts                # From modelarena
│   ├── bracket.ts                      # From modelarena
│   ├── stability.ts                    # From modelarena
│   └── kinds/                          # Per-kind renderer logic
│       ├── typography.ts
│       ├── color.ts
│       ├── ...
│       └── freeform.ts
├── desktop/                            # Appify output goes here
└── scripts/
    └── desktop-*.sh                    # Standard /appify scripts

~/Library/Application Support/Tournaments/
└── registry.json                       # { id, slug, filePath, title, kind, createdAt, lastActiveAt }

~/Library/Logs/Tournaments/
├── server.log
├── server.pid
└── server.port                         # Runtime port for the skill to discover

~/Desktop/MyApps/
└── Tournaments.app                     # appified launcher
```

## Server contract

Port: default 4278 (echoing Campaigns' 4178 with a +100). Persisted at `~/Library/Logs/Tournaments/server.port`.

```
GET  /                       → SPA shell (homescreen)
GET  /t/:id                  → SPA shell (tournament view, hydrated client-side)
GET  /api/registry           → List all registered tournaments
POST /api/registry           → { filePath }; register a new tournament file. Returns { id }
GET  /api/tournament/:id     → Full tournament JSON (file + persisted state)
POST /api/tournament/:id/state → Persist judgment state (mirrors localStorage role)
DELETE /api/registry/:id     → Unregister (does not delete the file)
```

State persistence migrates from localStorage (typography app) to server-side JSON files. The browser still keeps a localStorage cache for snappy resume, but the source of truth is the file. This lets the app survive cache clears, browser switches, and (later) machine moves via dotfile sync.

## Homescreen UX

Library view of all registered tournaments, similar to Campaigns:

```
TOURNAMENTS
─────────────────────────────────────
Beskæftigelse typography      Round 247 / ~300        typography · elo-pairwise
Logo concepts for Momó         3 of 6 battles          images · bracket-4-seed
Hero copy variants             14 of ~40 done          copy · elo-pairwise
─────────────────────────────────────
+ New tournament              (uses /tournament skill, or in-app create flow)
```

Click a tournament → tournament view. Methodology and kind shown as small tags. Progress shown in tournament-specific terms.

## The /tournament skill (kit per /kit-the-skill verdict)

```
~/.claude/skills/tournament/
├── SKILL.md                          # distillation, kind/methodology selection
├── schemas/
│   └── tournament.schema.json        # SYMLINK to the Tournaments app's schema file
├── templates/
│   ├── typography.example.json       # one canonical example per kind
│   ├── color.example.json
│   ├── copy.example.json
│   ├── images.example.json
│   ├── code.example.json
│   ├── markdown.example.json
│   ├── ai-output.example.json
│   └── freeform.example.json
└── bin/
    └── create-tournament.sh          # validate → write file → POST to server → emit URL
```

Single schema source. Skill symlinks the canonical schema from the Tournaments repo. No drift possible.

## Migration of the typography tournament

The Playground app at `~/Dev/Playground/besk-typography-tournament/` becomes Tournaments' **kind=typography** seed example. Specifically:

- Its `content.ts` (Danish templates), `fonts.ts` (font registry), and the card layout become the `typography` kind's content + renderer.
- Its `elo.ts`, `matchmaking.ts`, `persistence.ts` move into `lib/` and become methodology-agnostic.
- The user's in-progress judging session migrates: import the current localStorage JSON as the initial state file. They resume from where they stopped.

## Non-goals (the explicit list)

- **No multi-user/sharing.** Local only.
- **No cloud sync.** State is local. Dotfile sync is the user's concern.
- **No analytics, no telemetry.** Nothing leaves the machine.
- **No tournament editing once started.** Adding/removing candidates mid-tournament corrupts the math. (Future feature: `clone-with-modifications`.)
- **No real-time leaderboard during judging.** Could bias the user. Standings only on the Results page or via explicit "Show standings" action.
- **No AI agent that judges for you.** The whole point is your taste.
