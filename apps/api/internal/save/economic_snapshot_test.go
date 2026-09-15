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

func TestHandleAttritionRate_NilPool_ReturnsZeroDefaults(t *testing.T) {
	h := save.NewEconomicSnapshotHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/district/attrition", nil)
	rr := httptest.NewRecorder()
	h.HandleAttritionRate(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	var resp struct {
		AttritionRate float64 `json:"attritionRate"`
		SampleSize    int     `json:"sampleSize"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.AttritionRate != 0 || resp.SampleSize != 0 {
		t.Errorf("nil-pool: expected zero defaults, got %+v", resp)
	}
}

func TestHandleRecordSnapshot_Unauthenticated_Returns401(t *testing.T) {
	h := save.NewEconomicSnapshotHandler(nil)
	body, _ := json.Marshal(map[string]any{"day": 1, "archetype": "pip", "cash": 25, "energy": 80})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/district/economic-snapshot", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	h.HandleRecordSnapshot(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthenticated request, got %d", rr.Code)
	}
}

func TestHandleRecordSnapshot_InvalidArchetype_Returns400(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	h := save.NewEconomicSnapshotHandler(pool)
	body, _ := json.Marshal(map[string]any{"day": 1, "archetype": "not-a-real-archetype", "cash": 25, "energy": 80})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/district/economic-snapshot", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "irrelevant-user"))
	rr := httptest.NewRecorder()
	h.HandleRecordSnapshot(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid archetype, got %d", rr.Code)
	}
}

func TestHandleRecordSnapshot_NegativeCash_Returns400(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	h := save.NewEconomicSnapshotHandler(pool)
	body, _ := json.Marshal(map[string]any{"day": 1, "archetype": "pip", "cash": -5, "energy": 80})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/district/economic-snapshot", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "irrelevant-user"))
	rr := httptest.NewRecorder()
	h.HandleRecordSnapshot(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for negative cash, got %d", rr.Code)
	}
}

// ── Integration tests (Docker/testcontainers) ───────────────────────────────

// TestHandleRecordSnapshot_EndToEnd_ChangesAttritionRate is M13 Test 13.5:
// a real POST through the handler — not a fixture INSERT — must move the
// aggregate returned by GET /api/v1/district/attrition, mirroring
// solidarity_pool_test.go's TestHandleRecordCrisisChoice_EndToEnd pattern.
func TestHandleRecordSnapshot_EndToEnd_ChangesAttritionRate(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	ctx := context.Background()
	h := save.NewEconomicSnapshotHandler(pool)

	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('e2e-snapshot-test@example.com', 'hash') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	baselineReq := httptest.NewRequest(http.MethodGet, "/api/v1/district/attrition", nil)
	baselineRR := httptest.NewRecorder()
	h.HandleAttritionRate(baselineRR, baselineReq)
	var baseline struct {
		SampleSize int `json:"sampleSize"`
	}
	if err := json.NewDecoder(baselineRR.Body).Decode(&baseline); err != nil {
		t.Fatalf("decode baseline: %v", err)
	}
	if baseline.SampleSize != 0 {
		t.Fatalf("expected 0 baseline sample size, got %d", baseline.SampleSize)
	}

	// Real write path: day 3, zero cash — an attrited row.
	body, _ := json.Marshal(map[string]any{"day": 3, "archetype": "pip", "cash": 0, "energy": 40})
	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/district/economic-snapshot", bytes.NewReader(body))
	postReq = postReq.WithContext(context.WithValue(postReq.Context(), middleware.UserIDKey, userID))
	postRR := httptest.NewRecorder()
	h.HandleRecordSnapshot(postRR, postReq)
	if postRR.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", postRR.Code, postRR.Body.String())
	}

	afterReq := httptest.NewRequest(http.MethodGet, "/api/v1/district/attrition", nil)
	afterRR := httptest.NewRecorder()
	h.HandleAttritionRate(afterRR, afterReq)
	var after struct {
		AttritionRate float64 `json:"attritionRate"`
		AttritedUsers int     `json:"attritedUsers"`
		SampleSize    int     `json:"sampleSize"`
	}
	if err := json.NewDecoder(afterRR.Body).Decode(&after); err != nil {
		t.Fatalf("decode after: %v", err)
	}
	if after.SampleSize != 1 {
		t.Fatalf("expected sampleSize 1 after live POST, got %d", after.SampleSize)
	}
	if after.AttritedUsers != 1 {
		t.Fatalf("expected 1 attrited user, got %d", after.AttritedUsers)
	}
	if after.AttritionRate != 100.0 {
		t.Fatalf("expected attritionRate 100.0, got %v", after.AttritionRate)
	}
}

func TestHandleRecordSnapshot_DayTenOrLater_DoesNotCountAsAttrition(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	ctx := context.Background()
	h := save.NewEconomicSnapshotHandler(pool)

	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('e2e-snapshot-late-test@example.com', 'hash') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	// Zero cash, but on day 12 — outside the "before day 10" attrition window.
	body, _ := json.Marshal(map[string]any{"day": 12, "archetype": "morgan", "cash": 0, "energy": 0})
	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/district/economic-snapshot", bytes.NewReader(body))
	postReq = postReq.WithContext(context.WithValue(postReq.Context(), middleware.UserIDKey, userID))
	postRR := httptest.NewRecorder()
	h.HandleRecordSnapshot(postRR, postReq)
	if postRR.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", postRR.Code, postRR.Body.String())
	}

	afterReq := httptest.NewRequest(http.MethodGet, "/api/v1/district/attrition", nil)
	afterRR := httptest.NewRecorder()
	h.HandleAttritionRate(afterRR, afterReq)
	var after struct {
		AttritionRate float64 `json:"attritionRate"`
		SampleSize    int     `json:"sampleSize"`
	}
	if err := json.NewDecoder(afterRR.Body).Decode(&after); err != nil {
		t.Fatalf("decode after: %v", err)
	}
	if after.SampleSize != 1 {
		t.Fatalf("expected sampleSize 1, got %d", after.SampleSize)
	}
	if after.AttritionRate != 0 {
		t.Fatalf("expected attritionRate 0 (day 12 is outside the day<10 window), got %v", after.AttritionRate)
	}
}
