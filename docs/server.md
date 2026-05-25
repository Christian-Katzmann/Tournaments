# Tournaments server reference

Vanilla `node:http` server. No framework. Port discovery, static serving,
registry, and atomic writes for tournament JSON files.

## Run

```sh
npm start
```

Default port: **4278**. Falls back up to `4278 + 50` if the port is in use.

The active port is written to a platform-specific logs directory (on macOS:
`~/Library/Logs/Tournaments/server.port`), the PID to `server.pid`, and a
startup line to `server.log`. Paired skills discover the server by reading
`server.port`.

The registry lives in the platform-specific app support directory (on macOS:
`~/Library/Application Support/Tournaments/registry.json`) and is initialized
as `[]` on first run.

## Endpoints

All errors follow the shape:

```json
{ "error": { "code": "INVALID_PAYLOAD", "message": "Expected a filePath string." } }
```

Error codes: `INVALID_PAYLOAD`, `INVALID_SCHEMA`, `NOT_FOUND`, `FILE_NOT_FOUND`,
`METHOD_NOT_ALLOWED`, `FORBIDDEN`, `INTERNAL_ERROR`, `PAYLOAD_TOO_LARGE`.

### `GET /api/health`

Liveness probe.

```sh
curl http://localhost:4278/api/health
# -> { "ok": true, "app": "tournaments", "pid": 12345 }
```

### `GET /api/schema`

Returns the full `tournament.schema.json`.

```sh
curl http://localhost:4278/api/schema | jq .title
# -> "Tournament"
```

### `GET /api/registry`

Rich list of all registered tournaments. Each entry carries `id`, `slug`,
`title`, `kind`, `methodology`, `filePath`, `createdAt`, `lastActiveAt`,
`missing`, and `progress: { comparisons, pairings, percent }`.

`progress.percent` is a `0..1` ratio for methodologies with a clear target
(`elo-pairwise`, `bradley-terry`, `bracket-4-seed`, `best-of-n`) and `null` for
`multi-axis` / `slider` (no single completion number makes sense).

```sh
curl http://localhost:4278/api/registry
```

### `POST /api/registry`

Register an existing tournament file. Validates the file against the schema
before adding it.

```sh
curl -X POST http://localhost:4278/api/registry \
  -H 'content-type: application/json' \
  -d '{ "filePath": "/path/to/tournaments/example.json" }'
# -> { "id": "tour-...", "filePath": "/path/to/example.json" }
```

400 on missing/invalid `filePath` or non-`.json` extension. 404 when the file
doesn't exist. 400 with `INVALID_SCHEMA` and a `details.errors` payload when the
file doesn't match the schema.

### `DELETE /api/registry/:id`

Unregister a tournament. **Does not delete the file** — just removes the entry.

```sh
curl -X DELETE http://localhost:4278/api/registry/tour-abcd
# -> { "ok": true, "id": "tour-abcd" }
```

### `GET /api/tournament/:id`

Returns `{ id, filePath, tournament, progress }`. The full tournament JSON is
inlined. Bumps `lastActiveAt` on the registry entry as a side effect.

```sh
curl http://localhost:4278/api/tournament/tour-abcd | jq .tournament.title
```

### `POST /api/tournament/:id/state`

Persist a new judgment state. Body shape: `{ "state": { ... } }`. The server
re-validates the resulting tournament against the schema and atomically renames
the file into place — concurrent POSTs from multiple tabs serialize per-file
without corrupting the JSON.

```sh
curl -X POST http://localhost:4278/api/tournament/tour-abcd/state \
  -H 'content-type: application/json' \
  -d '{ "state": { "finished": false, "history": [] } }'
# -> { "ok": true, "id": "tour-abcd", "lastActiveAt": "...", "progress": {...} }
```

### `POST /api/tournament`

Create a fresh tournament. Validates the body against the schema, writes to
`tournaments/<slug>.json` with `-2` / `-3` / ... suffixes on collision, registers
it, and returns `{ id, filePath, slug }`.

```sh
curl -X POST http://localhost:4278/api/tournament \
  -H 'content-type: application/json' \
  -d @./examples/sample-color-tournament.json
# -> 201 { "id": "tour-...", "filePath": "/path/to/sample-color.json", "slug": "sample-color" }
```

### `GET /` and `GET /t/:id`

Both routes serve `public/index.html`. The SPA hydrates the route client-side
(`/` -> homescreen, `/t/:id` -> tournament view).

Before `npm run build` produces `public/index.html`, these routes return 404
with a friendly message pointing at the build command.

### Static assets

Any non-API GET falls through to `public/`. Path traversal is blocked
(`..`-stripped, scoped to `publicDir`).

## Atomicity & concurrency

Every disk write goes through an `atomicWriteJson(filePath, data)` helper that
writes to a `${filePath}.<pid>.<time>.<rand>.tmp` sibling and `rename`s it into
place. Renames are atomic on POSIX, so a reader either sees the old contents or
the new contents — never a half-written file.

Per-file mutations (`POST /api/tournament/:id/state`) are also serialized with a
per-file in-process queue so multiple tabs hitting the same tournament can't
race even between the `read -> modify -> write` cycle.

Registry mutations (`POST /api/registry`, `DELETE /api/registry/:id`,
`POST /api/tournament`) share a single registry-wide queue.
