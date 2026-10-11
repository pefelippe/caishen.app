import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type ProxyOptions } from 'vite';

const serverUrl = process.env.SERVER_URL ?? 'http://localhost:4000';
const collabUrl = process.env.COLLAB_URL ?? 'ws://localhost:4001';

/** Same origin for API, auth and collab, so the session cookie reaches all three. */
const proxy: Record<string, ProxyOptions> = {
  '/api': { changeOrigin: false, target: serverUrl },
  '/collab': { rewrite: path => path.replace(/^\/collab/, ''), target: collabUrl, ws: true },
  '/graphql': { changeOrigin: false, target: serverUrl },
};

export default defineConfig({
  // One `.env` for the whole repo; only `VITE_`-prefixed variables reach the browser.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [react(), tailwindcss()],
  preview: { host: true, port: 5173, proxy },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy },
});
