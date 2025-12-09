import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Wichtig für Electron: Relative Pfade für Assets
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // WICHTIG: Wir sagen Vite, dass diese Module extern sind und nicht gebündelt werden sollen.
      // Die App lädt diese zur Laufzeit über die ImportMap in index.html
      external: [
        'firebase/app',
        'firebase/firestore',
        'firebase/auth',
        'firebase/storage'
      ]
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  }
});