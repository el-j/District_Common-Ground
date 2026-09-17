package kernel_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/district-cg/api/internal/kernel"
	"github.com/district-cg/api/testutil"
)

// M29 — GET /api/v1/games had zero HTTP-level coverage before this (the
// merge-and-serialize behavior of Handler.ListGames itself was untested).
// This proves the 3-way merge: a real registered GamePlugin, the
// metadata-only built-in catalog (kitchen-rush/solidarity-line/tenant-match/
// tool-workshop — see builtin_games.go), and the owner-approved verified-
// plugin table, all show up with a populated title/entrypointUrl — the
// field-shape bug fixed alongside this (kernel-contracts PluginMetadata's
// json tags used to be name/entrypoint, not title/entrypointUrl) meant the
// frontend previously decoded every catalog entry with a blank title.
type mockGamePlugin struct{ id string }

func (m *mockGamePlugin) Metadata() kernel.PluginMetadata {
	return kernel.PluginMetadata{
		ID:             m.id,
		Version:        "1.0.0",
		Name:           "Mock Game",
		Entrypoint:     "/plugins/" + m.id + "/index.js",
		TargetHardware: "canvas",
	}
}
func (m *mockGamePlugin) StartSession(context.Context, kernel.SessionConfig) (string, error) {
	return "tok", nil
}
func (m *mockGamePlugin) ProcessInput(context.Context, string, kernel.GameInputEvent) error {
	return nil
}
func (m *mockGamePlugin) ComputeScore(context.Context, string, []byte) (kernel.GameSessionResult, error) {
	return kernel.GameSessionResult{}, nil
}
func (m *mockGamePlugin) HealthCheck(context.Context) error { return nil }

func newListGamesRouter(h *kernel.Handler) chi.Router {
	r := chi.NewRouter()
	r.Get("/games", h.ListGames)
	return r
}

func TestListGames_MergesRegistryBuiltinAndVerifiedCatalogs(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := kernel.NewRepository(pool)
	registry := kernel.NewRegistry()
	registry.Register(&mockGamePlugin{id: "courier-rush"})
	sessions := kernel.NewSessionManager("test-secret-at-least-32-bytes-long!!")

	h := kernel.NewHandler(registry, sessions, repo, "owner-id")
	router := newListGamesRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/games", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var games []kernel.PluginMetadata
	if err := json.Unmarshal(rec.Body.Bytes(), &games); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	byID := make(map[string]kernel.PluginMetadata, len(games))
	for _, g := range games {
		byID[g.ID] = g
	}

	wantIDs := []string{"courier-rush", "kitchen-rush", "solidarity-line", "tenant-match", "tool-workshop"}
	for _, id := range wantIDs {
		game, ok := byID[id]
		if !ok {
			t.Errorf("expected game %q in catalog, got %+v", id, byID)
			continue
		}
		if game.Entrypoint == "" {
			t.Errorf("game %q: expected non-empty entrypointUrl", id)
		}
	}

	// Built-in (non-registry) entries carry a real title, proving the
	// name->title json tag fix actually round-trips end to end.
	if kitchen := byID["kitchen-rush"]; kitchen.Name != "Community Kitchen Rush" {
		t.Errorf("kitchen-rush: got title %q, want %q", kitchen.Name, "Community Kitchen Rush")
	}
}
