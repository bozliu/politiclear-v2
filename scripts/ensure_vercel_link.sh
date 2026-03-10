#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_FILE="$PROJECT_ROOT/.vercel/project.json"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  cat >&2 <<'EOF'
VERCEL_TOKEN is required.

Create a Personal Token in Vercel, then add it to your shell environment:
  export VERCEL_TOKEN="your-token"

Optionally persist it in ~/.zshrc before running deploy scripts again.
EOF
  exit 1
fi

if [ -n "${VERCEL_PROJECT_ID:-}" ] && [ -n "${VERCEL_ORG_ID:-}" ]; then
  node "$PROJECT_ROOT/scripts/materialize_vercel_project.mjs" >&2
  exit 0
fi

if [ -f "$PROJECT_FILE" ] && grep -q "\"projectId\"" "$PROJECT_FILE"; then
  EXISTING_PROJECT_SLUG="$(PROJECT_FILE="$PROJECT_FILE" python3 - <<'PY'
import json
import os
from pathlib import Path

payload = json.loads(Path(os.environ["PROJECT_FILE"]).read_text(encoding="utf-8"))
print(payload.get("projectName") or "")
PY
)"
  if [ -n "$EXISTING_PROJECT_SLUG" ] && { [ -z "${VERCEL_PROJECT_SLUG:-}" ] || [ "$EXISTING_PROJECT_SLUG" = "${VERCEL_PROJECT_SLUG:-}" ]; }; then
    echo "Vercel project already linked to $EXISTING_PROJECT_SLUG" >&2
    exit 0
  fi
fi

if [ -z "${VERCEL_PROJECT_SLUG:-}" ] || [ -z "${VERCEL_SCOPE_SLUG:-}" ]; then
  cat >&2 <<'EOF'
Either VERCEL_PROJECT_ID and VERCEL_ORG_ID, or VERCEL_PROJECT_SLUG and VERCEL_SCOPE_SLUG, are required.

Example:
  export VERCEL_PROJECT_ID="prj_..."
  export VERCEL_ORG_ID="team_..."

Fallback legacy example:
  export VERCEL_PROJECT_SLUG="your-vercel-project-slug"
  export VERCEL_SCOPE_SLUG="your-vercel-team-or-user"
EOF
  exit 1
fi

PROJECT_SLUG="$VERCEL_PROJECT_SLUG"
SCOPE_SLUG="$VERCEL_SCOPE_SLUG"

if [ -f "$PROJECT_FILE" ] && grep -q "\"projectId\"" "$PROJECT_FILE"; then
  if grep -q "\"projectName\": \"$PROJECT_SLUG\"" "$PROJECT_FILE"; then
    echo "Vercel project already linked to $PROJECT_SLUG" >&2
    exit 0
  fi
fi

mkdir -p "$PROJECT_ROOT/.vercel"

echo "Linking repo to Vercel project $PROJECT_SLUG in scope $SCOPE_SLUG..." >&2
npx vercel link \
  --yes \
  --project "$PROJECT_SLUG" \
  --scope "$SCOPE_SLUG" \
  --token "$VERCEL_TOKEN" \
  "$PROJECT_ROOT" >&2

if [ ! -f "$PROJECT_FILE" ]; then
  echo "Vercel link did not create $PROJECT_FILE" >&2
  exit 1
fi

echo "Linked repo to $PROJECT_SLUG" >&2
