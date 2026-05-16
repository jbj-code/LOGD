// vite.config.ts
// Vite config; set VITE_BASE when deploying under a subpath (e.g. GitHub Pages project site).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE?.trim() || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
  },
});
