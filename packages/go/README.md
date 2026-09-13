# District: Common Ground — Go Plugin Packages

This directory contains **standalone Go modules** for the District: Common Ground backend plugin ecosystem.

## Structure

```
packages/go/
  kernel-contracts/        ← Shared plugin interface (no external deps)
  plugin-courier-rush/     ← Cargo Courier Rush minigame backend plugin
  plugin-<name>/           ← Future plugins follow the same pattern
```

## Architecture

The `apps/api` binary uses an **in-process plugin registry** (`internal/kernel`). Each plugin is a **separate Go module** that depends only on `kernel-contracts` — never on the internal API packages.

```
┌────────────────────────────────────┐
│  apps/api  (the host binary)       │
│  ┌────────────────────────────┐    │
│  │ internal/kernel            │    │
│  │   Registry (DefaultRegistry)│   │
│  └──────────┬─────────────────┘    │
│             │ Register(GamePlugin) │
│  ┌──────────▼─────────────────┐    │
│  │ internal/plugins/          │    │
│  │   register.go ← EDIT HERE  │    │
│  │   RegisterAll() calls each │    │
│  │   plugin's Register(r)     │    │
│  └────────────────────────────┘    │
└────────────────────────────────────┘
         ↑ depends on
┌────────────────────────────────────┐
│  packages/go/plugin-courier-rush/  │  ← standalone module
│    implements kernel-contracts     │
│    exposes Register(Registrar)     │
└────────────────────────────────────┘
         ↑ depends on
┌────────────────────────────────────┐
│  packages/go/kernel-contracts/     │  ← pure Go, zero deps
│    GamePlugin interface            │
│    PluginMetadata, ResourceGrant…  │
└────────────────────────────────────┘
```

## Adding a New Backend Plugin

1. **Create the module**:
   ```
   mkdir -p packages/go/plugin-my-game
   cd packages/go/plugin-my-game
   ```

2. **Write `go.mod`**:
   ```
   module github.com/district-cg/plugin-my-game

   go 1.22.0

   require github.com/district-cg/kernel-contracts v0.1.0

   replace github.com/district-cg/kernel-contracts => ../kernel-contracts
   ```

3. **Implement `GamePlugin`** — copy `plugin-courier-rush/plugin.go` as a template.
   Expose a `Register(r Registrar)` function (no `init()` required).

4. **Wire it into the API** — edit these two files only:
   - `apps/api/go.mod`: add `require` + `replace`
   - `apps/api/internal/plugins/register.go`: add the `Register()` call

5. **Nothing else changes** — not `main.go`, not `internal/kernel/`, nothing.

## Local Development

`apps/api/go.mod` uses `replace` directives to resolve these modules locally
(equivalent to npm workspaces). No publishing to pkg.go.dev is required during development.

```go
replace (
    github.com/district-cg/kernel-contracts    => ../../packages/go/kernel-contracts
    github.com/district-cg/plugin-courier-rush => ../../packages/go/plugin-courier-rush
)
```
