import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      css: true,
      clearMocks: true,
      mockReset: true,
      // The default 5000ms is tuned for a fast local machine; CI runners
      // are often slower/more contended, so give tests more headroom there
      // to avoid flaky timeouts on otherwise-correct, just-slower tests.
      testTimeout: 15000,
      deps: {
        optimizer: {
          web: {
            include: ['axios', 'memoize', 'mimic-function'],
          },
        },
      },
      exclude: [
        './node_modules/**',
        './dist/**',
        './src/__tests__/utils/**',
        './src/__tests__/setup.ts',
        './.cache/**',
      ],
      setupFiles: ['./src/__tests__/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['cobertura', 'text', 'json', 'html'],
        reportsDirectory: './coverage',
      },
    },
  }),
);
