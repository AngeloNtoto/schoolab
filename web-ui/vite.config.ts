import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(async () => {
  const react = await import('@vitejs/plugin-react').then(m => m.default);
  const tailwindcss = await import('@tailwindcss/vite').then(m => m.default);

  return {
    root: __dirname,
    plugins: [react(), tailwindcss()],
    build: {
      // Build vers dist-mobile à la racine de schoolab
      rollupOptions:{
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
      outDir: path.resolve(__dirname, '../dist-web'),
      emptyOutDir: true,
      target: 'esnext', 
      minify: 'esbuild', 
    },
    server: {
      port: 3001,
    }
  };
});
