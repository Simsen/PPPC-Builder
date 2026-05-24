import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Base path for the deployed site. Defaults to '/' (root) which suits
// user/org GitHub Pages and custom-domain deploys. For project pages set
// VITE_BASE='/your-repo-name/' (with leading and trailing slash).
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
