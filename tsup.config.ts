import { defineConfig } from 'tsup';

const sharedConfig = {
  // Output both ESM and CJS formats
  format: ['esm', 'cjs'] as const,
  
  // Generate declaration files
  dts: true,
  
  // Generate sourcemaps
  sourcemap: true,
  
  // Don't bundle dependencies (they're in package.json)
  external: [
    'express',
    'ajv',
    '@sinclair/typebox',
    '@sinclair/typebox-codegen',
    'glob',
    'json-schema-to-typescript',
    'fs',
    'fs/promises',
    'path',
    'node:fs',
    'node:fs/promises',
    'node:path',
  ],
  
  // Keep modules separate (important for tree-shaking)
  splitting: false,
  
  // Target Node.js 16+
  target: 'node16' as const,
  
  // Output directory
  outDir: 'dist',
};

export default defineConfig([
  // Main library entries (no shebang)
  {
    ...sharedConfig,
    entry: {
      'router': 'src/router.ts',
      'compilation/makeApiCall': 'src/compilation/makeApiCall.ts',
    },
    clean: false, // Clean handled by build script to avoid race condition
  },
  // CLI entry (with shebang)
  {
    ...sharedConfig,
    entry: {
      'cli/index': 'src/cli/index.ts',
    },
    banner: {
      js: '#!/usr/bin/env node',
    },
    clean: false, // Don't clean - would remove previous output
  },
]);
