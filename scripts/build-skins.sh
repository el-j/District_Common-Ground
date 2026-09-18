#!/usr/bin/env bash
# M30 — builds the 3 hi-fi skin renderer packages into standalone ESM
# bundles under apps/web/public/plugins/skins/<id>/index.js, so they can be
# loaded at runtime via SkinRendererLoader.loadRemoteSkinRenderer() instead
# of being compiled into the main app bundle. Must run before any apps/web
# build (dev or production) since Vite copies public/ as-is at build time.
# Mirrors scripts/build-minigames.sh exactly.
set -euo pipefail

SKINS=(diorama-glow flat-vector neon-city)

for skin in "${SKINS[@]}"; do
  echo "Building @district-cg/skin-${skin}..."
  npm run build --workspace="@district-cg/skin-${skin}"
done
