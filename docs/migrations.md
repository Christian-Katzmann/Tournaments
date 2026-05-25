# Migrations

## Standalone typography app -> Tournaments (one-time)

The seed for the `typography` kind was a standalone Vite app that ran a single
typography comparison. Code moved into `src/lib/kinds/typography/` (renderer,
fonts, content). The judging state — Elo ratings, history, pairings — can be
migrated by the script described below.

### Migrating an in-progress judging session

The standalone app stored its full state in `localStorage` under the key
`besk-typography-tournament-v1`. To carry that state into Tournaments:

1. Open the standalone app in the same browser where you were judging.
2. DevTools -> Application -> Local Storage. Copy the value of
   `besk-typography-tournament-v1` to the clipboard.
3. In the Tournaments project root:

   ```bash
   pbpaste | node scripts/migrate-typography-state.mjs --from -
   ```

   Or save the value to a file and pass `--from path/to/state.json`.

The script writes `tournaments/beskaeftigelse-typography.json`, then registers
it with the running server (`http://localhost:4278/api/registry`). If the
server isn't running, start it (`npm start`) and re-run — the script is
idempotent.

### Fresh seed (no state to migrate)

Run with no arguments:

```bash
node scripts/migrate-typography-state.mjs
```

You get a fresh tournament with all 48 serif x sans pairings at Elo 1500 and an
empty history.

### What the script preserves

- Every pairing's `elo`, `comparisons`, `wins`, `leftShown`, `rightShown`.
- Every history entry's round, timestamp, choice, deltas, decision time.
- Theme (light/dark) and finished flag.

### What it doesn't preserve

- The standalone app's `contentIndex` — Tournaments derives it from
  `history.length % CONTENT.length`, so the next content rotation aligns with
  the new history length. Functionally identical from your eye's perspective.
- The standalone app's `startedAt` — replaced by the new tournament's
  `createdAt`. Original timestamps survive inside each history entry.

### Defensive checks

If a migrated pairing or history entry references a font id that isn't in the
current candidate set, the script prints a warning and drops that entry. The
remaining state is still written. Skim the warnings — if many entries dropped,
the source state may have been hand-edited.
