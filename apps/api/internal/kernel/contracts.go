// Package kernel implements the M14 microkernel: an in-process, self-registering
// plugin registry for minigames. See docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md
// section 3.1 for the architectural rationale (in-process interface registry chosen
// over WASM/subprocess plugins to keep CGO_ENABLED=0 static-binary builds intact).
//
// # Plugin Architecture
//
// The canonical type definitions live in the shared github.com/district-cg/kernel-contracts
// module. This package re-exports them as type aliases so the rest of the API (handler.go,
// registry.go, etc.) can continue using unqualified names like kernel.GamePlugin, while
// standalone plugin modules depend only on the lightweight kernel-contracts module — never
// on this internal package.
//
// Adding a new minigame backend plugin:
//  1. Create packages/go/plugin-<name>/ as a new Go module
//  2. Import github.com/district-cg/kernel-contracts and implement GamePlugin
//  3. Expose SetRegistrar and call registrar.Register(&Plugin{}) in init()
//  4. In apps/api: add require + replace to go.mod, call SetRegistrar, blank-import
package kernel

import (
	kc "github.com/district-cg/kernel-contracts"
)

// Re-export the shared contract types as aliases so the rest of this package
// and its callers are unaffected by the move to a shared module.
type (
	PluginMetadata    = kc.PluginMetadata
	Registrar         = kc.Registrar
	SessionConfig     = kc.SessionConfig
	GameInputEvent    = kc.GameInputEvent
	ResourceGrant     = kc.ResourceGrant
	GameSessionResult = kc.GameSessionResult
	// GamePlugin is the contract every minigame backend module implements.
	// A plugin self-registers into DefaultRegistry from its own init()
	// (see internal/plugins/register.go) — adding a plugin never requires
	// editing this package.
	GamePlugin = kc.GamePlugin
)
