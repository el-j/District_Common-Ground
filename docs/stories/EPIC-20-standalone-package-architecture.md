# EPIC 20 — Standalone Package Architecture for Minigames & Plugins

Planning: [`docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md)
Tasks: [`docs/tasks/M20-standalone-packages-cleanup.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M20-standalone-packages-cleanup.md)

## Why This Milestone Exists

By the time M14's addendum and M17–M19 landed, every minigame and transport plugin (`minigame-courier-rush`, `plugin-geo-weather`, `plugin-mesh-comms`, `plugin-mutual-credit`, `plugin-bitchat`) was already a standalone `packages/*` workspace package, registering itself with the Kernel — the core architectural requirement this planning doc describes was arrived at organically, milestone by milestone, before this doc formally named it. M20 is therefore a **cleanup and completion pass**, not a from-scratch build: bring the existing packages fully into line with the contract this doc specifies, and build the one capability (remote dynamic loading) that was never actually attempted.

## User Stories

**As a third-party contributor**, I want to build a new minigame or transport as a package with a standard `dev`/`build`/`check` script surface, so I can develop and test it in isolation without needing to understand the main shell's build setup.

**As the platform**, I want a genuinely working remote-URL dynamic-import path (not just a local in-tree `import()`), so a community-hosted, unbundled minigame package can actually be loaded and launched — today only `MinigameLoader.registerLocalMinigame()` exists; there is no equivalent for `entrypointUrl`-based remote loading despite it being named in the planning doc's Host Dynamic Loading Protocol.

**As a maintainer**, I want consistent naming across the mockup topology diagram and the real packages, so `transport-bitchat` (the doc's name) and `plugin-bitchat` (the real package) don't quietly diverge into confusing, hard-to-search naming across the repo.

## Acceptance Criteria

- Every `packages/plugin-*`, `packages/minigame-*`, and `packages/go/*` package has real `dev`, `build`, and `check` (or `typecheck`) scripts matching the planning doc's contract, not just `typecheck` alone.
- `MinigameLoader` (or an equivalent) can load a minigame from a manifest's `entrypointUrl` via a real dynamic `import()`, sandboxed the same way local minigames are, with at least one test proving a "remote" module (a same-origin fixture is fine for the test) loads and mounts correctly.
- The naming discrepancy between the planning doc's mockup (`transport-bitchat`) and the real package (`plugin-bitchat`) is resolved one way or the other — either the doc is corrected to match the `plugin-*` convention its three siblings already use, or the package is renamed for consistency with the doc. Given `plugin-*` is the convention already used by 4 of 4 shipped plugins, correcting the doc is the lower-risk option.
