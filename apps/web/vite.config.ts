import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = 'http://localhost:3000';
const WS_PROXY_TARGET = 'ws://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Must come before '/api' below: proxy matches keys in insertion order,
      // and only this specific entry carries ws: true for the upgrade.
      '/api/realtime': { target: WS_PROXY_TARGET, ws: true },
      '/api': API_PROXY_TARGET,
      '/uploads': API_PROXY_TARGET,
    },
  },
});
