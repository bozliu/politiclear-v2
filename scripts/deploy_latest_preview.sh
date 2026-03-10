#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  cat >&2 <<'EOF'
VERCEL_TOKEN is required for fixed-project deploys.

Create a Personal Token in Vercel and add it to your shell environment:
  export VERCEL_TOKEN="your-token"

Then run one of:
  npm run deploy:preview
  npm run deploy:preview:quick

Use npm run deploy:preview:claimable only if you intentionally want a temporary claimable preview URL.
EOF
  exit 1
fi

if [ -z "${VERCEL_CANONICAL_URL:-}" ]; then
  cat >&2 <<'EOF'
VERCEL_CANONICAL_URL is required for fixed-project deploys.

Example:
  export VERCEL_CANONICAL_URL="https://skill-deploy-017ji4k0pl.vercel.app"
EOF
  exit 1
fi

CANONICAL_URL="$VERCEL_CANONICAL_URL"

echo "Checking Vercel project access..." >&2
bash "$PROJECT_ROOT/scripts/ensure_vercel_link.sh" >&2

echo "Preparing verified deployment bundle..." >&2
if [ "${PREVIEW_SKIP_DATA_REFRESH:-0}" = "1" ]; then
  echo "Reusing refreshed data artifacts from the current workspace." >&2
  npm --prefix "$PROJECT_ROOT" run verify:bundle >&2
else
  echo "Refreshing data before deployment." >&2
  npm --prefix "$PROJECT_ROOT" run prepare:data >&2
fi

echo "Building verified Vercel output locally..." >&2
(cd "$PROJECT_ROOT" && npx vercel build --prod --yes --token "$VERCEL_TOKEN") >&2

PREBUILT_BUNDLE_PATH="$PROJECT_ROOT/.vercel/output/functions/api/[...route].func/data/generated/politiclear-cache.json"

echo "Verifying prebuilt API bundle..." >&2
node "$PROJECT_ROOT/scripts/verify_bundle.mjs" "$PREBUILT_BUNDLE_PATH" >&2

echo "Deploying verified prebuilt output to fixed Vercel production URL..." >&2
set +e
DEPLOY_OUTPUT="$(cd "$PROJECT_ROOT" && npx vercel deploy --prebuilt --prod --yes --token "$VERCEL_TOKEN" 2>&1)"
DEPLOY_STATUS=$?
set -e
printf '%s\n' "$DEPLOY_OUTPUT" >&2
if [ "$DEPLOY_STATUS" -ne 0 ]; then
  echo "Vercel deploy failed before deployment and canonical validation could run." >&2
  exit "$DEPLOY_STATUS"
fi
DEPLOYMENT_URL="$(printf '%s\n' "$DEPLOY_OUTPUT" | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -n 1 || true)"

if [ -n "$DEPLOYMENT_URL" ]; then
  echo "Running API/data gate for deployment URL $DEPLOYMENT_URL ..." >&2
  POLITICLEAR_EXPECT_RELEASE_STAGE="${POLITICLEAR_EXPECT_DEPLOY_STAGE:-live}" \
    node "$PROJECT_ROOT/scripts/validate_release_api.mjs" "$DEPLOYMENT_URL" >&2
  echo "Running browser smoke gate for deployment URL $DEPLOYMENT_URL ..." >&2
  POLITICLEAR_EXPECT_RELEASE_STAGE="${POLITICLEAR_EXPECT_DEPLOY_STAGE:-live}" \
    node "$PROJECT_ROOT/scripts/validate_release_ui.mjs" "$DEPLOYMENT_URL" >&2
fi

echo "Running API/data gate for canonical URL $CANONICAL_URL ..." >&2
POLITICLEAR_EXPECT_RELEASE_STAGE="${POLITICLEAR_EXPECT_CANONICAL_STAGE:-live}" \
  node "$PROJECT_ROOT/scripts/validate_release_api.mjs" "$CANONICAL_URL" >&2
echo "Running browser smoke gate for canonical URL $CANONICAL_URL ..." >&2
POLITICLEAR_EXPECT_RELEASE_STAGE="${POLITICLEAR_EXPECT_CANONICAL_STAGE:-live}" \
  node "$PROJECT_ROOT/scripts/validate_release_ui.mjs" "$CANONICAL_URL" >&2

node -e '
  const deploymentUrl = process.argv[1] || null;
  const canonicalUrl = process.argv[2];
  console.log(JSON.stringify({
    canonicalUrl,
    deploymentUrl,
    mode: "fixed-project",
    status: "validated"
  }, null, 2));
' "$DEPLOYMENT_URL" "$CANONICAL_URL"
