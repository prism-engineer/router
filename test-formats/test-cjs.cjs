/**
 * CJS require test
 * Run: node test-formats/test-cjs.cjs
 */

const { router, createRouter, createApiRoute, createAuthScheme } = require('../dist/router.cjs');

console.log('Testing CJS requires...\n');

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

console.log(`\nCJS: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
