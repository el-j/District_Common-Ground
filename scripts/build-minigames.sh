#!/usr/bin/env bash
# M29 — builds the 5 built-in minigame packages into standalone ESM bundles
# under apps/web/public/plugins/<id>/index.js, so they can be loaded at
# runtime via MinigameLoader.loadRemoteMinigame() instead of being compiled
# into the main app bundle. Must run before any apps/web build (dev or
# production) since Vite copies public/ as-is at build time.
set -euo pipefail

GAMES=(courier-rush kitchen-rush solidarity-line tenant-match tool-workshop)

for game in "${GAMES[@]}"; do
  echo "Building @district-cg/minigame-${game}..."
  npm run build --workspace="@district-cg/minigame-${game}"
done
