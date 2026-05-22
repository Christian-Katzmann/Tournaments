import type { Server } from 'node:http';

export interface StartServerOptions {
  port?: number;
  repoRoot?: string;
  publicDir?: string;
  tournamentsDir?: string;
  schemaPath?: string;
  registryDir?: string;
  logsDir?: string;
  writeStartupArtifacts?: boolean;
}

export interface ServerPaths {
  publicDir: string;
  tournamentsDir: string;
  registryPath: string;
  schemaPath: string;
  logsDir: string;
}

export interface ServerHandle {
  server: Server;
  port: number;
  close: () => Promise<void>;
  paths: ServerPaths;
}

export function startServer(options?: StartServerOptions): Promise<ServerHandle>;
