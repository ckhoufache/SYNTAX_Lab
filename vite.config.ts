import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': __dirname, // Ermöglicht Importe via @/ (z.B. @/logo.png)
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Removed external rollupOptions for firebase to ensure bundling
  },
  server: {
    port: 5173,
    strictPort: true,
  }
});