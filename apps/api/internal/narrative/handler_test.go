package narrative_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/district-cg/api/internal/narrative"
)

// TestHandleDailyScenarios_OK verifies the endpoint returns 200 with valid JSON
// when no AI provider and no DB are configured (nil pool, nil client path).
func TestHandleDailyScenarios_OK(t *testing.T) {
	h := narrative.NewHandler(nil)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/narrative/daily-scenarios", nil)

	h.HandleDailyScenarios(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", w.Code, w.Body.String())
	}

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("unexpected Content-Type: %s", ct)
	}

	var resp struct {
		Scenarios   []json.RawMessage `json:"scenarios"`
		Source      string            `json:"source"`
		GeneratedAt string            `json:"generatedAt"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response is not valid JSON: %v\nbody: %s", err, w.Body.String())
	}

	if resp.GeneratedAt == "" {
		t.Error("generatedAt must be present in response")
	}
	if resp.Source == "" {
		t.Error("source must be present in response")
	}
	// With no AI and no DB, scenarios may be empty but array must be present
	if resp.Scenarios == nil {
		t.Error("scenarios field must not be null")
	}
}

// TestHandleDailyScenarios_Source_Empty verifies that source is "empty" when
// neither AI generation nor DB cache is available.
func TestHandleDailyScenarios_Source_Empty(t *testing.T) {
	h := narrative.NewHandler(nil)
	w := httptest.NewRecorder()
	h.HandleDailyScenarios(w, httptest.NewRequest(http.MethodGet, "/", nil))

	var resp struct {
		Source string `json:"source"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Source != "empty" {
		t.Errorf("expected source=empty (no AI, no DB), got %q", resp.Source)
	}
}

// TestHandleDailyScenarios_CacheControlHeader verifies the response carries
// a public cache-control directive suitable for CDN/browser caching.
func TestHandleDailyScenarios_CacheControlHeader(t *testing.T) {
	h := narrative.NewHandler(nil)
	w := httptest.NewRecorder()
	h.HandleDailyScenarios(w, httptest.NewRequest(http.MethodGet, "/", nil))

	cc := w.Header().Get("Cache-Control")
	if cc == "" {
		t.Error("Cache-Control header missing")
	}
}

// TestHandleDailyScenarios_FallbackOnAIError verifies that when the AI provider
// URL is unreachable (returns connection refused), the endpoint still returns
// 200 with valid JSON rather than a 500.
func TestHandleDailyScenarios_FallbackOnAIError(t *testing.T) {
	// Point AI provider at a server that immediately returns 503
	errSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	t.Cleanup(errSrv.Close)

	t.Setenv("AI_PROVIDER", "openai-compat")
	t.Setenv("AI_ENDPOINT", errSrv.URL)
	t.Setenv("AI_MODEL", "test-model")
	t.Setenv("AI_API_KEY", "test-key")

	h := narrative.NewHandler(nil)
	w := httptest.NewRecorder()
	h.HandleDailyScenarios(w, httptest.NewRequest(http.MethodGet, "/", nil))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 fallback, got %d", w.Code)
	}
	var resp struct {
		Scenarios []json.RawMessage `json:"scenarios"`
		Source    string            `json:"source"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response must be valid JSON even on AI error: %v", err)
	}
	// Source should not be "live" since AI failed
	if resp.Source == "live" {
		t.Error("source should not be live when AI returns error")
	}
}
