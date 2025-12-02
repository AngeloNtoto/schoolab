import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';

export default defineConfig(async (env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  // Dynamic imports for ESM-only plugins
  const react = await import('@vitejs/plugin-react').then(m => m.default);
  const tailwindcss = await import('@tailwindcss/vite').then(m => m.default);

  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/renderer/${name}`,
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      preserveSymlinks: true,
    },
    clearScreen: false,
  } as UserConfig;
});
