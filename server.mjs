import { randomUUID } from 'node:crypto';
import { createReadStream, readdirSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 4278;
const MAX_PORT_OFFSET = 50;
const MAX_BODY_BYTES = 5_000_000;

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.map', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

const ErrorCode = {
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_SCHEMA: 'INVALID_SCHEMA',
  NOT_FOUND: 'NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
};

/**
 * Start the Tournaments HTTP server.
 *
 * Returns { server, port, close, paths } so tests can run multiple
 * isolated instances on random ports with temp directories.
 */
export async function startServer(options = {}) {
  const requestedPort = options.port ?? Number(process.env.PORT ?? DEFAULT_PORT);
  const repoRoot = options.repoRoot ?? __dirname;
  const publicDir = options.publicDir ?? path.join(repoRoot, 'public');
  const tournamentsDir = options.tournamentsDir ?? path.join(repoRoot, 'tournaments');
  const schemaPath = options.schemaPath ?? path.join(repoRoot, 'schemas', 'tournament.schema.json');
  const registryDir =
    options.registryDir ?? path.join(homedir(), 'Library', 'Application Support', 'Tournaments');
  const registryPath = path.join(registryDir, 'registry.json');
  const logsDir = options.logsDir ?? path.join(homedir(), 'Library', 'Logs', 'Tournaments');
  const portFile = path.join(logsDir, 'server.port');
  const pidFile = path.join(logsDir, 'server.pid');
  const logFile = path.join(logsDir, 'server.log');
  const writeStartupArtifacts = options.writeStartupArtifacts ?? true;

  await Promise.all([
    mkdir(registryDir, { recursive: true }),
    mkdir(tournamentsDir, { recursive: true }),
    mkdir(publicDir, { recursive: true }),
  ]);
  await initializeRegistryIfMissing(registryPath);

  const schemaJson = JSON.parse(await readFile(schemaPath, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validateTournament = ajv.compile(schemaJson);

  // Serial mutation queue for the registry — POST/DELETE can race.
  let registryQueue = Promise.resolve();
  const mutateRegistry = (fn) => {
    const next = registryQueue.then(async () => {
      const registry = await readRegistry(registryPath);
      const result = await fn(registry);
      await atomicWriteJson(registryPath, registry);
      return result;
    });
    registryQueue = next.catch(() => {});
    return next;
  };

  // Per-file write queue so concurrent state POSTs serialize per tournament.
  const fileLocks = new Map();
  const withFileLock = (filePath, fn) => {
    const prev = fileLocks.get(filePath) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    fileLocks.set(
      filePath,
      next.catch(() => {}),
    );
    return next;
  };

  const ctx = {
    publicDir,
    tournamentsDir,
    schemaPath,
    schemaJson,
    registryPath,
    validateTournament,
    mutateRegistry,
    withFileLock,
  };

  const server = createServer((request, response) => {
    handleRequest(ctx, request, response).catch((error) => {
      console.error('Tournaments: unhandled error', error);
      if (!response.headersSent) {
        sendError(response, 500, ErrorCode.INTERNAL_ERROR, 'Tournaments server error');
      } else {
        response.end();
      }
    });
  });

  const port = await listenWithFallback(server, requestedPort);

  if (writeStartupArtifacts) {
    await mkdir(logsDir, { recursive: true });
    await Promise.all([
      writeFile(portFile, String(port), 'utf8'),
      writeFile(pidFile, String(process.pid), 'utf8'),
      writeFile(
        logFile,
        `[${new Date().toISOString()}] listening on ${port} pid ${process.pid}\n`,
        'utf8',
      ),
    ]);
  }

  const close = async () => {
    await new Promise((resolve) => server.close(() => resolve()));
    if (writeStartupArtifacts) {
      await Promise.allSettled([rm(portFile, { force: true }), rm(pidFile, { force: true })]);
    }
  };

  return {
    server,
    port,
    close,
    paths: { publicDir, tournamentsDir, registryPath, schemaPath, logsDir },
  };
}

/* ------------------------------ Router -------------------------------------- */

async function handleRequest(ctx, request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const { pathname } = url;
  const method = request.method ?? 'GET';

  if (pathname === '/api/health' && method === 'GET') {
    sendJson(response, 200, { ok: true, app: 'tournaments', pid: process.pid });
    return;
  }

  if (pathname === '/api/schema' && method === 'GET') {
    sendJson(response, 200, ctx.schemaJson);
    return;
  }

  if (pathname === '/api/registry') {
    if (method === 'GET') {
      await sendRegistry(ctx, response);
      return;
    }
    if (method === 'POST') {
      await registerFromPath(ctx, request, response);
      return;
    }
    sendError(response, 405, ErrorCode.METHOD_NOT_ALLOWED, `${method} not allowed on /api/registry`);
    return;
  }

  const registryIdMatch = pathname.match(/^\/api\/registry\/([^/]+)$/);
  if (registryIdMatch) {
    if (method === 'DELETE') {
      await unregister(ctx, registryIdMatch[1], response);
      return;
    }
    sendError(
      response,
      405,
      ErrorCode.METHOD_NOT_ALLOWED,
      `${method} not allowed on /api/registry/:id`,
    );
    return;
  }

  if (pathname === '/api/tournament' && method === 'POST') {
    await createTournament(ctx, request, response);
    return;
  }

  const tournamentIdMatch = pathname.match(/^\/api\/tournament\/([^/]+)$/);
  if (tournamentIdMatch && method === 'GET') {
    await sendTournament(ctx, tournamentIdMatch[1], response);
    return;
  }

  const stateMatch = pathname.match(/^\/api\/tournament\/([^/]+)\/state$/);
  if (stateMatch && method === 'POST') {
    await saveTournamentState(ctx, stateMatch[1], request, response);
    return;
  }

  if (pathname.startsWith('/api/')) {
    sendError(response, 404, ErrorCode.NOT_FOUND, `Unknown API route: ${pathname}`);
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    sendError(response, 405, ErrorCode.METHOD_NOT_ALLOWED, `${method} not allowed`);
    return;
  }

  // SPA shell: /, /new, and /t/:id all hydrate from index.html.
  if (
    pathname === '/' ||
    pathname === '/new' ||
    pathname === '/new/' ||
    pathname.startsWith('/t/')
  ) {
    await sendSpaShell(ctx, response, method === 'HEAD');
    return;
  }

  await sendStatic(ctx.publicDir, pathname, response, method === 'HEAD');
}

/* ------------------------------ Registry ------------------------------------ */

async function initializeRegistryIfMissing(registryPath) {
  try {
    await stat(registryPath);
  } catch {
    await atomicWriteJson(registryPath, []);
  }
}

async function readRegistry(registryPath) {
  try {
    const raw = await readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function sendRegistry(ctx, response) {
  const registry = await readRegistry(ctx.registryPath);
  const enriched = await Promise.all(
    registry.map(async (entry) => {
      try {
        const tournament = JSON.parse(await readFile(entry.filePath, 'utf8'));
        return {
          id: entry.id,
          slug: tournament.slug ?? entry.slug ?? null,
          title: tournament.title ?? entry.title ?? path.basename(entry.filePath, '.json'),
          kind: tournament.kind ?? entry.kind ?? null,
          methodology: tournament.methodology ?? entry.methodology ?? null,
          filePath: entry.filePath,
          createdAt: tournament.createdAt ?? entry.createdAt ?? null,
          lastActiveAt: tournament.lastActiveAt ?? entry.lastActiveAt ?? null,
          progress: computeProgress(tournament),
          missing: false,
        };
      } catch {
        return {
          id: entry.id,
          slug: entry.slug ?? null,
          title: entry.title ?? path.basename(entry.filePath ?? '', '.json'),
          kind: entry.kind ?? null,
          methodology: entry.methodology ?? null,
          filePath: entry.filePath,
          createdAt: entry.createdAt ?? null,
          lastActiveAt: entry.lastActiveAt ?? null,
          progress: { comparisons: 0, pairings: null, percent: null },
          missing: true,
        };
      }
    }),
  );
  sendJson(response, 200, { tournaments: enriched });
}

async function registerFromPath(ctx, request, response) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, error.message);
    return;
  }
  if (!payload || typeof payload.filePath !== 'string' || payload.filePath.length === 0) {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, 'Expected a filePath string.');
    return;
  }
  const absolute = path.resolve(payload.filePath);
  if (path.extname(absolute).toLowerCase() !== '.json') {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, 'filePath must point to a .json file.');
    return;
  }
  try {
    const details = await stat(absolute);
    if (!details.isFile()) {
      sendError(response, 400, ErrorCode.INVALID_PAYLOAD, 'filePath must point to a regular file.');
      return;
    }
  } catch {
    sendError(response, 404, ErrorCode.FILE_NOT_FOUND, `File does not exist: ${absolute}`);
    return;
  }
  let tournament;
  try {
    tournament = JSON.parse(await readFile(absolute, 'utf8'));
  } catch (error) {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, `File is not valid JSON: ${error.message}`);
    return;
  }
  if (!ctx.validateTournament(tournament)) {
    sendError(response, 400, ErrorCode.INVALID_SCHEMA, 'File does not match tournament schema.', {
      errors: ctx.validateTournament.errors,
    });
    return;
  }
  const id = await ctx.mutateRegistry((registry) => {
    const existing = registry.find((entry) => entry.filePath === absolute);
    const now = new Date().toISOString();
    if (existing) {
      existing.lastActiveAt = now;
      existing.slug = tournament.slug;
      existing.title = tournament.title;
      existing.kind = tournament.kind;
      existing.methodology = tournament.methodology;
      return existing.id;
    }
    const newId = tournament.id ?? randomUUID();
    registry.push({
      id: newId,
      slug: tournament.slug,
      title: tournament.title,
      kind: tournament.kind,
      methodology: tournament.methodology,
      filePath: absolute,
      createdAt: now,
      lastActiveAt: now,
    });
    return newId;
  });
  sendJson(response, 200, { id, filePath: absolute });
}

async function unregister(ctx, id, response) {
  const removed = await ctx.mutateRegistry((registry) => {
    const index = registry.findIndex((entry) => entry.id === id);
    if (index === -1) return null;
    const [entry] = registry.splice(index, 1);
    return entry;
  });
  if (!removed) {
    sendError(response, 404, ErrorCode.NOT_FOUND, `No tournament registered with id ${id}`);
    return;
  }
  sendJson(response, 200, { ok: true, id });
}

/* ------------------------------ Tournament I/O ------------------------------ */

async function findRegistryEntry(ctx, id) {
  const registry = await readRegistry(ctx.registryPath);
  return registry.find((entry) => entry.id === id) ?? null;
}

async function sendTournament(ctx, id, response) {
  const entry = await findRegistryEntry(ctx, id);
  if (!entry) {
    sendError(response, 404, ErrorCode.NOT_FOUND, `No tournament registered with id ${id}`);
    return;
  }
  let tournament;
  try {
    tournament = JSON.parse(await readFile(entry.filePath, 'utf8'));
  } catch {
    sendError(response, 404, ErrorCode.FILE_NOT_FOUND, `File missing on disk: ${entry.filePath}`);
    return;
  }
  await ctx.mutateRegistry((registry) => {
    const e = registry.find((r) => r.id === id);
    if (e) e.lastActiveAt = new Date().toISOString();
  });
  sendJson(response, 200, {
    id: entry.id,
    filePath: entry.filePath,
    tournament,
    progress: computeProgress(tournament),
  });
}

async function saveTournamentState(ctx, id, request, response) {
  const entry = await findRegistryEntry(ctx, id);
  if (!entry) {
    sendError(response, 404, ErrorCode.NOT_FOUND, `No tournament registered with id ${id}`);
    return;
  }
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, error.message);
    return;
  }
  if (!payload || typeof payload.state !== 'object' || payload.state === null) {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, 'Expected a state object on the payload.');
    return;
  }

  const result = await ctx.withFileLock(entry.filePath, async () => {
    let tournament;
    try {
      tournament = JSON.parse(await readFile(entry.filePath, 'utf8'));
    } catch (error) {
      return { ok: false, code: ErrorCode.FILE_NOT_FOUND, message: `Cannot read tournament file: ${error.message}` };
    }
    const next = {
      ...tournament,
      state: payload.state,
      lastActiveAt: new Date().toISOString(),
    };
    if (!ctx.validateTournament(next)) {
      return {
        ok: false,
        code: ErrorCode.INVALID_SCHEMA,
        message: 'State update produces a tournament that does not match the schema.',
        details: { errors: ctx.validateTournament.errors },
      };
    }
    await atomicWriteJson(entry.filePath, next);
    return { ok: true, tournament: next };
  });

  if (!result.ok) {
    const status = result.code === ErrorCode.FILE_NOT_FOUND ? 404 : 400;
    sendError(response, status, result.code, result.message, result.details);
    return;
  }

  await ctx.mutateRegistry((registry) => {
    const e = registry.find((r) => r.id === id);
    if (e) e.lastActiveAt = result.tournament.lastActiveAt;
  });

  sendJson(response, 200, {
    ok: true,
    id,
    lastActiveAt: result.tournament.lastActiveAt,
    progress: computeProgress(result.tournament),
  });
}

async function createTournament(ctx, request, response) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, error.message);
    return;
  }
  if (!payload || typeof payload !== 'object') {
    sendError(response, 400, ErrorCode.INVALID_PAYLOAD, 'Expected a tournament JSON object.');
    return;
  }
  if (!ctx.validateTournament(payload)) {
    sendError(response, 400, ErrorCode.INVALID_SCHEMA, 'Tournament does not match schema.', {
      errors: ctx.validateTournament.errors,
    });
    return;
  }
  const baseSlug = payload.slug;
  const { filePath, finalSlug } = await pickSlugFilePath(ctx.tournamentsDir, baseSlug);
  const tournament = { ...payload, slug: finalSlug };
  if (!ctx.validateTournament(tournament)) {
    sendError(response, 400, ErrorCode.INVALID_SCHEMA, 'Adjusted tournament does not match schema.', {
      errors: ctx.validateTournament.errors,
    });
    return;
  }
  await atomicWriteJson(filePath, tournament);
  const id = await ctx.mutateRegistry((registry) => {
    const now = new Date().toISOString();
    registry.push({
      id: tournament.id,
      slug: tournament.slug,
      title: tournament.title,
      kind: tournament.kind,
      methodology: tournament.methodology,
      filePath,
      createdAt: tournament.createdAt ?? now,
      lastActiveAt: tournament.lastActiveAt ?? now,
    });
    return tournament.id;
  });
  sendJson(response, 201, { id, filePath, slug: tournament.slug });
}

async function pickSlugFilePath(tournamentsDir, baseSlug) {
  for (let suffix = 1; suffix <= 999; suffix += 1) {
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const filePath = path.join(tournamentsDir, `${slug}.json`);
    try {
      await stat(filePath);
      // exists — try next suffix
    } catch {
      return { filePath, finalSlug: slug };
    }
  }
  throw new Error(`Exhausted slug collisions for ${baseSlug}`);
}

/* ------------------------------ Progress ------------------------------------ */

function computeProgress(tournament) {
  const methodology = tournament?.methodology;
  const candidates = Array.isArray(tournament?.candidates) ? tournament.candidates : [];
  const history = Array.isArray(tournament?.state?.history) ? tournament.state.history : [];
  const comparisons = history.length;

  if (methodology === 'elo-pairwise' || methodology === 'bradley-terry') {
    const minPerPair = tournament?.config?.minComparisonsPerPair ?? 3;
    const pairings = candidates.length >= 2 ? (candidates.length * (candidates.length - 1)) / 2 : 0;
    const total = pairings * minPerPair;
    const percent = total > 0 ? Math.min(1, comparisons / total) : null;
    return { comparisons, pairings, percent };
  }

  if (methodology === 'bracket-4-seed') {
    const totalMatches = 3; // 2 semis + 1 final
    const percent = Math.min(1, comparisons / totalMatches);
    return { comparisons, pairings: totalMatches, percent };
  }

  if (methodology === 'best-of-n') {
    const roundSize = tournament?.config?.roundSize;
    if (typeof roundSize === 'number' && roundSize > 0 && candidates.length > 0) {
      const totalRounds = Math.ceil(candidates.length / roundSize);
      const percent = Math.min(1, comparisons / totalRounds);
      return { comparisons, pairings: totalRounds, percent };
    }
    return { comparisons, pairings: null, percent: null };
  }

  // multi-axis, slider — no single clear target.
  return { comparisons, pairings: null, percent: null };
}

/* ------------------------------ Static serving ------------------------------ */

async function sendSpaShell(ctx, response, headOnly) {
  const indexPath = path.join(ctx.publicDir, 'index.html');
  try {
    const buffer = await readFile(indexPath);
    response.writeHead(200, {
      'content-length': buffer.length,
      'content-type': mimeTypes.get('.html'),
    });
    if (headOnly) {
      response.end();
      return;
    }
    response.end(buffer);
  } catch {
    sendError(
      response,
      404,
      ErrorCode.NOT_FOUND,
      'SPA shell not built yet. Run `npm run build` to produce public/index.html.',
    );
  }
}

async function sendStatic(publicDir, urlPath, response, headOnly) {
  const normalizedPath = urlPath === '/' ? '/index.html' : decodeURIComponent(urlPath);
  const requestedPath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '');
  const staticPath = path.join(publicDir, requestedPath);
  if (!staticPath.startsWith(publicDir)) {
    sendError(response, 403, ErrorCode.FORBIDDEN, 'Forbidden');
    return;
  }
  try {
    const details = await stat(staticPath);
    if (!details.isFile()) {
      sendError(response, 404, ErrorCode.NOT_FOUND, 'Not found');
      return;
    }
    const contentType = mimeTypes.get(path.extname(staticPath)) ?? 'application/octet-stream';
    if (headOnly) {
      response.writeHead(200, {
        'content-length': details.size,
        'content-type': contentType,
      });
      response.end();
      return;
    }
    // Small static files (typical for the SPA bundle) — buffer and send.
    // Larger payloads (images, fonts) stream via createReadStream.
    if (details.size <= 1_000_000) {
      const buffer = await readFile(staticPath);
      response.writeHead(200, {
        'content-length': buffer.length,
        'content-type': contentType,
      });
      response.end(buffer);
      return;
    }
    response.writeHead(200, {
      'content-length': details.size,
      'content-type': contentType,
    });
    createReadStream(staticPath).pipe(response);
  } catch {
    sendError(response, 404, ErrorCode.NOT_FOUND, 'Not found');
  }
}

/* ------------------------------ Plumbing ------------------------------------ */

async function readJsonBody(request) {
  const chunks = [];
  let byteLength = 0;
  for await (const chunk of request) {
    byteLength += chunk.length;
    if (byteLength > MAX_BODY_BYTES) {
      throw new Error('Request body is too large.');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Body is not valid JSON: ${error.message}`);
  }
}

async function atomicWriteJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tempPath, serialized, 'utf8');
  await rename(tempPath, filePath);
}

function sendJson(response, statusCode, body) {
  const serialized = JSON.stringify(body);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(serialized),
  });
  response.end(serialized);
}

function sendError(response, statusCode, code, message, details) {
  const body = { error: { code, message, ...(details ? { details } : {}) } };
  sendJson(response, statusCode, body);
}

function listenWithFallback(server, initial) {
  return new Promise((resolve, reject) => {
    // port 0 → ask the OS; don't iterate.
    if (initial === 0) {
      server.once('error', reject);
      server.listen(0, () => {
        const addr = server.address();
        const actual = typeof addr === 'object' && addr ? addr.port : 0;
        resolve(actual);
      });
      return;
    }
    let attempt = initial;
    const tryListen = () => {
      const onError = (err) => {
        if (err.code === 'EADDRINUSE' && attempt < initial + MAX_PORT_OFFSET) {
          attempt += 1;
          server.removeListener('error', onError);
          tryListen();
        } else {
          reject(err);
        }
      };
      server.once('error', onError);
      server.listen(attempt, () => {
        server.removeListener('error', onError);
        resolve(attempt);
      });
    };
    tryListen();
  });
}

/* ------------------------------ Entry point --------------------------------- */

const isMainModule = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

if (isMainModule) {
  const sampleFlag = process.argv.includes('--sample');
  const { port, paths } = await startServer();

  if (sampleFlag) {
    const examplesDir = path.join(__dirname, 'examples');
    try {
      const files = readdirSync(examplesDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const src = path.join(examplesDir, file);
        const data = JSON.parse(await readFile(src, 'utf8'));
        const { filePath } = await pickSlugFilePath(paths.tournamentsDir, data.slug);
        await atomicWriteJson(filePath, { ...data, slug: path.basename(filePath, '.json') });
        const registry = JSON.parse(await readFile(paths.registryPath, 'utf8'));
        const now = new Date().toISOString();
        registry.push({
          id: data.id,
          slug: path.basename(filePath, '.json'),
          title: data.title,
          kind: data.kind,
          methodology: data.methodology,
          filePath,
          createdAt: data.createdAt ?? now,
          lastActiveAt: now,
        });
        await atomicWriteJson(paths.registryPath, registry);
        console.log(`  Loaded sample: ${data.title}`);
      }
    } catch (err) {
      console.log(`  (no sample tournaments found in examples/)`);
    }
  }

  console.log(`Tournaments: http://localhost:${port}`);
  console.log(`Logs: ${path.join(homedir(), 'Library', 'Logs', 'Tournaments')}`);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      console.log(`Tournaments: shutting down (${signal})`);
      process.exit(0);
    });
  }
}
