# Development Workflow

## Branching Strategy

```
main          → stable, release-ready
dev           → integration branch, PRs target here
feat/M1-*     → milestone 1 features
feat/M2-*     → milestone 2 features
fix/*         → bug fixes (target dev)
test/*        → test additions
```

Branch naming examples:
- `feat/M1-world-scene`
- `feat/M1-input-manager`
- `feat/M2-zustand-store`
- `feat/M3-npc-dialogue`
- `fix/collision-clipping`

**Never commit directly to `main`.** PRs to `dev` → merge `dev` into `main` at milestone completion.

## Commit Conventions (Conventional Commits)

```
feat(M1): implement WorldScene with responsive viewport
fix(M2): resolve autoplay policy error in SoundSynth
test(M3): add NPC proximity detection acceptance test
refactor(core): extract collision math to CollisionSystem
chore: update vite config for PWA plugin
```

Format: `type(scope): description`

Types: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`
Scopes: `M1`–`M6`, `core`, `world`, `ui`, `skins`, `audio`

## Sprint Cadence

Each milestone = one sprint. Sprints run until all acceptance criteria pass.

Sprint flow:
1. Pick the next `[ ]` task from the milestone's task file (`docs/tasks/Mx-*.md`)
2. Create a feature branch
3. Implement with tests
4. Verify automated acceptance criteria
5. Run `make dev-d` + `make ps` to confirm the full stack still builds and boots healthy (see Definition of Done below) — required before step 5, not optional
6. Check the task `[x]` in the task file
7. Update `docs/TASK-STATUS.md`
8. Open PR to `dev`

## Test-Driven Approach

Every milestone has automated acceptance tests listed in `docs/tasks/Mx-*.md`. Tests must pass before a milestone is closed. Write tests first when possible.

## Definition of Done

A task or epic is **not** done — even with lint, typecheck, and tests green — until the full Docker dev stack actually builds and comes up healthy:

```bash
make dev-d      # builds all images and starts web + api + db detached
make ps         # confirm every service is Up/healthy
make dev-logs   # (optional) tail logs to spot startup errors — Ctrl+C to stop
make dev-down   # tear back down once confirmed
```

This is required, not optional, because it is the only check that also proves the Go migrations run cleanly against a fresh Postgres, the API container's `CGO_ENABLED=0`/scratch build hasn't broken, and the web container's Vite build + nginx config still serve the SPA — none of which `go test`, `vitest`, or `tsc --noEmit` alone can catch. Run it as the last verification step before checking a task's box in `docs/tasks/Mx-*.md` or updating `docs/TASK-STATUS.md`.

(`make dev`, without `-d`, runs the same build but attaches to logs in the foreground — fine for interactive debugging, but use `make dev-d` for this check since it needs to return control to run `make ps`.)

## Task Status Updates

When starting a task: mark it `[~]` (in progress) in the task file.
When done: mark it `[x]`.
Update `docs/TASK-STATUS.md` milestone progress accordingly.

## Agent Instructions

When Claude Code agents pick up work:
1. Read `CLAUDE.md` first — architecture rules are non-negotiable
2. Check `docs/TASK-STATUS.md` for current sprint and open tasks
3. Read the relevant `docs/tasks/Mx-*.md` for exact acceptance criteria
4. Read the relevant `docs/stories/EPIC-0x-*.md` for the "why" behind the task
5. Respect the Headless Simulation rule — no skin assets in game logic
