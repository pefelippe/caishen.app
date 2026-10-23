import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

// One `.env` for the whole repo; only `VITE_`-prefixed variables reach the browser.
const envDir = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  // The proxy runs here in Node, so read the server's address from the same `.env` it uses.
  const env = { ...loadEnv(mode, envDir, ''), ...process.env };
  const serverUrl = env.SERVER_URL ?? `http://localhost:${env.SERVER_PORT ?? 4000}`;
  // Serve where the server expects the client, or Better Auth refuses the sign-in as untrusted.
  const port = Number(new URL(env.CLIENT_ORIGIN ?? 'http://localhost:5173').port) || 5173;

  /** Same origin for API and auth, so the session cookie reaches both. */
  const proxy: Record<string, ProxyOptions> = {
    '/api': { changeOrigin: false, target: serverUrl },
    '/graphql': { changeOrigin: false, target: serverUrl },
  };

  return {
    envDir,
    plugins: [react(), tailwindcss()],
    preview: { host: true, port, proxy },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port, proxy, strictPort: true },
  };
});
