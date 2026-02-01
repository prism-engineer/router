import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const srcDir = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      NODE_ENV: 'test'
    },
    // Test projects for running against source, ESM dist, and CJS dist
    projects: [
      // Source tests - tests against TypeScript source (fastest, for development)
      {
        test: {
          name: 'source',
          include: ['src/tests/**/*.test.ts'],
        },
      },
      // ESM tests - tests against built ESM dist files
      {
        test: {
          name: 'esm',
          include: ['src/tests/**/*.test.ts'],
        },
        resolve: {
          alias: {
            [resolve(srcDir, 'router.js')]: resolve(distDir, 'router.js'),
            [resolve(srcDir, 'createApiRoute.js')]: resolve(distDir, 'router.js'),
            [resolve(srcDir, 'createAuthScheme.js')]: resolve(distDir, 'router.js'),
            [resolve(srcDir, 'core/types.js')]: resolve(distDir, 'router.js'),
          },
        },
      },
      // CJS tests - tests against built CJS dist files
      {
        test: {
          name: 'cjs',
          include: ['src/tests/**/*.test.ts'],
        },
        resolve: {
          alias: {
            [resolve(srcDir, 'router.js')]: resolve(distDir, 'router.cjs'),
            [resolve(srcDir, 'createApiRoute.js')]: resolve(distDir, 'router.cjs'),
            [resolve(srcDir, 'createAuthScheme.js')]: resolve(distDir, 'router.cjs'),
            [resolve(srcDir, 'core/types.js')]: resolve(distDir, 'router.cjs'),
          },
        },
      },
    ],
  },
});