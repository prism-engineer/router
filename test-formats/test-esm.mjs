/**
 * ESM import test
 * Run: node test-formats/test-esm.mjs
 */

import { router, createRouter, createApiRoute, createAuthScheme } from '../dist/router.js';

console.log('Testing ESM imports...\n');

// Test main exports exist
const tests = [
  ['router', typeof router === 'object'],
  ['router.app', typeof router.app === 'function'],
  ['router.loadRoutes', typeof router.loadRoutes === 'function'],
  ['router.compile', typeof router.compile === 'function'],
  ['createRouter', typeof createRouter === 'function'],
  ['createApiRoute', typeof createApiRoute === 'function'],
  ['createAuthScheme', typeof createAuthScheme === 'function'],
];

let passed = 0;
let failed = 0;

for (const [name, result] of tests) {
  if (result) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    failed++;
  }
}

console.log(`\nESM: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
