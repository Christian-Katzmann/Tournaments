# Agent guide — Tournaments

## Start here

- **What this repo is:** the Tournaments app — a local-first comparison-decision
  tool. Each tournament file under `tournaments/` holds both the spec and the
  state. The `/tournament` skill at `~/Dev/skills/tournament/` is the canonical
  way to author new tournaments; the in-app form is the fallback.
- **Sibling app:** `~/Dev/Projects/Campaigns/`. Same shape (Node HTTP, registry,
  appified). No code is shared. Don't try to factor anything out.
- **Stack:** vanilla Node HTTP server (no framework), Vite + React 19 +
  TypeScript (strict), Tailwind v4, Vitest. Eight kinds × six methodologies.
- **Safest first command:** `git status --short`.
- **Port:** 4278 (Campaigns is 4178). Logs at `~/Library/Logs/Tournaments/`,
  registry at `~/Library/Application Support/Tournaments/registry.json`.

## Operating rules

- Use `npm`, not pnpm or yarn. Source of truth is `package-lock.json`.
- **The schema (`schemas/tournament.schema.json`) is canonical.** It is the
  source of truth for the `/tournament` skill (symlinked from
  `~/Dev/skills/tournament/schemas/`). Any change here ripples to the skill.
  Run the schema test (`npm test`) after edits.
- **Tournament JSON files are atomic-rename writes.** Don't read+modify+write a
  `tournaments/*.json` file from the outside while the app is running — the
  server's per-file lock keeps state POSTs consistent, but external writes can
  race. Stop the server (`npm run desktop:quit`) before bulk-editing.
- **The registry is shared with the running app.** If you edit
  `~/Library/Application Support/Tournaments/registry.json` directly, restart
  the server — it caches nothing but expects atomic shape.
- **Never use an HTTP framework.** Vanilla `http.createServer` + URL parsing
  only. The constraint is part of the contract (mirrors Campaigns).
- **Don't symlink anything in from modelarena.** `bradley-terry.ts`,
  `stability.ts`, `bracket.ts` were copied once; the two repos drift freely.
- **Preserve Christian's in-progress work.** This repo is often dirty.

## Working with Christian

- Christian is an innovator, creator, systems thinker with basic coding
  knowledge. Don't ask him to make low-level code decisions when there's a
  defensible default. Make the call, explain the tradeoff in human terms.
- Choose elegant, senior-quality implementations. Match the existing style.
- Explain outcomes plainly. Keep technical detail useful, not performative.

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
- `schemas/tournament.schema.json` — canonical JSON Schema. Shared by skill.
- `scripts/` — `desktop-*.sh` appify launcher pipeline, `wrapper.swift` WebKit
  shell, `migrate-typography-state.mjs` for the one-time standalone migration.
- `tournaments/` — one JSON file per tournament. Spec + state in the same file.

## Common commands

```bash
npm install              # one time
npm run dev              # Vite at http://localhost:5274 (component dev, not the full app)
npm start                # full app: node server.mjs at http://localhost:4278
npm test                 # Vitest (schema + math + server)
npx tsc -b               # strict typecheck across the project references

npm run desktop:build    # build desktop/Tournaments.app
npm run desktop:install  # copy to ~/Desktop/MyApps/Tournaments.app
npm run desktop:quit     # kill server + wrapper windows (use this, not pkill)
```

Run from the repo root unless a script says otherwise.

## Verification

- Docs-only changes: read the diff and run `git status --short`.
- Frontend changes: `npx tsc -b`, then open the running app and verify the
  feature in the browser. Type-check passes ≠ feature works.
- Server changes: `npm test` (server integration tests run against a random
  port), plus `npx tsc -b`.
- Math changes: `npm test`. Don't ship without unit tests.
- Schema changes: `npm test` (validates the example), plus regenerate the
  in-app form if new shapes appear. Coordinate with the `/tournament` skill.

## Dangerous areas

- **`schemas/tournament.schema.json`** — canonical, symlinked into the skill.
  Backwards-incompatible changes break every existing tournament file. Add a
  field or `oneOf` branch, don't reshape existing ones.
- **`server.mjs` registry + state writes** — atomic-rename and a serial mutation
  queue guard concurrency. Don't add code paths that bypass them.
- **`scripts/wrapper.swift`** — the appified shell. Copied from Campaigns; the
  comments inside it document traps (NFC/NFD pgrep, descendant-walk reattach,
  PATH for Bun/nvm/Volta/mise/asdf, two-stage cleanup). Don't re-derive them.
- **`tournaments/*.json`** — the running app is writing to these. Bulk-edits
  require the server to be down (`npm run desktop:quit`).
- **`~/Library/Application Support/Tournaments/registry.json`** — shared state.
  Restart the server after any external edit.
- **Hardcoded port 4278** — sibling Campaigns owns 4178. Don't move ports.

## What lives outside this repo

- `~/Dev/skills/tournament/` — the `/tournament` skill (symlinked into
  `~/.claude/skills/`, `~/.codex/skills/`, `~/.agents/skills/`).
  Schema and skill kit, including per-kind example JSONs.
- `~/Dev/Playground/besk-typography-tournament/` — the seed standalone app this
  one was migrated from. Don't delete yet; it has reference value while the
  typography tournament is being re-judged.
- `~/Dev/Projects/Campaigns/` — sibling app. Same patterns, different verb.
  Reference for `desktop-*.sh` script updates.
- `~/Dev/ïdea.com/modelarena/` — original source for `bradley-terry`,
  `stability`, `bracket`. **No live coupling**, already copied.

## Durable knowledge

Surface stable, evidenced facts here. Avoid freeform session notes — they rot.
If something is "the way it works now," it belongs in the architecture doc;
if it's "Christian prefers X," it belongs in `~/.claude/AGENTS.md`.
