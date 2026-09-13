// Package plugins is the microkernel's plugin registration manifest.
// It is the ONLY file that ever needs to change when adding a new minigame backend.
// Nothing under internal/kernel/ or cmd/server/main.go ever changes.
//
// # How to add a new minigame backend plugin
//
//  1. Create packages/go/plugin-<name>/ as a standalone Go module that depends
//     only on github.com/district-cg/kernel-contracts
//  2. Implement kc.GamePlugin; expose a Register(r Registrar) function
//  3. Add `require` + `replace` for the module in apps/api/go.mod
//  4. Import the package here and call PluginName.Register(kernel.DefaultRegistry)
//
// That is all. The kernel, the HTTP handlers, and main.go remain untouched.
package plugins

import (
	"github.com/district-cg/api/internal/kernel"
	courierrush "github.com/district-cg/plugin-courier-rush"
)

// RegisterAll wires every standalone plugin into the host registry.
// Called once from cmd/server/main.go before the HTTP server starts.
func RegisterAll() {
	courierrush.Register(kernel.DefaultRegistry)
	// To add the next plugin:
	//   myfootball.Register(kernel.DefaultRegistry)
}
