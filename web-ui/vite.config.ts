import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(async () => {
  const react = await import('@vitejs/plugin-react').then(m => m.default);
  const tailwindcss = await import('@tailwindcss/vite').then(m => m.default);

  return {
    root: __dirname,
    plugins: [react(), tailwindcss()],
    build: {
      // Build vers dist-web à la racine de schoolab
      outDir: path.resolve(__dirname, '../dist-web'),
      emptyOutDir: true,
    },
    server: {
      port: 3001,
    }
  };
});
