# 0001 — Single-file tournament state

Status: accepted

## Context

A tournament has a spec (candidates, kind, methodology, settings) and runtime state (comparisons made, Elo ratings, round history). The question is where the state goes.

Options considered:

1. **Spec and state in the same JSON file.** One file is the tournament. Move it, email it, back it up — it works.
2. **Spec in JSON, state in SQLite.** Cleaner separation but now the tournament is two things that must stay in sync, and a single-file export needs a merge step.
3. **Everything in SQLite.** Efficient for queries but opaque. Requires tooling to inspect, import, or share a tournament.

## Decision

Spec and state live in the same JSON file (`tournaments/<slug>.json`). The server does atomic-rename writes. The browser keeps a debounced cache for snappy resume, but every judgment posts to the server, which writes to disk.

## Consequences

- A tournament is fully portable: copy the file, open it on another machine.
- The server must serialize writes per file to avoid race conditions (implemented via per-file lock).
- Large tournaments (thousands of comparisons) will grow the file, but this is bounded — even 10,000 pairwise comparisons fit comfortably in a few MB.
- External tools can bulk-edit tournament files only while the server is stopped.
