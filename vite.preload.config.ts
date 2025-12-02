import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';

export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'build'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    root,
    mode,
    build: {
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => '[name].js',
        formats: ['cjs'],
      },
    },
    resolve: {
      preserveSymlinks: true,
    },
    clearScreen: false,
  } as UserConfig;
});
