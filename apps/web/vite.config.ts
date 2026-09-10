import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = 'http://localhost:3000';
const WS_PROXY_TARGET = 'ws://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    watch: {
      // vitest --coverage writes here; without this, Vite's watcher treats
      // the report as a source change and force-reloads every open tab
      // (tearing down the realtime WebSocket) right after a coverage run.
      ignored: ['**/coverage/**'],
    },
    proxy: {
      // Must come before '/api' below: proxy matches keys in insertion order,
      // and only this specific entry carries ws: true for the upgrade.
      '/api/realtime': { target: WS_PROXY_TARGET, ws: true },
      '/api': API_PROXY_TARGET,
      '/uploads': API_PROXY_TARGET,
    },
  },
});
