import path from 'node:path'

import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  cacheDir: '../../node_modules/.vite',
  esbuild: {
    format: 'esm',
    target: 'esnext',
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      exclude: ['**/index.ts'],
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['**/*.spec.ts'],
    setupFiles: [path.resolve(import.meta.dirname, '__tests__/setup.ts')],
  },
})
