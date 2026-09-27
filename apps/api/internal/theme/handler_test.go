package theme_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/district-cg/api/internal/kernel"
	"github.com/district-cg/api/internal/theme"
	"github.com/district-cg/api/testutil"
)

func TestThemeList_BuiltInThemes(t *testing.T) {
	h := theme.NewHandler(nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/themes", nil)
	rec := httptest.NewRecorder()
	h.List(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var themes []kernel.PluginMetadata
	if err := json.Unmarshal(rec.Body.Bytes(), &themes); err != nil {
		t.Fatalf("failed to decode themes: %v", err)
	}

	if len(themes) < 9 {
		t.Errorf("expected at least 9 built-in themes, got %d", len(themes))
	}

	themeMap := make(map[string]kernel.PluginMetadata)
	for _, th := range themes {
		themeMap[th.ID] = th
	}

	expectedIDs := []string{
		"solarpunk", "retro_gb", "labor_woodcut", "aurora", "sunset_commons",
		"diorama_glow", "flat_vector", "neon_city", "painterly_depth",
	}
	for _, id := range expectedIDs {
		if _, ok := themeMap[id]; !ok {
			t.Errorf("expected theme %s in response", id)
		}
	}
}

func TestThemeList_WithVerifiedPlugins(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	pool := testutil.NewPostgres(t)
	repo := kernel.NewRepository(pool)
	h := theme.NewHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/themes", nil)
	rec := httptest.NewRecorder()
	h.List(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var themes []kernel.PluginMetadata
	if err := json.Unmarshal(rec.Body.Bytes(), &themes); err != nil {
		t.Fatalf("failed to decode themes: %v", err)
	}

	if len(themes) < 9 {
		t.Errorf("expected at least 9 themes, got %d", len(themes))
	}
}
