package save_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/district-cg/api/internal/middleware"
	"github.com/district-cg/api/internal/save"
	"github.com/district-cg/api/testutil"
)

// ── Unit tests (no DB) ──────────────────────────────────────────────────────

func TestHandleDistrictResilience_NilPool_ReturnsNeutralDefaults(t *testing.T) {
	h := save.NewSolidarityHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/district/resilience", nil)
	rr := httptest.NewRecorder()
	h.HandleDistrictResilience(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var resp struct {
		GlobalIndex    float64 `json:"globalIndex"`
		TotalDecisions int     `json:"totalDecisions"`
		Message        string  `json:"message"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.GlobalIndex != 50.0 {
		t.Errorf("nil-pool: expected globalIndex 50.0, got %v", resp.GlobalIndex)
	}
	if resp.TotalDecisions != 0 {
		t.Errorf("nil-pool: expected 0 decisions, got %d", resp.TotalDecisions)
	}
	if resp.Message == "" {
		t.Error("expected non-empty message")
	}
}

func TestHandleDistrictResilience_CacheControlHeader(t *testing.T) {
	h := save.NewSolidarityHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/district/resilience", nil)
	rr := httptest.NewRecorder()
	h.HandleDistrictResilience(rr, req)

	if cc := rr.Header().Get("Cache-Control"); cc == "" {
		t.Error("Cache-Control header must be set")
	}
}

func TestHandleDistrictResilience_ResponseShape(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	h := save.NewSolidarityHandler(pool)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/district/resilience", nil)
	rr := httptest.NewRecorder()
	h.HandleDistrictResilience(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	ct := rr.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type: got %q, want application/json", ct)
	}

	cc := rr.Header().Get("Cache-Control")
	if cc == "" {
		t.Error("expected Cache-Control header to be set")
	}

	var resp struct {
		GlobalIndex     float64 `json:"globalIndex"`
		SolidarityCount int     `json:"solidarityCount"`
		ScapegoatCount  int     `json:"scapegoatCount"`
		TotalDecisions  int     `json:"totalDecisions"`
		Message         string  `json:"message"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	// No data → neutral default
	if resp.GlobalIndex != 50.0 {
		t.Errorf("expected globalIndex 50.0 (neutral), got %v", resp.GlobalIndex)
	}
	if resp.TotalDecisions != 0 {
		t.Errorf("expected 0 total decisions on empty DB, got %d", resp.TotalDecisions)
	}
	if resp.Message == "" {
		t.Error("expected non-empty message")
	}
}

func TestHandleDistrictResilience_WithData(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	ctx := context.Background()

	// Seed a user then insert 3 solidarity + 1 scapegoat decisions
	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('pool-test@example.com', 'hash') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	type row struct{ choice string }
	rows := []row{{"solidarity"}, {"solidarity"}, {"solidarity"}, {"scapegoat"}}
	for i, r := range rows {
		_, err := pool.Exec(ctx,
			`INSERT INTO crisis_log (user_id, crisis_id, day, choice) VALUES ($1, $2, $3, $4)`,
			userID, "test-crisis", i+1, r.choice,
		)
		if err != nil {
			t.Fatalf("insert row %d: %v", i, err)
		}
	}

	h := save.NewSolidarityHandler(pool)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/district/resilience", nil)
	rr := httptest.NewRecorder()
	h.HandleDistrictResilience(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var resp struct {
		GlobalIndex     float64 `json:"globalIndex"`
		SolidarityCount int     `json:"solidarityCount"`
		ScapegoatCount  int     `json:"scapegoatCount"`
		TotalDecisions  int     `json:"totalDecisions"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if resp.SolidarityCount != 3 {
		t.Errorf("solidarityCount: got %d, want 3", resp.SolidarityCount)
	}
	if resp.ScapegoatCount != 1 {
		t.Errorf("scapegoatCount: got %d, want 1", resp.ScapegoatCount)
	}
	if resp.TotalDecisions != 4 {
		t.Errorf("totalDecisions: got %d, want 4", resp.TotalDecisions)
	}
	// 3/4 * 100 = 75.0
	if resp.GlobalIndex != 75.0 {
		t.Errorf("globalIndex: got %v, want 75.0", resp.GlobalIndex)
	}
}

// TestHandleRecordCrisisChoice_EndToEnd_ChangesAggregate proves the write path
// closes the audit's "hollow Solidarity Pool" gap: a real POST through the
// handler — not a test fixture INSERT — must move the aggregate returned by
// GET /api/v1/district/resilience.
func TestHandleRecordCrisisChoice_EndToEnd_ChangesAggregate(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	ctx := context.Background()
	h := save.NewSolidarityHandler(pool)

	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('e2e-pool-test@example.com', 'hash') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	// Baseline: no decisions yet -> neutral default.
	baselineReq := httptest.NewRequest(http.MethodGet, "/api/v1/district/resilience", nil)
	baselineRR := httptest.NewRecorder()
	h.HandleDistrictResilience(baselineRR, baselineReq)
	var baseline struct {
		TotalDecisions int `json:"totalDecisions"`
	}
	if err := json.NewDecoder(baselineRR.Body).Decode(&baseline); err != nil {
		t.Fatalf("decode baseline: %v", err)
	}
	if baseline.TotalDecisions != 0 {
		t.Fatalf("expected 0 baseline decisions, got %d", baseline.TotalDecisions)
	}

	// Real write path: POST through the handler exactly as CrisisEngine.ts does.
	body, _ := json.Marshal(map[string]any{
		"crisisId": "e2e-crisis-01",
		"day":      3,
		"choice":   "solidarity",
	})
	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/district/crisis-log", bytes.NewReader(body))
	postReq = postReq.WithContext(context.WithValue(postReq.Context(), middleware.UserIDKey, userID))
	postRR := httptest.NewRecorder()
	h.HandleRecordCrisisChoice(postRR, postReq)
	if postRR.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", postRR.Code, postRR.Body.String())
	}

	// The aggregate must now reflect the live write, not a fixture.
	afterReq := httptest.NewRequest(http.MethodGet, "/api/v1/district/resilience", nil)
	afterRR := httptest.NewRecorder()
	h.HandleDistrictResilience(afterRR, afterReq)
	var after struct {
		TotalDecisions  int     `json:"totalDecisions"`
		SolidarityCount int     `json:"solidarityCount"`
		GlobalIndex     float64 `json:"globalIndex"`
	}
	if err := json.NewDecoder(afterRR.Body).Decode(&after); err != nil {
		t.Fatalf("decode after: %v", err)
	}
	if after.TotalDecisions != 1 {
		t.Fatalf("expected 1 decision after live POST, got %d", after.TotalDecisions)
	}
	if after.SolidarityCount != 1 {
		t.Fatalf("expected 1 solidarity decision, got %d", after.SolidarityCount)
	}
	if after.GlobalIndex != 100.0 {
		t.Fatalf("expected globalIndex 100.0 after one solidarity choice, got %v", after.GlobalIndex)
	}
}

// TestHandleResilienceByScenario_MixedChoicesAcrossScenarios is M13 Test
// 13.6: a per-crisis_id breakdown of seeded mixed-choice rows across two
// scenarios returns correct counts and flags the skewed one.
func TestHandleResilienceByScenario_MixedChoicesAcrossScenarios(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	ctx := context.Background()

	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('by-scenario-test@example.com', 'hash') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	type row struct{ crisisID, choice string }
	rows := []row{
		// "crisis-a": 9 solidarity / 1 scapegoat -> 90%, skewed (>85%)
		{"crisis-a", "solidarity"}, {"crisis-a", "solidarity"}, {"crisis-a", "solidarity"},
		{"crisis-a", "solidarity"}, {"crisis-a", "solidarity"}, {"crisis-a", "solidarity"},
		{"crisis-a", "solidarity"}, {"crisis-a", "solidarity"}, {"crisis-a", "solidarity"},
		{"crisis-a", "scapegoat"},
		// "crisis-b": 1 solidarity / 1 scapegoat -> 50%, not skewed
		{"crisis-b", "solidarity"}, {"crisis-b", "scapegoat"},
	}
	for i, r := range rows {
		if _, err := pool.Exec(ctx,
			`INSERT INTO crisis_log (user_id, crisis_id, day, choice) VALUES ($1, $2, $3, $4)`,
			userID, r.crisisID, i+1, r.choice,
		); err != nil {
			t.Fatalf("insert row %d: %v", i, err)
		}
	}

	h := save.NewSolidarityHandler(pool)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/district/resilience/by-scenario", nil)
	rr := httptest.NewRecorder()
	h.HandleResilienceByScenario(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var resp struct {
		Scenarios []struct {
			CrisisID        string  `json:"crisisId"`
			SolidarityCount int     `json:"solidarityCount"`
			ScapegoatCount  int     `json:"scapegoatCount"`
			SolidarityRatio float64 `json:"solidarityRatio"`
			Skewed          bool    `json:"skewed"`
		} `json:"scenarios"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp.Scenarios) != 2 {
		t.Fatalf("expected 2 scenarios, got %d", len(resp.Scenarios))
	}

	byID := map[string]struct {
		SolidarityCount int
		ScapegoatCount  int
		SolidarityRatio float64
		Skewed          bool
	}{}
	for _, s := range resp.Scenarios {
		byID[s.CrisisID] = struct {
			SolidarityCount int
			ScapegoatCount  int
			SolidarityRatio float64
			Skewed          bool
		}{s.SolidarityCount, s.ScapegoatCount, s.SolidarityRatio, s.Skewed}
	}

	a := byID["crisis-a"]
	if a.SolidarityCount != 9 || a.ScapegoatCount != 1 {
		t.Errorf("crisis-a: got solidarity=%d scapegoat=%d, want 9/1", a.SolidarityCount, a.ScapegoatCount)
	}
	if a.SolidarityRatio != 90.0 || !a.Skewed {
		t.Errorf("crisis-a: got ratio=%v skewed=%v, want 90.0/true", a.SolidarityRatio, a.Skewed)
	}

	b := byID["crisis-b"]
	if b.SolidarityCount != 1 || b.ScapegoatCount != 1 {
		t.Errorf("crisis-b: got solidarity=%d scapegoat=%d, want 1/1", b.SolidarityCount, b.ScapegoatCount)
	}
	if b.SolidarityRatio != 50.0 || b.Skewed {
		t.Errorf("crisis-b: got ratio=%v skewed=%v, want 50.0/false", b.SolidarityRatio, b.Skewed)
	}
}

func TestHandleRecordCrisisChoice_Unauthenticated_Returns401(t *testing.T) {
	h := save.NewSolidarityHandler(nil)
	body, _ := json.Marshal(map[string]any{"crisisId": "x", "day": 1, "choice": "solidarity"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/district/crisis-log", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	h.HandleRecordCrisisChoice(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthenticated request, got %d", rr.Code)
	}
}

func TestHandleRecordCrisisChoice_InvalidChoice_Returns400(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	h := save.NewSolidarityHandler(pool)
	body, _ := json.Marshal(map[string]any{"crisisId": "x", "day": 1, "choice": "not-a-real-choice"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/district/crisis-log", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "irrelevant-user"))
	rr := httptest.NewRecorder()
	h.HandleRecordCrisisChoice(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid choice, got %d", rr.Code)
	}
}
