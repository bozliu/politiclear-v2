#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/.vercel-preview"
mkdir -p "$OUTPUT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
TARBALL_PATH="$OUTPUT_DIR/politiclear-preview-$STAMP.tgz"

tar -czf "$TARBALL_PATH" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.expo' \
  --exclude='.expo-export' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.vercel' \
  --exclude='.vercel-preview' \
  --exclude='data/generated/portraits' \
  -C "$PROJECT_ROOT" .

printf '%s\n' "$TARBALL_PATH"
