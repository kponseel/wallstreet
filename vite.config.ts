/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    // Proxy Yahoo Finance's public quote endpoint so the browser can fetch
    // prices without hitting CORS. This only exists while running `npm run dev`
    // (or `npm run preview`); a fully static build falls back to manual prices.
    proxy: {
      '/api/yf': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/yf/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AIStockLab/1.0)',
        },
      },
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/api/yf': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/yf/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AIStockLab/1.0)',
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
