#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
DEPLOY_SCRIPT="${DEPLOY_SCRIPT:-$CODEX_HOME_DIR/skills/vercel-deploy/scripts/deploy.sh}"

if [ ! -f "$DEPLOY_SCRIPT" ]; then
  echo "Missing deploy helper at $DEPLOY_SCRIPT" >&2
  exit 1
fi

echo "Building latest preview bundle..." >&2
if [ "${PREVIEW_SKIP_DATA_REFRESH:-0}" = "1" ]; then
  npm --prefix "$PROJECT_ROOT" run build:web >&2
else
  npm --prefix "$PROJECT_ROOT" run preflight:preview >&2
fi

echo "Packaging latest tarball..." >&2
TARBALL_PATH="$(bash "$PROJECT_ROOT/scripts/package_preview_tarball.sh" | tail -n 1)"

echo "Deploying claimable tarball to Vercel..." >&2
set +e
DEPLOY_RESPONSE="$(bash "$DEPLOY_SCRIPT" "$TARBALL_PATH" 2>&1)"
DEPLOY_STATUS=$?
set -e
if [ "$DEPLOY_STATUS" -ne 0 ]; then
  printf '%s\n' "$DEPLOY_RESPONSE" >&2
  echo "Claimable Vercel deploy failed before validation could run." >&2
  exit "$DEPLOY_STATUS"
fi
PREVIEW_URL="$(printf '%s' "$DEPLOY_RESPONSE" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s); process.stdout.write(j.previewUrl || '');});")"

if [ -z "$PREVIEW_URL" ]; then
  echo "Failed to extract preview URL from deploy response" >&2
  printf '%s\n' "$DEPLOY_RESPONSE" >&2
  exit 1
fi

echo "Running API/data gate for $PREVIEW_URL ..." >&2
node "$PROJECT_ROOT/scripts/validate_release_api.mjs" "$PREVIEW_URL" >&2
echo "Running browser smoke gate for $PREVIEW_URL ..." >&2
node "$PROJECT_ROOT/scripts/validate_release_ui.mjs" "$PREVIEW_URL" >&2

printf '%s\n' "$DEPLOY_RESPONSE"
