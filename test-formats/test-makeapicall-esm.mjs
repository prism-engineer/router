/**
 * ESM makeApiCall subpath test
 * Run: node test-formats/test-makeapicall-esm.mjs
 */

import { makeApiCall } from '../dist/compilation/makeApiCall.js';

console.log('Testing ESM makeApiCall import...\n');

if (typeof makeApiCall === 'function') {
  console.log('✓ makeApiCall is a function');
  process.exit(0);
} else {
  console.log('✗ makeApiCall is not a function');
  process.exit(1);
}
