import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['@tauri-apps/api/core', '@tauri-apps/plugin-sql', '@tauri-apps/api/path'],
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
        // Regroupe toutes les dépendances node_modules dans un chunk vendor si elles ne sont pas traitées spécifiquement
        if (id.includes('node_modules')) {
          if (id.includes('react')) return 'vendor-react';
          if (id.includes('@tauri-apps')) return 'vendor-tauri';
          return 'vendor-others';
        }
      },
      },
    },
    outDir: '.vite/build',
    emptyOutDir: true,
    target: 'esnext', 
    minify: 'esbuild', 
  },
});
