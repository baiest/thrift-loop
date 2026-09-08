import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const MIN_COVERAGE = 85.01;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      exclude: ['src/main.tsx'],
      thresholds: {
        lines: MIN_COVERAGE,
        functions: MIN_COVERAGE,
        branches: MIN_COVERAGE,
        statements: MIN_COVERAGE,
      },
    },
  },
});
