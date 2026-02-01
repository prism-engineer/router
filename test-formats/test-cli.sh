#!/bin/bash
# CLI test - verifies the CLI is executable and responds to help

set -e

cd "$(dirname "$0")"

echo "Testing CLI..."

# Test help command
OUTPUT=$(node ../dist/cli/index.js help 2>&1 || true)

if echo "$OUTPUT" | grep -qi "router\|prism\|usage\|help"; then
  echo "✓ CLI help works"
else
  echo "✗ CLI help failed"
  echo "$OUTPUT"
  exit 1
fi
