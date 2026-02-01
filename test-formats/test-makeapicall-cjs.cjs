/**
 * CJS makeApiCall subpath test
 * Run: node test-formats/test-makeapicall-cjs.cjs
 */

const { makeApiCall } = require('../dist/compilation/makeApiCall.cjs');

console.log('Testing CJS makeApiCall require...\n');

if (typeof makeApiCall === 'function') {
  console.log('✓ makeApiCall is a function');
  process.exit(0);
} else {
  console.log('✗ makeApiCall is not a function');
  process.exit(1);
}
