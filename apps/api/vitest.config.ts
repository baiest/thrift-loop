import { defineConfig } from 'vitest/config';

const MIN_COVERAGE = 85.01;

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: ['src/index.ts'],
      thresholds: {
        lines: MIN_COVERAGE,
        functions: MIN_COVERAGE,
        branches: MIN_COVERAGE,
        statements: MIN_COVERAGE,
      },
    },
  },
});
