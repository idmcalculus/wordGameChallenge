import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/js/**/*.test.ts'],
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    globals: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/js/**/*.ts'
      ],
      exclude: [
        'src/js/**/*.test.ts',
        'src/js/config/appConfig.ts',
        'src/js/constants/statConstants.ts',
        'src/js/types/*.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
      }
    }
  }
});
