import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

interface ServerHandle {
  port: number;
  close: () => Promise<void>;
  paths: {
    publicDir: string;
    tournamentsDir: string;
    registryPath: string;
    schemaPath: string;
    logsDir: string;
  };
}

async function startTestServer(tmpRoot: string): Promise<ServerHandle> {
  const registryDir = path.join(tmpRoot, 'registry');
  const tournamentsDir = path.join(tmpRoot, 'tournaments');
  const logsDir = path.join(tmpRoot, 'logs');
  const publicDir = path.join(tmpRoot, 'public');
  const handle = (await startServer({
    port: 0,
    registryDir,
    tournamentsDir,
    logsDir,
    publicDir,
    schemaPath: path.join(repoRoot, 'schemas', 'tournament.schema.json'),
    writeStartupArtifacts: false,
  })) as ServerHandle;
  return handle;
}

function url(server: ServerHandle, p: string): string {
  return `http://127.0.0.1:${server.port}${p}`;
}

function exampleTournament(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'tour-test-0001',
    slug: 'test-tournament',
    title: 'Test tournament',
    kind: 'typography',
    methodology: 'elo-pairwise',
    schemaVersion: 1,
    createdAt: '2026-05-18T10:00:00.000Z',
    candidates: [
      { id: 'p1', label: 'Lora × Inter', serif: 'lora', sans: 'inter' },
      { id: 'p2', label: 'EB Garamond × Source Sans', serif: 'eb-garamond', sans: 'source-sans-3' },
      { id: 'p3', label: 'Cormorant × IBM Plex Sans', serif: 'cormorant', sans: 'ibm-plex-sans' },
      { id: 'p4', label: 'Source Serif × Inter', serif: 'source-serif', sans: 'inter' },
    ],
    config: { kFactors: { early: 40, mid: 24, late: 16 }, minComparisonsPerPair: 3 },
    state: { finished: false, history: [] },
    ...overrides,
  };
}

let tmpRoot: string;
let server: ServerHandle;

beforeEach(async () => {
  tmpRoot = await mkdtemp(path.join(tmpdir(), 'tournaments-test-'));
  server = await startTestServer(tmpRoot);
});

afterEach(async () => {
  await server.close();
  await rm(tmpRoot, { recursive: true, force: true });
});

describe('GET /api/health', () => {
  it('responds with ok=true', async () => {
    const res = await fetch(url(server, '/api/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.app).toBe('tournaments');
  });
});

describe('GET /api/schema', () => {
  it('returns the tournament schema JSON', async () => {
    const res = await fetch(url(server, '/api/schema'));
    expect(res.status).toBe(200);
    const schema = await res.json();
    expect(schema.title).toBe('Tournament');
    expect(schema.$id).toContain('tournament.schema.json');
  });
});

describe('registry round-trip', () => {
  it('registers a file → lists it → fetches it → updates state → reflects new state', async () => {
    // Drop an example file into the temp tournaments dir.
    const filePath = path.join(server.paths.tournamentsDir, 'example.json');
    const tournament = exampleTournament();
    await writeFile(filePath, JSON.stringify(tournament, null, 2), 'utf8');

    // Register it.
    const regRes = await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    expect(regRes.status).toBe(200);
    const { id } = await regRes.json();
    expect(typeof id).toBe('string');

    // Registry list shows it with rich fields.
    const listRes = await fetch(url(server, '/api/registry'));
    const list = await listRes.json();
    expect(list.tournaments).toHaveLength(1);
    const entry = list.tournaments[0];
    expect(entry.id).toBe(id);
    expect(entry.kind).toBe('typography');
    expect(entry.methodology).toBe('elo-pairwise');
    expect(entry.progress).toEqual({ comparisons: 0, pairings: 6, percent: 0 });

    // Fetch the tournament.
    const getRes = await fetch(url(server, `/api/tournament/${id}`));
    expect(getRes.status).toBe(200);
    const got = await getRes.json();
    expect(got.tournament.id).toBe('tour-test-0001');
    expect(got.tournament.state.history).toEqual([]);

    // POST a state update.
    const newState = {
      finished: false,
      history: [
        { leftId: 'p1', rightId: 'p2', choice: 'left' },
        { leftId: 'p3', rightId: 'p4', choice: 'right' },
      ],
    };
    const postRes = await fetch(url(server, `/api/tournament/${id}/state`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: newState }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.progress.comparisons).toBe(2);

    // Fetch again — state reflects the update.
    const getRes2 = await fetch(url(server, `/api/tournament/${id}`));
    const got2 = await getRes2.json();
    expect(got2.tournament.state.history).toHaveLength(2);
    expect(got2.tournament.lastActiveAt).toBeTruthy();

    // File on disk should match.
    const onDisk = JSON.parse(await readFile(filePath, 'utf8'));
    expect(onDisk.state.history).toHaveLength(2);
  });

  it('DELETE /api/registry/:id removes the entry but leaves the file', async () => {
    const filePath = path.join(server.paths.tournamentsDir, 'kept.json');
    await writeFile(filePath, JSON.stringify(exampleTournament(), null, 2), 'utf8');
    const regRes = await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const { id } = await regRes.json();

    const delRes = await fetch(url(server, `/api/registry/${id}`), { method: 'DELETE' });
    expect(delRes.status).toBe(200);

    const listRes = await fetch(url(server, '/api/registry'));
    const list = await listRes.json();
    expect(list.tournaments).toHaveLength(0);

    // File still exists.
    const onDisk = JSON.parse(await readFile(filePath, 'utf8'));
    expect(onDisk.id).toBe('tour-test-0001');
  });
});

describe('POST /api/tournament', () => {
  it('writes a fresh tournament with collision-handled slug and registers it', async () => {
    const t1 = exampleTournament();
    const r1 = await fetch(url(server, '/api/tournament'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(t1),
    });
    expect(r1.status).toBe(201);
    const b1 = await r1.json();
    expect(b1.slug).toBe('test-tournament');

    // Same slug → collision → -2 suffix.
    const t2 = exampleTournament({ id: 'tour-test-0002' });
    const r2 = await fetch(url(server, '/api/tournament'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(t2),
    });
    expect(r2.status).toBe(201);
    const b2 = await r2.json();
    expect(b2.slug).toBe('test-tournament-2');
    expect(b2.filePath).toContain('test-tournament-2.json');

    // Registry has both.
    const list = await (await fetch(url(server, '/api/registry'))).json();
    expect(list.tournaments).toHaveLength(2);
  });
});

describe('error paths', () => {
  it('rejects POST /api/registry with a non-existent path', async () => {
    const res = await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath: '/no/such/place/x.json' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('FILE_NOT_FOUND');
  });

  it('rejects POST /api/registry without a filePath', async () => {
    const res = await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('rejects a non-.json filePath', async () => {
    const txtPath = path.join(server.paths.tournamentsDir, 'not-json.txt');
    await writeFile(txtPath, 'hello', 'utf8');
    const res = await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath: txtPath }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('rejects a schema-invalid file when registering', async () => {
    const filePath = path.join(server.paths.tournamentsDir, 'broken.json');
    await writeFile(filePath, JSON.stringify({ not: 'a tournament' }), 'utf8');
    const res = await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_SCHEMA');
  });

  it('returns 404 for unknown tournament id', async () => {
    const res = await fetch(url(server, '/api/tournament/unknown-id-xyz'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for state POST against unknown id', async () => {
    const res = await fetch(url(server, '/api/tournament/unknown-id-xyz/state'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: { history: [] } }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects unknown API routes', async () => {
    const res = await fetch(url(server, '/api/nope'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects non-GET methods on /api/registry/:id (except DELETE)', async () => {
    const res = await fetch(url(server, '/api/registry/some-id'), { method: 'PATCH' });
    expect(res.status).toBe(405);
  });
});

describe('concurrent state writes', () => {
  it('serializes concurrent POSTs without corrupting the file', async () => {
    const filePath = path.join(server.paths.tournamentsDir, 'concurrent.json');
    await writeFile(filePath, JSON.stringify(exampleTournament(), null, 2), 'utf8');
    const { id } = await (
      await fetch(url(server, '/api/registry'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filePath }),
      })
    ).json();

    // Fire 25 concurrent state updates with different history lengths.
    const updates = Array.from({ length: 25 }, (_, i) => ({
      finished: false,
      history: Array.from({ length: i + 1 }, (_, j) => ({
        leftId: 'p1',
        rightId: 'p2',
        choice: j % 2 ? 'left' : 'right',
      })),
    }));

    const responses = await Promise.all(
      updates.map((state) =>
        fetch(url(server, `/api/tournament/${id}/state`), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ state }),
        }),
      ),
    );
    for (const r of responses) expect(r.status).toBe(200);

    // The file on disk should be parseable and match ONE of the writes.
    const onDisk = JSON.parse(await readFile(filePath, 'utf8'));
    expect(Array.isArray(onDisk.state.history)).toBe(true);
    expect(onDisk.state.history.length).toBeGreaterThanOrEqual(1);
    expect(onDisk.state.history.length).toBeLessThanOrEqual(25);
  });
});

describe('SPA shell', () => {
  it('serves public/index.html on / and /t/:id when present', async () => {
    const indexPath = path.join(server.paths.publicDir, 'index.html');
    await writeFile(indexPath, '<!doctype html><title>SPA shell</title>', 'utf8');

    const rootRes = await fetch(url(server, '/'));
    expect(rootRes.status).toBe(200);
    expect(rootRes.headers.get('content-type')).toContain('text/html');
    expect(await rootRes.text()).toContain('SPA shell');

    const idRes = await fetch(url(server, '/t/some-tournament-id'));
    expect(idRes.status).toBe(200);
    expect(await idRes.text()).toContain('SPA shell');
  });

  it('returns 404 with a friendly message when public/index.html is missing', async () => {
    const res = await fetch(url(server, '/'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toMatch(/npm run build/);
  });
});

describe('progress computation', () => {
  it('returns null percent for slider methodology', async () => {
    const sliderTournament = exampleTournament({
      slug: 'slider-example',
      kind: 'copy',
      methodology: 'slider',
      candidates: [
        { id: 'c1', label: 'A', text: 'Alpha' },
        { id: 'c2', label: 'B', text: 'Beta' },
      ],
      config: { min: 1, max: 10, step: 1 },
      state: { finished: false, history: [{ id: 'c1', score: 7 }] },
    });
    const filePath = path.join(server.paths.tournamentsDir, 'slider.json');
    await writeFile(filePath, JSON.stringify(sliderTournament, null, 2), 'utf8');
    await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const list = await (await fetch(url(server, '/api/registry'))).json();
    const entry = list.tournaments[0];
    expect(entry.progress.percent).toBeNull();
    expect(entry.progress.pairings).toBeNull();
    expect(entry.progress.comparisons).toBe(1);
  });

  it('computes elo-pairwise progress against expected total', async () => {
    const filePath = path.join(server.paths.tournamentsDir, 'elo.json');
    const t = exampleTournament({
      state: {
        finished: false,
        history: Array.from({ length: 9 }, () => ({ leftId: 'p1', rightId: 'p2', choice: 'left' })),
      },
    });
    await writeFile(filePath, JSON.stringify(t, null, 2), 'utf8');
    await fetch(url(server, '/api/registry'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const list = await (await fetch(url(server, '/api/registry'))).json();
    const entry = list.tournaments[0];
    // 4 candidates → 6 pairings × 3 = 18 target; 9/18 = 0.5
    expect(entry.progress).toEqual({ comparisons: 9, pairings: 6, percent: 0.5 });
  });
});
