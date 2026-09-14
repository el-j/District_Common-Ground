package civic_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/district-cg/api/internal/civic"
	"github.com/district-cg/api/testutil"
)

// TestTicker_RequiresOnlyCoarseRegionCode is the Security & Privacy
// acceptance test from docs/tasks/M15-civic-networking-theme-shop.md:
// /api/v1/civic/ticker must work from nothing but a coarse ?region= query
// parameter — no GPS coordinates, no client IP, no User-Agent-derived
// location. The request below deliberately carries no headers at all (no
// X-Forwarded-For, no CF-Connecting-IP) and still succeeds, proving the
// handler never depends on them.
func TestTicker_RequiresOnlyCoarseRegionCode(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	handler := civic.NewHandler(civic.NewRepository(pool))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/civic/ticker?region=GENERIC", nil)
	req.RemoteAddr = "" // no IP available — must not matter
	rec := httptest.NewRecorder()

	handler.Ticker(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rec.Code)
	}
	var actions []civic.Action
	if err := json.Unmarshal(rec.Body.Bytes(), &actions); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(actions) != 4 {
		t.Fatalf("got %d actions, want 4 seeded GENERIC actions", len(actions))
	}

	// Omitting ?region= entirely must also work (falls back to a static
	// default, never inferred from the request).
	reqNoRegion := httptest.NewRequest(http.MethodGet, "/api/v1/civic/ticker", nil)
	recNoRegion := httptest.NewRecorder()
	handler.Ticker(recNoRegion, reqNoRegion)
	if recNoRegion.Code != http.StatusOK {
		t.Fatalf("got status %d for missing region, want 200", recNoRegion.Code)
	}
}

func TestChapters_RequiresOnlyCoarseRegionCode(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	handler := civic.NewHandler(civic.NewRepository(pool))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/civic/chapters?region=GENERIC", nil)
	req.RemoteAddr = ""
	rec := httptest.NewRecorder()

	handler.Chapters(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rec.Code)
	}
	var chapters []civic.Chapter
	if err := json.Unmarshal(rec.Body.Bytes(), &chapters); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(chapters) != 6 {
		t.Fatalf("got %d chapters, want 6 seeded GENERIC chapters", len(chapters))
	}
}
