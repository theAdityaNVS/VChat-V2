import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    // Enable SPA fallback for dev server
    proxy: {},
    open: true,
  },
  preview: {
    // Enable SPA fallback for preview server
    proxy: {},
  },
});
