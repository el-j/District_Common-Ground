// Package plugins is the microkernel's plugin registration manifest. Adding a
// new minigame means adding a new package under internal/plugins/<name>/ whose
// init() calls kernel.DefaultRegistry.Register(...), then blank-importing it
// here. Nothing under internal/kernel/ or cmd/server/main.go ever changes.
package plugins

import (
	_ "github.com/district-cg/api/internal/plugins/courierrush"
)
