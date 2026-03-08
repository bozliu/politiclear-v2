#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  cat >&2 <<'EOF'
VERCEL_TOKEN is required.

Create a Personal Token in Vercel, then add it to your shell environment:
  export VERCEL_TOKEN="your-token"

Optionally persist it in ~/.zshrc before running deploy scripts again.
EOF
  exit 1
fi

if [ -z "${VERCEL_PROJECT_SLUG:-}" ] || [ -z "${VERCEL_SCOPE_SLUG:-}" ]; then
  cat >&2 <<'EOF'
VERCEL_PROJECT_SLUG and VERCEL_SCOPE_SLUG are required.

Example:
  export VERCEL_PROJECT_SLUG="your-vercel-project-slug"
  export VERCEL_SCOPE_SLUG="your-vercel-team-or-user"
EOF
  exit 1
fi

PROJECT_SLUG="$VERCEL_PROJECT_SLUG"
SCOPE_SLUG="$VERCEL_SCOPE_SLUG"

PROJECT_FILE="$PROJECT_ROOT/.vercel/project.json"

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
