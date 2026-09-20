#!/usr/bin/env bash
# M30 — builds the hi-fi skin renderer packages into standalone ESM
# bundles under apps/web/public/plugins/skins/<id>/index.js, so they can be
# loaded at runtime via SkinRendererLoader.loadRemoteSkinRenderer() instead
# of being compiled into the main app bundle. Must run before any apps/web
# build (dev or production) since Vite copies public/ as-is at build time.
# Mirrors scripts/build-minigames.sh exactly.
# M50 — EPIC-37 §2 added painterly-depth, the 4th hi-fi renderer package.
set -euo pipefail

SKINS=(diorama-glow flat-vector neon-city painterly-depth)

for skin in "${SKINS[@]}"; do
  echo "Building @district-cg/skin-${skin}..."
  npm run build --workspace="@district-cg/skin-${skin}"
done
