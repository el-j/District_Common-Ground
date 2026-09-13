# TD1 — Runtime `.so` Plugin Loader Conflicts with `CGO_ENABLED=0`

Status: `[!] Blocked` (not urgent — fails safe, does not break the build or crash the server)
Found: 2026-09-13, during M15 implementation pass
Affected file: `apps/api/internal/plugins/register.go`

---

## The Problem

`internal/plugins/register.go` implements a background `runtimeLoader` that watches
`./plugins` on disk and hot-loads `.so` files via Go's native `plugin` package
(`goplugin "plugin"`, i.e. `plugin.Open`) — intended to let a standalone Go plugin
module (see `packages/go/plugin-courier-rush/`) be dropped in and registered into
`kernel.DefaultRegistry` without a server rebuild.

This directly conflicts with two hard constraints from `CLAUDE.md`:

- `Go binary must be CGO_ENABLED=0` (scratch images + Wails portability)
- `apps/api/Dockerfile` final stage is `FROM scratch` (no dynamic linker at all)

Go's `plugin` package requires cgo to actually open a `.so` — under
`CGO_ENABLED=0` the stdlib ships a stub implementation that compiles cleanly but
returns an error at runtime (`plugin.Open` always fails: "plugin: not
implemented"). Even if cgo were re-enabled, a `FROM scratch` image has no `ld.so`
to resolve a shared object against, so `.so` loading could never work in the
production container either way.

**Net effect today:** the feature is dead code in production. `loadExisting()`/
`watch()` run harmlessly (empty directory, or `plugin.Open` errors get logged and
skipped — confirmed non-fatal), and `go build ./...` / `go vet ./...` both pass
because the stub compiles. It only silently does nothing; it does not crash,
hang, or fail the build. This is why it wasn't treated as a shipped-bug and is
tracked here as tech debt instead.

This also contradicts the M14 planning decision that shipped the in-process
registry model in the first place (`docs/planning/14-...md` / the M14 plan):
*"in-process Go interface registry... True dynamic/remote loading is noted as a
future v2, not attempted now."* The runtime `.so` loader was added after that
decision without revisiting it — it should either be removed to match the
documented architecture, or the architecture decision should be explicitly
revisited and the constraint dropped for a specific reason.

## Why This Matters

- It's misleading: the doc comment on the package ("drop a `.so` into `./plugins`
  while the server is running") describes a workflow that cannot function in the
  shipped Docker image, so anyone following it will be confused when nothing
  happens.
- It's a startup cost for nothing: the `2s` poll ticker + directory walk runs
  forever for a feature that can never succeed under the current build.
- Standalone plugin modules (`packages/go/plugin-courier-rush/`) currently only
  actually reach the registry via the static, explicit
  `courierrush.Register(kernel.DefaultRegistry)` call in `RegisterAll()` — i.e.
  the *real*, working mechanism is build-time linking, not the runtime loader.

## Options to Resolve

1. **(Recommended, lowest risk)** Delete `runtimeLoader`/`watch`/`loadExisting`/
   `load`/`openPlugin` and the `goplugin "plugin"` import from
   `register.go` entirely. Keep only the explicit static `Register(...)` calls
   pattern already proven with `plugin-courier-rush`. Update the package doc
   comment to describe the real workflow: *"new plugin module → add a blank
   import + `Register()` call here → rebuild the server binary."* This matches
   what M14's plan actually decided and removes dead/misleading code.
2. Keep true runtime hot-loading, but change the transport to something that
   works under `CGO_ENABLED=0` + `scratch` — e.g. a subprocess-per-plugin model
   over gRPC/JSON-RPC (like HashiCorp's `go-plugin`), or a WASM host (`wazero`,
   pure Go, no cgo) running plugins compiled to `.wasm`. This is a real
   architecture change (separate binaries or a WASM ABI to design) and should be
   scoped as its own milestone if the product actually needs live hot-reload of
   backend plugins — not a quick fix.
3. Do nothing for now (status quo): acceptable short-term since it fails safe,
   but leaves misleading docs/comments and a pointless background poll loop.

## Acceptance Criteria (once picked up)

- [ ] Decide between Option 1 (remove) and Option 2 (real dynamic loading via
      subprocess/WASM) — default to Option 1 unless there's a concrete near-term
      need for live plugin hot-reload without a redeploy.
- [ ] If Option 1: `register.go` no longer imports `plugin` (verify via
      `go build ./...` and `grep -r '"plugin"' apps/api/internal/`); package doc
      comment updated to match reality; no behavior change to
      `courierrush.Register` static path.
- [ ] If Option 2: new design doc under `docs/planning/` covering the transport,
      plugin binary/wasm packaging, and how it's built/shipped in Docker without
      violating `CGO_ENABLED=0`/`FROM scratch` for the *main* API binary; a
      sidecar or separate build target is fine as long as the primary server
      image is untouched.
- [ ] `go vet ./...` and `go test -short ./...` pass with no regressions either
      way.
