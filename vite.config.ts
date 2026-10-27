import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'path';
import { parse } from 'dotenv';
import worker, { AdminData } from './src/worker.ts';
import { defineConfig, type Plugin } from 'vite';

class LocalMemoryStorage {
  private readonly values = new Map<string, unknown>();
  private transactionTail: Promise<void> = Promise.resolve();

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async transaction<T>(callback: (transaction: LocalMemoryStorage) => Promise<T>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await callback(this);
    } finally {
      release();
    }
  }
}

function localWorkerApi(): Plugin {
  const varsPath = path.resolve(process.cwd(), '.dev.vars');
  const vars = existsSync(varsPath) ? parse(readFileSync(varsPath)) : {};
  const data = new AdminData({ storage: new LocalMemoryStorage() });
  const stub = { fetch: (request: Request) => data.fetch(request) };
  const env = {
    ASSETS: { fetch: async () => new Response('Not found.', { status: 404 }) },
    ADMIN_DATA: { idFromName: () => 'local', get: () => stub },
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || vars.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || vars.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET || vars.SESSION_SECRET,
  };

  return {
    name: 'picshrink-local-worker-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/api/')) return next();
        void (async () => {
          const method = request.method || 'GET';
          const headers = new Headers();
          for (const [key, value] of Object.entries(request.headers)) {
            if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          }

          let body: string | undefined;
          if (method !== 'GET' && method !== 'HEAD') {
            const chunks: Buffer[] = [];
            let size = 0;
            await new Promise<void>((resolve, reject) => {
              request.on('data', (chunk: Buffer | string) => {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                size += buffer.length;
                if (size <= 8192) chunks.push(buffer);
              });
              request.on('end', resolve);
              request.on('error', reject);
            });
            if (size > 8192) {
              response.statusCode = 413;
              response.setHeader('Content-Type', 'application/json; charset=utf-8');
              response.end(JSON.stringify({ error: 'Request too large.' }));
              return;
            }
            if (chunks.length) body = Buffer.concat(chunks).toString('utf8');
          }

          const apiRequest = new Request(new URL(request.url!, 'http://localhost'), {
            method,
            headers,
            ...(body === undefined ? {} : { body }),
          });
          const apiResponse = await worker.fetch(apiRequest, env);
          response.statusCode = apiResponse.status;
          apiResponse.headers.forEach((value, key) => response.setHeader(key, value));
          response.end(Buffer.from(await apiResponse.arrayBuffer()));
        })().catch(next);
      });
    },
  };
}

export default defineConfig(({ command }) => {
  return {
    plugins: [react(), tailwindcss(), ...(command === 'serve' ? [localWorkerApi()] : [])],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname ?? '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
