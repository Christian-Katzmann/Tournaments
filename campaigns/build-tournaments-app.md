# Build the Tournaments app

> Copy this to your notes. You can also read it from campaigns/build-tournaments-app.md in the repo. Follow it linearly. Each step tells you exactly what to do and what to paste.

**You only have to think when a step surfaces a real decision.** Everything else is mechanical: copy the prompt from the step, paste it into a fresh agent session, watch the receipt land, copy the REVIEW card, paste into Codex, advance.

## Scope

Build the **Tournaments app** — a local-first, generic comparison-decision tool at `~/Dev/Projects/Tournaments/`. It's the sibling of the Campaigns app: registry-backed library of multiple tournaments, switcher, appified to `~/Desktop/MyApps/Tournaments.app`. A tournament is **N candidates of any kind, judged by any methodology** — typography is just the seed example; color, copy, images, code, markdown, ai-output, and freeform are first-class kinds from day one. Backed by the **`/tournament` skill** that scaffolds new tournaments via a small kit (schema + scaffold script + per-kind templates). Done = the typography tournament I built tonight runs inside Tournaments.app as `kind=typography`, plus at least one second-kind tournament works end-to-end (logo bracket or color palette).

## Context (locked decisions)

- **Pattern:** sibling to Campaigns. Same shape: local Node HTTP server, registry at `~/Library/Application Support/Tournaments/registry.json`, port persisted at `~/Library/Logs/Tournaments/server.port`, frontend served from `public/`, appified via `/appify`. Port: 4278 (Campaigns' 4178 + 100).
- **Frontend stack:** Vite + React + TypeScript + Tailwind v4. Same as tonight's typography tournament.
- **Server stack:** Vanilla Node.js HTTP, no framework. Mirror `~/Dev/Projects/Campaigns/server.mjs` (~377 lines).
- **State model:** single JSON file per tournament at `<repo>/tournaments/<slug>.json` — spec AND state in the same file. Source of truth is the file; browser keeps a localStorage cache for snappy resume.
- **Kinds (closed at launch, extensible later):** `typography | color | copy | images | code | markdown | ai-output | freeform`.
- **Methodologies (closed at launch):** `elo-pairwise | bradley-terry | bracket-4-seed | best-of-n | multi-axis | slider`.
- **Math reuse from modelarena:** **one-way copy** of `bradley-terry.ts`, `stability.ts`, bracket logic from `~/Dev/ïdea.com/modelarena/`. Zero ongoing coupling — after copy, the two repos can drift freely.
- **Elo + matchmaking:** port from `~/Dev/Playground/besk-typography-tournament/src/lib/{elo,matchmaking}.ts`. Already proven tonight (adaptive K, coverage/stabilization/refinement phases, counterbalance, no-back-to-back).
- **Schema is shared between app and skill:** the canonical `schemas/tournament.schema.json` lives in the Tournaments repo. The `/tournament` skill symlinks it. No schema duplication.
- **Hold-to-isolate UX is core:** `1` / `2` keys (also UI buttons under each card) hide the non-focus side and dim chrome to 0.18 opacity. Verified working in the typography tournament tonight.
- **Voting UI in modelarena:** **reference only**. Don't port the React components — redesign per Tournaments' visual language (neutral chrome, generous padding, no border on cards, subtle bg-card tint).
- **Migration of the typography tournament:** its content templates (Danish), font registry, and renderer logic become the `typography` kind's implementation. The user's in-progress judging session migrates by exporting their browser's localStorage and seeding a new tournament file. Manual the first time — automate later if needed.
- **No multi-user, no cloud, no telemetry.** Local only.

## How prompts work in this campaign

Each step activates a skill or runs a command and pastes a short prompt. The prompt provides only what the agent cannot know on its own:

- **Scope** — the specific thing this run is about.
- **Required reading** — file paths the agent must read first.
- **Output target** — where the result goes.
- **Open questions** — what to surface, not assume.

`<UPPERCASE_TOKENS>` are user-fillable placeholders. The Campaigns app shows an editable bar in the prompt card for them; copies use the substituted text.

**`<STEP>` and `<PHASE>` are reserved.** They appear only in the review prompts below — the app substitutes them automatically when you copy from a step's REVIEW card or a phase's PHASE N REVIEW card. Don't use them as user-fillable placeholders elsewhere.

## Review protocol

For a once-through campaign, the implementer is the worst person to grade their own work. After Claude lands a batch and writes the receipt, **open a fresh Codex session inside the repo and copy this step's REVIEW card** (the app fills `<STEP>` automatically):

```text
Run /karpathy-coder on Step <STEP>.

Plan: plans/active/build-tournaments-app/
Campaign (use to resolve <STEP> to a batch name): campaigns/build-tournaments-app.md

Read /Users/christiankatzmann/Dev/skills/karpathy-coder/SKILL.md and follow it.

Resolve the batch by reading the campaign markdown — find the heading `## Step <STEP> — <BATCH_NAME>` and use that batch name. Then:
- Receipt: plans/active/build-tournaments-app/receipts/<batch-name>.md
- Verdict output: plans/active/build-tournaments-app/receipts/<batch-name>.review.md

Inspect the actual git diff against the last commit before this batch — do not trust the receipt's "Changes Made" summary. If you cannot determine the right git range, ask before proceeding.

Be honest. Lean. APPROVED if the criteria are met and there are no obvious shortcuts. NEEDS WORK if any criterion didn't actually land or the implementer cut corners. Don't pad with "things to consider in future batches."

Use Codex GPT-5.5 with xhigh reasoning effort.
```

**Verdict-to-action mapping (single batch):**

- **APPROVED** → check the step in the campaign, move to the next batch.
- **NEEDS WORK** → reopen the same batch in a fresh Claude Code session; paste a follow-up prompt that points Claude at `<batch>.review.md` and asks it to close the gaps; re-review when done. Don't check the step yet.

### Phase-level review (run at the end of each phase)

Per-batch reviews catch per-batch laziness. A phase-level review catches **cross-batch shortcuts** — a primitive set up in one batch and silently bypassed by another, intent claimed but not delivered when read across batches. Run this once a phase finishes (every step in the phase shows APPROVED single-batch verdict). Open a fresh Codex session inside the repo and **copy the PHASE N REVIEW card** at the end of the phase (the app fills `<PHASE>` automatically):

```text
Run /karpathy-coder on Phase <PHASE>.

Plan: plans/active/build-tournaments-app/
Campaign (use to resolve Phase <PHASE> to its batches): campaigns/build-tournaments-app.md

Read /Users/christiankatzmann/Dev/skills/karpathy-coder/SKILL.md and follow it (phase mode).

Resolve the batches: in the campaign markdown, find `### Phase <PHASE> — <name>` and list every `## Step X.Y — <batch-name>` underneath it. Each step's heading names one batch.

For each batch:
- Read its acceptance criteria, receipt, and prior .review.md if present.

Inspect the cumulative git diff across all batches in the phase. If you cannot determine the right git range, ask before proceeding.

Save the verdict to plans/active/build-tournaments-app/receipts/phase-<PHASE>.review.md.

Be honest. Lean. APPROVED if the phase delivered its stated intent and every batch cleared its acceptance criteria, with no cross-batch regressions. NEEDS WORK if any batch's criteria didn't actually land or a primitive set up in one batch was silently bypassed by another.

Use Codex GPT-5.5 with xhigh reasoning effort.
```

**Verdict-to-action mapping (phase):**

- **APPROVED** → check the phase's `Final review — Phase N` checkbox in the progress checklist (or click "Close Phase N" under the phase review card). Advance to the next phase.
- **NEEDS WORK** → reopen the named batches, close the gaps, re-run the phase review. Don't advance until APPROVED.

## Progress checklist

### Phase 1 — Foundation

- [x] Step 1.1 — Scaffold project and JSON schema
- [x] Final review — Phase 1

### Phase 2 — Math core and backend

- [x] Step 2.1 — Math libraries with unit tests
- [x] Step 2.2 — HTTP server, registry, REST endpoints
- [x] Final review — Phase 2

### Phase 3 — Kind system

- [x] Step 3.1 — Kind framework and four simple kinds (typography, color, copy, images)
- [x] Step 3.2 — Four special-handling kinds (code, markdown, ai-output, freeform)
- [x] Final review — Phase 3

### Phase 4 — Tournament UI

- [x] Step 4.1 — Full tournament experience (comparison shell, isolation, welcome, results)
- [x] Final review — Phase 4

### Phase 5 — Library and routing

- [x] Step 5.1 — Homescreen, routing, in-app create-tournament flow
- [x] Final review — Phase 5

### Phase 6 — /tournament skill

- [x] Step 6.1 — Skill kit and end-to-end acceptance test
- [x] Final review — Phase 6

### Phase 7 — Migration and polish

- [x] Step 7.1 — Migrate typography, appify, docs
- [x] Final review — Phase 7

## Step 1.1 — Scaffold project and JSON schema

Stand up the skeleton AND the schema in one batch. The two are tightly coupled — the schema needs the project structure to live in, and the project skeleton is meaningless without the contract it serves.

```text
SCOPE: Scaffold the Tournaments project skeleton plus the canonical JSON schema.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md (the entire doc — it's the source of truth)
2. /Users/christiankatzmann/Dev/Projects/Campaigns/server.mjs — mirror its HTTP shape, port discovery, registry patterns
3. /Users/christiankatzmann/Dev/Projects/Campaigns/package.json — mirror desktop:* script naming
4. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/{vite.config.ts,package.json,tsconfig.app.json,src/index.css} — Vite + Tailwind v4 wiring is solved here
5. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/src/lib/types.ts — port the spirit of Pairing/TournamentState

OUTPUT (all under /Users/christiankatzmann/Dev/Projects/Tournaments/):
- package.json — name "tournaments", scripts: dev, build, start, test, desktop:icons, desktop:build, desktop:install, desktop:quit
- vite.config.ts — React + Tailwind v4 plugin, build output to public/
- tsconfig.{json,app,node}.json with strict mode
- server.mjs skeleton (~80 lines): vanilla Node HTTP, port discovery (default 4278), persists port+pid to ~/Library/Logs/Tournaments/, serves public/ as static, placeholder /api/health
- src/main.tsx + src/App.tsx skeleton — renders "Tournaments" heading
- src/index.css — Tailwind v4 import + the typography app's neutral grayscale CSS variables
- schemas/tournament.schema.json — JSON Schema draft 2020-12 with: id, slug, title, kind, methodology, schemaVersion, createdAt, candidates[] (per-kind oneOf), config{} (per-methodology oneOf), state{}. All eight kinds and six methodologies represented.
- schemas/README.md — one paragraph per kind explaining its candidate shape
- tournaments/example-typography.json — one valid example
- src/lib/__tests__/schema.test.ts — Vitest test that loads the example and validates with ajv (add ajv as devDependency)
- .gitignore for node_modules, dist, .env, .DS_Store

ACCEPTANCE:
- `npm install` succeeds. `npm run dev` starts Vite at port 5274. `npm start` runs server.mjs and writes server.{port,pid,log} files. `npm test` passes the schema test. `npx tsc -b` is clean.
- The example tournament validates against the schema. The schema rejects obvious bad shapes (missing kind, wrong methodology, candidates of wrong shape for their kind).

DON'T:
- Use any HTTP framework. Vanilla Node HTTP only.
- Pull in icon, animation, or UI component libraries. None are needed at this stage.
- Skip TypeScript strict mode.

OPEN QUESTIONS:
- How should state evolve over schema versions? The schemaVersion field exists; surface in the receipt whether you've reserved a migration path or assumed forward-only.
```

## Step 2.1 — Math libraries with unit tests

Pure logic, no UI, no server. All five libraries in one batch — they're conceptually the "math core" and share a destination directory.

```text
SCOPE: Bring all math libraries into src/lib/, namespaced and tested. One-way copy from modelarena; clean port from typography app.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md ("What we copy from modelarena")
2. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/src/lib/{elo,matchmaking}.ts — port these directly
3. /Users/christiankatzmann/Dev/ïdea.com/modelarena/src/server/bradley-terry.ts — copy as-is, strip non-portable imports
4. /Users/christiankatzmann/Dev/ïdea.com/modelarena/src/lib/stability.ts — copy as-is
5. /Users/christiankatzmann/Dev/ïdea.com/modelarena/src/lib/tournament.ts — extract pure bracket functions (sampleSeed, coinFlip, nextBattle, advancerFor, finalRanking) into lib/bracket.ts

OUTPUT (under /Users/christiankatzmann/Dev/Projects/Tournaments/src/lib/):
- elo.ts — adaptive-K Elo (verbatim port)
- matchmaking.ts — coverage/stabilization/refinement phases, counterbalance, no-back-to-back (verbatim port)
- bradley-terry.ts — copy from modelarena, minimal types
- stability.ts — copy from modelarena
- bracket.ts — extracted from modelarena's tournament.ts
- index.ts — barrel export
- __tests__/{elo,matchmaking,bradley-terry,bracket,stability}.test.ts — at least one happy-path test + one obvious edge case per module (Elo with 0 comparisons, bracket with all ties, stability tier boundaries, etc.)

ACCEPTANCE:
- `npm test` passes all new tests.
- No imports from `~/Dev/ïdea.com/...` anywhere — the copy is one-time.
- Each library is a pure module with no React/DOM dependencies.
- `npx tsc -b` is clean.

DON'T:
- Symlink anything from ïdea.com. Copy, then sever.
- "Improve" the math semantics. Preserve as-is.
- Pull in code from modelarena beyond the named files (no Drizzle, no OpenRouter, no server-specific helpers).
```

## Step 2.2 — HTTP server, registry, REST endpoints

The full backend surface in one batch. Server + registry + endpoints + integration tests are tightly coupled — split them and you get partial implementations that don't compose.

```text
SCOPE: Build the full Node.js HTTP backend: server, registry, all REST endpoints, integration tests.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md ("App architecture" and "Server contract")
2. /Users/christiankatzmann/Dev/Projects/Campaigns/server.mjs — mirror end-to-end: port discovery, static serving, registry, MIME types, error handling, atomic writes
3. /Users/christiankatzmann/Dev/Projects/Tournaments/schemas/tournament.schema.json from Step 1.1

OUTPUT:
- Expand server.mjs to implement the full REST surface:
  - GET / and GET /t/:id → serve public/index.html (SPA shell)
  - GET /api/health → 200 with simple JSON
  - GET /api/schema → returns tournament.schema.json content
  - GET /api/registry → rich entries: { id, slug, title, kind, methodology, progress: { comparisons, pairings, percent | null }, lastActiveAt }
  - POST /api/registry → { filePath }: validate file against schema, generate id, add to registry, return { id }
  - DELETE /api/registry/:id → remove from registry (don't delete file)
  - GET /api/tournament/:id → full tournament JSON
  - POST /api/tournament/:id/state → accept state subobject, atomic write to file
  - POST /api/tournament → accept fresh tournament JSON, validate, write to tournaments/<slug>.json with -2/-3 collision handling, register, return id
  - All errors as structured JSON: `{ error: { code, message } }` with appropriate 400/404/500
- ~/Library/Application Support/Tournaments/registry.json initialized as `[]` on first run
- ~/Library/Logs/Tournaments/{server.port, server.pid, server.log} written on startup
- src/__tests__/server.test.ts — start server on random port, round-trip: register → fetch → POST state → fetch shows new state. Cover error cases: invalid path, unknown id, schema-invalid file.
- docs/server.md — one-page reference with curl examples for every endpoint

ACCEPTANCE:
- All Vitest server tests pass.
- Concurrent state POSTs don't corrupt the file (atomic rename verified).
- Progress field computes meaningfully for elo-pairwise; returns null for methodologies without a clear target (e.g. slider).
- `npx tsc -b` clean.

DON'T:
- Use any HTTP framework. Vanilla `http.createServer` + URL parsing only.
- Skip atomic writes — concurrent state updates from multiple tabs are realistic.
- Trust the file path in POST /api/registry without verifying it exists and has a valid extension.
- Add endpoints not in the architecture doc. Surface as an open question instead.
```

## Step 3.1 — Kind framework and four simple kinds (typography, color, copy, images)

The Kind abstraction plus the four kinds that share the basic renderer pattern. Typography proves the abstraction with the seed case; color/copy/images validate that simpler kinds also fit.

```text
SCOPE: Design the Kind abstraction. Implement typography, color, copy, and images kinds.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md ("Tournament kind" axis)
2. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/src/components/ComparisonCard.tsx — existing typography renderer
3. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/src/lib/{fonts,content}.ts — Danish content templates and font registry
4. /Users/christiankatzmann/Dev/Projects/Tournaments/schemas/tournament.schema.json

OUTPUT (under src/lib/kinds/):
- types.ts — `interface Kind<C extends Candidate>` with: id, displayName, candidateSchema fragment, Renderer (React component), summarize(candidate) for list display
- registry.ts — Map<KindId, Kind> with helpers: getKind(id), allKinds()
- typography/ — full implementation: index.ts (registers), renderer.tsx (port ComparisonCard), content.ts (port Danish templates), fonts.ts (port font registry)
- color/renderer.tsx — large swatch + hex + name + sample text auto-contrast (black or white)
- copy/renderer.tsx — text on a canvas with three roles (headline, paragraph, CTA); renderer applies neutral typography that doesn't compete with the candidate text
- images/renderer.tsx — fitted image, object-fit: contain, fixed aspect container, optional label below
- For each kind: index.ts (registers), candidate JSON Schema fragment merged into schemas/tournament.schema.json
- src/components/KindRenderer.tsx — generic wrapper that routes (kind, candidate) → the kind's Renderer
- src/dev/kinds.tsx — dev preview page showing every implemented kind with sample candidates

ACCEPTANCE:
- `npm run dev` + visiting /dev/kinds.tsx shows all four kinds rendering correctly.
- Typography renders Danish content cleanly with the right font pairings.
- The schema accepts well-formed tournaments of any of the four new kinds.
- `npx tsc -b` clean. `npm test` (schema validation) still passes.

DON'T:
- Build the comparison shell here — these are renderers only. Padding, isolation, card chrome belong in Phase 4.
- Hardcode kind IDs anywhere — always go through registry.
- Add color theory features (contrast scoring, color-blind sims), image lightboxes, or copy-style guides. Keep renderers minimal.
- Skip the /dev/kinds.tsx page. Future kinds need an easy preview.
```

## Step 3.2 — Four special-handling kinds (code, markdown, ai-output, freeform)

The four kinds with unique concerns — syntax highlighting, sanitization, sandboxing. Bundled together because they all share the "what can go wrong with rendering user-supplied content" risk profile, but kept separate from the simpler kinds in 3.1 because their review focus is different (security and sanitization vs. layout).

```text
SCOPE: Implement code, markdown, ai-output, and freeform kinds with their security-sensitive rendering concerns.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md ("Axis 1 — Tournament kind" table)
2. /Users/christiankatzmann/Dev/Projects/Tournaments/src/lib/kinds/types.ts (interface from Step 3.1)
3. /Users/christiankatzmann/Dev/Projects/Tournaments/src/lib/kinds/typography/ as the reference

OUTPUT (under src/lib/kinds/):
- code/renderer.tsx — syntax-highlighted code block. Pick shiki or highlight.js and justify in the receipt (shiki: lower noise, heavier; highlight.js: smaller, fuzzier). Language from candidate.language. Monospace fallback if highlighter fails.
- markdown/renderer.tsx — CommonMark via marked or remark-rehype. Sanitize output. No JS, no inline scripts.
- ai-output/renderer.tsx — candidate.response in a panel, optional candidate.prompt above in a faint header.
- freeform/renderer.tsx — sandboxed iframe (`<iframe sandbox="allow-same-origin" srcDoc={candidate.html}>`). Document the security constraints loudly in the renderer's source. Trusted local content only.
- Update schemas/tournament.schema.json with the four new candidate shapes.
- Extend src/dev/kinds.tsx with sample candidates for the new kinds.

ACCEPTANCE:
- All eight kinds render on /dev/kinds.tsx.
- Freeform iframe is sandboxed correctly: `<script>alert(1)</script>` in srcDoc does NOT execute.
- Markdown rendering doesn't execute embedded HTML.
- `npx tsc -b` clean.

DON'T:
- Use any unsanitized HTML rendering pattern (dangerouslySetInnerHTML without sanitization).
- Pull in heavy markdown extensions (Mermaid, math). Plain CommonMark suffices.
- Make freeform unsandboxed for any reason. If a use case appears that needs it, that's a separate decision.

OPEN QUESTIONS:
- Should freeform's iframe also disable network access via a more restrictive sandbox list? Decide based on whether local HTML samples may legitimately reference local images via http://localhost:4278/...
```

## Step 4.1 — Full tournament experience (comparison shell, isolation, welcome, results)

The user-facing tournament flow as a single coherent batch. Welcome, tournament screen with hold-to-isolate, and results are all tied together via App-level routing and shared state — splitting them creates half-working UIs that need extra coordination steps.

```text
SCOPE: Build the full tournament experience: comparison shell, hold-to-isolate UX, welcome screen, results screen. All routed via App.tsx and sharing state via the useTournament hook.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md ("Tournament UI" + "Pattern from the typography tournament")
2. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/src/components/{TournamentScreen,ComparisonCard,WelcomeScreen,ResultsScreen}.tsx — the proven layouts and isolation logic (search TournamentScreen.tsx for `isolating` and `holdProps`)
3. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/src/hooks/{useTournament,useKeyboard}.ts — adapt these
4. /Users/christiankatzmann/Dev/Projects/Tournaments/src/components/KindRenderer.tsx (from Step 3.1)
5. /Users/christiankatzmann/Dev/Projects/Tournaments/src/lib/stability.ts — for confidence tier display

OUTPUT:
- src/hooks/useTournament.ts — fetches tournament from /api/tournament/:id on mount; persists state via POST to /api/tournament/:id/state on every choice (debounce ~200ms to avoid hammering). Mirror the typography app's hook semantics for undo, skip, fatigue.
- src/hooks/useKeyboard.ts — port from typography app.
- src/components/ComparisonCard.tsx — wraps KindRenderer with card chrome: subtle bg-card, generous padding (~80px all sides), no visible border (matches typography app's final layout).
- src/components/TournamentScreen.tsx — shell (header round counter + fatigue hint, main two-card layout, footer with Skip/Undo/Theme/Results + keyboard hint). Hold-to-isolate built in from the start: `1` / `2` keys + per-card "Hold to isolate · 1/2" buttons. Chrome dims to 0.18 while isolating. 150ms transitions. Triggering a choice clears isolation. Window blur clears isolation.
- src/components/TournamentWelcomeScreen.tsx — per-tournament: shows title, kind, methodology. Resume vs Begin based on history length. Methodology-aware judging guidance ("Judge the pairing as a whole" for pairwise; etc.).
- src/components/ResultsScreen.tsx — top 3 candidates (or pairings for elo-pairwise), per-attribute aggregated rankings via Kind.summarize, obvious losers, stability tier display (directional < 50 ≤ preliminary < 200 ≤ stable per modelarena/stability.ts), copy-paste markdown summary.
- src/App.tsx — single-page state machine routing between Welcome / Tournament / Results. Hydrates from /t/:id URL.

ACCEPTANCE:
- Visiting /t/<id> for a typography tournament loads the tournament, renders side-by-side cards with Danish content, accepts ← / → / clicks, persists state to the server (verify by checking the file on disk).
- Holding `1` makes the right card fade to opacity 0 and chrome to 0.18. Releasing restores. Same for `2`. Buttons under each card mirror the keyboard behavior.
- Welcome screen shows kind-specific messaging via Kind.displayName.
- Results screen displays correctly after a few rounds and shows the correct stability tier.
- Refresh resumes cleanly from the file's persisted state.

DON'T:
- Implement the homescreen, multi-tournament navigation, or in-app create flow. That's Step 5.1.
- Hardcode any kind-specific copy in the screens. All kind-specific text goes through Kind.displayName / Kind.summarize.
- Show rankings before there's enough data — use the stability tier explicitly.
- Add click-to-toggle isolation. Hold-only — toggle creates sticky state.
```

## Step 5.1 — Homescreen, routing, in-app create-tournament flow

The library view + routing + the in-app alternative to the /tournament skill. Cohesive batch because the homescreen is meaningless without routing, and the create flow is what makes the empty-state functional.

```text
SCOPE: Build the homescreen, real routing, and the in-app create-tournament flow.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md ("Homescreen UX")
2. /Users/christiankatzmann/Dev/Projects/Campaigns/public/ — how the sibling library page is built (mirror the spirit, not the specifics)
3. The /api/registry and /api/tournament endpoints from Step 2.2

OUTPUT:
- Pick a lightweight routing approach (wouter, react-router, or plain hash routing). Justify in the receipt. Routes: `/` (home), `/t/:id` (tournament), `/new` (create flow).
- src/components/HomeScreen.tsx — list view of all registered tournaments: title, kind tag, methodology tag, progress indicator (methodology-appropriate), last-active timestamp. Sort: most-recently-active first.
- src/components/TournamentListItem.tsx — single row, click-through to /t/:id. Keep it tight; multiple visible at once beats each being beautiful.
- src/components/NewTournamentForm.tsx — minimal form: pick kind, pick methodology (filtered by which methodologies make sense for that kind — images: bracket/elo-pairwise/best-of-n; not slider), title, kind-specific candidates input (textarea one-per-line for simple kinds, file picker for images, etc.). On submit: POST to /api/tournament.
- Empty state on home: brief copy explaining how to create the first tournament (point at /tournament skill or /new).
- Browser back/forward works. Refresh on any URL resumes correctly.

ACCEPTANCE:
- Loading / shows the registry as a list.
- Creating a tournament via /new produces a file at tournaments/<slug>.json, registers it, and immediately plays at /t/:id.
- Clicking a row navigates and the URL changes.
- Refreshing /t/:id resumes from the file's state.

DON'T:
- Add search, archiving, favoriting, or tagging. The list will be small for a long time.
- Build a sophisticated kind-specific form. The /tournament skill is the polished path; the in-app form is for "I don't want to drop to a chat session."
```

## Step 6.1 — /tournament skill kit and end-to-end acceptance test

Build the skill kit AND prove it works in one batch. The acceptance test is the only honest measure of whether the kit is complete — splitting them risks shipping a kit that "looks right" but fails the test.

```text
SCOPE: Build the /tournament skill at ~/Dev/skills/tournament/ with its kit, then run the kit-the-skill acceptance test verbatim.

REQUIRED READING:
1. /Users/christiankatzmann/.claude/skills/campaign-planner/{SKILL.md,bin/create-campaign.sh,templates/campaign-template.md} — the canonical sibling pattern
2. /Users/christiankatzmann/Dev/Projects/Tournaments/ARCHITECTURE.md ("The /tournament skill" section)
3. /Users/christiankatzmann/Dev/Projects/Tournaments/schemas/tournament.schema.json — the canonical schema we'll symlink

OUTPUT (at /Users/christiankatzmann/Dev/skills/tournament/):
- SKILL.md — describes the skill: trigger phrases, distillation rules (what conversational hints map to which kind, which methodology), 2-3 clarifying-question patterns, slug rules, file path, server registration. Anti-patterns to avoid (don't anchor on typography).
- schemas/tournament.schema.json — SYMLINK (ln -s) to /Users/christiankatzmann/Dev/Projects/Tournaments/schemas/tournament.schema.json
- templates/{typography,color,copy,images,code,markdown,ai-output,freeform}.example.json — one valid example per kind, each a complete tournament JSON ready to fill in
- bin/create-tournament.sh — mirror create-campaign.sh: takes slug + project root abs path, reads JSON on stdin, validates against schema (use ajv-cli or tiny Node validator), writes to <root>/tournaments/<slug>.json with collision handling, POSTs to localhost:4278/api/registry, prints PATH=/ID=/URL= trailer.
- Symlinks: ~/.claude/skills/tournament, ~/.codex/skills/tournament, ~/.agents/skills/tournament — all → ~/Dev/skills/tournament

ACCEPTANCE TEST (run this exact test, document in plans/active/build-tournaments-app/receipts/6.1-acceptance.md):
- Place three throwaway logo PNGs in /tmp/.
- In a fresh Claude session, invoke: `/tournament — compare these 3 logo PNGs at /tmp/logo-a.png, /tmp/logo-b.png, /tmp/logo-c.png`.
- The skill should ask at most one clarifying question (probably methodology choice).
- It writes the tournament JSON, validates, registers, returns a clickable URL.
- Open the URL. Verify: tournament loads, images render, hold-to-isolate works, choices persist to disk, results page works.
- Receipt documents: prompt used, clarifying question (if any), JSON written, URL, screenshots.

ACCEPTANCE:
- All four kit-the-skill criteria pass:
  1. JSON validates against the schema
  2. File lands at the right path with collision handling
  3. Tournament is registered with the running server
  4. The URL opens a working tournament
- If any criterion fails, the kit is incomplete — fix the gap before approving.

DON'T:
- Duplicate the schema instead of symlinking. Single source of truth is the whole point.
- Hardcode the Tournaments project root in the skill. Read from a constant in SKILL.md or accept as argument.
- Bundle Node binaries or heavy dependencies. Plain bash + curl + a tiny Node validator.
- Use the typography tournament for the acceptance test. The point is proving a SECOND kind works end-to-end.
```

## Step 7.1 — Migrate typography, appify, docs

The final batch: migrate the typography tournament from the standalone app, appify the result, write the docs that make the project pleasant to return to. One step because each piece is small and they share the "make this real" theme.

```text
SCOPE: Migrate the standalone typography tournament into Tournaments as the kind=typography seed, appify Tournaments.app, write the docs.

REQUIRED READING:
1. /Users/christiankatzmann/Dev/Playground/besk-typography-tournament/ — the source app
2. /Users/christiankatzmann/Dev/Projects/Tournaments/src/lib/kinds/typography/ (from Step 3.1)
3. /Users/christiankatzmann/Dev/Projects/Campaigns/{desktop/,scripts/desktop-*.sh} — the appify pattern for the sibling app
4. /Users/christiankatzmann/.claude/skills/appify/SKILL.md
5. /Users/christiankatzmann/Dev/ïdea.com/modelarena/AGENTS.md — for the spirit of the AGENTS.md to write (without the ADX harness)

WHAT TO DO:

1. **Migrate typography state.** Ask the user: do you have an in-progress judging session in the standalone typography app? If yes, get them to export their browser's localStorage value for `besk-typography-tournament-v1` (Dev Tools → Application → localStorage → copy). Build scripts/migrate-typography-state.mjs that transforms the localStorage JSON to a fresh tournament file at tournaments/beskaeftigelse-typography.json with kind=typography, methodology=elo-pairwise, all 48 pairings, history preserved. If no state to migrate, produce a fresh tournament with the same candidates and empty state. Register with the server.

2. **Appify.** Invoke /appify on the Tournaments project. App name "Tournaments", slug "tournaments". Confirm the launcher starts Node server, waits for port, opens browser to localhost:4278. Add an icon (simple custom SVG at assets/icon-source.svg — stylized bracket or pairing motif, neutral). npm run desktop:install copies Tournaments.app to ~/Desktop/MyApps/. Verify: double-click → app opens → server starts → browser shows homescreen with the typography tournament listed. Cmd+Q quits cleanly (no orphan node processes).

3. **Documentation.**
   - README.md — top-level: what Tournaments is, how to start the server, how to create a tournament (skill + in-app form), where state lives, sibling-to-Campaigns relationship.
   - docs/kinds.md — one paragraph per kind.
   - docs/methodologies.md — one paragraph per methodology.
   - docs/development.md — npm scripts, common gotchas.
   - AGENTS.md — operating rules for future agents: stack, conventions, where things live, dangerous areas (registry shared with running app, schema is canonical, atomic state writes). Mirror modelarena/AGENTS.md spirit without ADX.
   - docs/migrations.md — short note on the standalone-app → Tournaments migration.

ACCEPTANCE:
- ~/Desktop/MyApps/Tournaments.app exists. Clicking opens to homescreen with the typography tournament visible and clickable.
- The user can resume judging from the exact pairing they stopped at in the standalone app, with the same Elo ratings and history.
- All 48 pairings show up correctly. Hold-to-isolate works in the appified shell.
- Closing the app quits cleanly (verify: no orphan node processes after Cmd+Q).
- A fresh agent can read README.md + AGENTS.md and work in the repo without re-exploring.

DON'T:
- Delete the standalone typography app yet. Keep it until migration is verified across a few sessions.
- Try to migrate the entire Vite project — only the tournament data. Code already moved in Step 3.1.
- Generate ADX harness files. User will run /adx-forensic later if they want.
- Write a marketing pitch in the README. Local-only software for one user.
- Pad docs to look serious. Each page earns its line count.

OPEN QUESTIONS:
- If migrated state references fonts that aren't on the current candidate list (defensive check), drop those pairings or surface a warning? Default to surfacing a warning, leaving the user to decide.
```
