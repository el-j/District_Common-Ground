package kernel

import (
	"context"
	"fmt"
	"sync"
)

// Registry is a thread-safe, in-process plugin catalog. Plugins register themselves
// (see internal/plugins/register.go) — this type is never edited to add a game.
type Registry struct {
	mu      sync.RWMutex
	plugins map[string]GamePlugin
}

func NewRegistry() *Registry {
	return &Registry{plugins: make(map[string]GamePlugin)}
}

// DefaultRegistry is the process-wide registry plugin packages register into from init().
var DefaultRegistry = NewRegistry()

func (r *Registry) Register(p GamePlugin) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.plugins[p.Metadata().ID] = p
}

func (r *Registry) Get(id string) (GamePlugin, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.plugins[id]
	return p, ok
}

// List returns metadata for every registered plugin that currently passes its
// own health check, so an unhealthy plugin drops out of the public catalog
// without taking the rest of the platform down.
func (r *Registry) List(ctx context.Context) []PluginMetadata {
	r.mu.RLock()
	snapshot := make([]GamePlugin, 0, len(r.plugins))
	for _, p := range r.plugins {
		snapshot = append(snapshot, p)
	}
	r.mu.RUnlock()

	out := make([]PluginMetadata, 0, len(snapshot))
	for _, p := range snapshot {
		if err := p.HealthCheck(ctx); err != nil {
			continue
		}
		out = append(out, p.Metadata())
	}
	return out
}

var ErrPluginNotFound = fmt.Errorf("plugin not found")
