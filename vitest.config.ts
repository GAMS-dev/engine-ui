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
