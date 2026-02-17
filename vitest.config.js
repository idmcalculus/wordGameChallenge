import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/js/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/js/apiHandler.ts',
        'src/js/core/**/*.ts',
        'src/js/repositories/**/*.ts',
        'src/js/utils/filterUtils.ts',
        'src/js/utils/sortUtils.ts',
        'src/js/utils/timerUtils.ts'
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
