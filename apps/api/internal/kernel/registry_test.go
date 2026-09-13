package kernel_test

import (
	"context"
	"errors"
	"testing"

	"github.com/district-cg/api/internal/kernel"
)

type mockPlugin struct {
	id      string
	healthy bool
}

func (m *mockPlugin) Metadata() kernel.PluginMetadata {
	return kernel.PluginMetadata{ID: m.id, Name: m.id, Version: "1.0.0"}
}
func (m *mockPlugin) StartSession(context.Context, kernel.SessionConfig) (string, error) { return "tok", nil }
func (m *mockPlugin) ProcessInput(context.Context, string, kernel.GameInputEvent) error   { return nil }
func (m *mockPlugin) ComputeScore(context.Context, string, []byte) (kernel.GameSessionResult, error) {
	return kernel.GameSessionResult{}, nil
}
func (m *mockPlugin) HealthCheck(context.Context) error {
	if !m.healthy {
		return errors.New("unhealthy")
	}
	return nil
}

func TestRegistry_RegisterAndGet(t *testing.T) {
	r := kernel.NewRegistry()
	p := &mockPlugin{id: "test-game", healthy: true}
	r.Register(p)

	got, ok := r.Get("test-game")
	if !ok {
		t.Fatal("expected plugin to be found")
	}
	if got.Metadata().ID != "test-game" {
		t.Errorf("got %q, want %q", got.Metadata().ID, "test-game")
	}
}

func TestRegistry_Get_MissingPlugin(t *testing.T) {
	r := kernel.NewRegistry()
	_, ok := r.Get("does-not-exist")
	if ok {
		t.Fatal("expected plugin to be missing")
	}
}

func TestRegistry_List_ExcludesUnhealthyPlugins(t *testing.T) {
	r := kernel.NewRegistry()
	r.Register(&mockPlugin{id: "healthy-game", healthy: true})
	r.Register(&mockPlugin{id: "sick-game", healthy: false})

	list := r.List(context.Background())
	if len(list) != 1 {
		t.Fatalf("expected 1 healthy plugin, got %d", len(list))
	}
	if list[0].ID != "healthy-game" {
		t.Errorf("got %q, want %q", list[0].ID, "healthy-game")
	}
}

// TestRegistry_MockPlugin_CanBeRegisteredWithoutTouchingKernelPackage demonstrates
// the "zero core modification" contract: a brand-new plugin type only needs to
// implement kernel.GamePlugin and call Register — nothing in this package changes.
func TestRegistry_MockPlugin_CanBeRegisteredWithoutTouchingKernelPackage(t *testing.T) {
	r := kernel.NewRegistry()
	r.Register(&mockPlugin{id: "brand-new-game", healthy: true})
	list := r.List(context.Background())
	if len(list) != 1 || list[0].ID != "brand-new-game" {
		t.Fatalf("expected brand-new-game to appear in catalog, got %+v", list)
	}
}
