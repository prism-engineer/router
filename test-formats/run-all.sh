#!/bin/bash
# Run all format verification tests

set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "Running ESM/CJS Format Verification Tests"
echo "=========================================="
echo ""

echo "--- ESM Main Export ---"
node test-esm.mjs
echo ""

echo "--- CJS Main Export ---"
node test-cjs.cjs
echo ""

echo "--- ESM makeApiCall ---"
node test-makeapicall-esm.mjs
echo ""

echo "--- CJS makeApiCall ---"
node test-makeapicall-cjs.cjs
echo ""

echo "--- CLI ---"
bash test-cli.sh
echo ""

echo "=========================================="
echo "All format verification tests passed! ✓"
echo "=========================================="
