import react from '@vitejs/plugin-react';
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
  plugins: [react()],
  preview: { host: true, port: 5173, proxy },
  server: { port: 5173, proxy },
});
