import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: process.env.PUBLIC_URL ?? './',
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:80',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'build',
    },
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
            '**/node_modules/**',
            '**/dist/**',
            '**/src/__tests__/utils/**',
            'src/__tests__/setup.js',
        ],
        setupFiles: ['./src/__tests__/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['cobertura', 'text', 'json', 'html'],
            reportsDirectory: './coverage',
        },
    },
});
