// Package plugins is the microkernel's plugin registration manifest.
// Bundled plugins stay explicit here, while runtime-discovered plugins are
// loaded from disk without changing server code.
//
// # How to add a new minigame backend plugin
//
//  1. Create packages/go/plugin-<name>/ as a standalone Go module that depends
//     only on github.com/district-cg/kernel-contracts
//  2. Implement kc.GamePlugin; expose a Register(r kernel.Registrar) function
//  3. Build the plugin module as a .so and drop it into ./plugins while the
//     API server is running
//  4. The loader in this package discovers and registers it automatically
//
// Bundled plugins can still be registered explicitly below.
package plugins

import (
	"log"
	"os"
	"path/filepath"
	goplugin "plugin"
	"strings"
	"sync"
	"time"

	"github.com/district-cg/api/internal/kernel"
	courierrush "github.com/district-cg/plugin-courier-rush"
)

const (
	defaultPluginDir   = "./plugins"
	pluginPollInterval = 2 * time.Second
)

var registerOnce sync.Once

// RegisterAll wires every standalone plugin into the host registry.
// Called once from cmd/server/main.go before the HTTP server starts.
func RegisterAll() {
	courierrush.Register(kernel.DefaultRegistry)
	registerOnce.Do(func() {
		loader := newRuntimeLoader(kernel.DefaultRegistry, defaultPluginDir)
		loader.loadExisting()
		go loader.watch()
	})
}

type pluginArtifact interface {
	Lookup(symbolName string) (goplugin.Symbol, error)
}

var openPlugin = func(path string) (pluginArtifact, error) {
	return goplugin.Open(path)
}

type runtimeLoader struct {
	registry *kernel.Registry
	dir      string

	mu     sync.Mutex
	loaded map[string]struct{}
}

func newRuntimeLoader(registry *kernel.Registry, dir string) *runtimeLoader {
	return &runtimeLoader{
		registry: registry,
		dir:      dir,
		loaded:   make(map[string]struct{}),
	}
}

func (l *runtimeLoader) watch() {
	ticker := time.NewTicker(pluginPollInterval)
	defer ticker.Stop()

	for range ticker.C {
		l.loadExisting()
	}
}

func (l *runtimeLoader) loadExisting() {
	if err := filepath.WalkDir(l.dir, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".so") {
			return nil
		}
		l.load(path)
		return nil
	}); err != nil && !os.IsNotExist(err) {
		log.Printf("plugins: scan %s: %v", l.dir, err)
	}
}

func (l *runtimeLoader) load(path string) {
	l.mu.Lock()
	if _, ok := l.loaded[path]; ok {
		l.mu.Unlock()
		return
	}
	l.mu.Unlock()

	mod, err := openPlugin(path)
	if err != nil {
		log.Printf("plugins: open %s: %v", path, err)
		return
	}

	sym, err := mod.Lookup("Register")
	if err != nil {
		log.Printf("plugins: lookup Register in %s: %v", path, err)
		return
	}

	register, ok := sym.(func(kernel.Registrar))
	if !ok {
		log.Printf("plugins: %s has incompatible Register symbol", path)
		return
	}

	register(l.registry)
	l.mu.Lock()
	l.loaded[path] = struct{}{}
	l.mu.Unlock()
	log.Printf("plugins: loaded %s", path)
}
