package sync_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/district-cg/api/internal/middleware"
	"github.com/district-cg/api/internal/sync"
	"github.com/district-cg/api/testutil"
)

// ── Unit tests (no DB) ──────────────────────────────────────────────────────

func TestExchange_NilPool_ReturnsEmptyDefaults(t *testing.T) {
	h := sync.NewHandler(sync.NewRepository(nil))
	body, _ := json.Marshal(map[string]any{"deviceId": "device-a", "vectorClock": map[string]int64{}, "deltas": []sync.Delta{}})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "user-1"))
	rec := httptest.NewRecorder()

	h.Exchange(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Deltas      []sync.Delta     `json:"deltas"`
		VectorClock map[string]int64 `json:"vectorClock"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp.Deltas) != 0 {
		t.Errorf("nil-pool: expected no deltas, got %d", len(resp.Deltas))
	}
	if len(resp.VectorClock) != 0 {
		t.Errorf("nil-pool: expected empty vector clock, got %v", resp.VectorClock)
	}
}

func TestExchange_RejectsMissingDeviceIdWith400(t *testing.T) {
	h := sync.NewHandler(sync.NewRepository(nil))
	body, _ := json.Marshal(map[string]any{"vectorClock": map[string]int64{}, "deltas": []sync.Delta{}})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "user-1"))
	rec := httptest.NewRecorder()

	h.Exchange(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want 400", rec.Code)
	}
}

func TestExchange_RejectsMalformedJsonWith400(t *testing.T) {
	h := sync.NewHandler(sync.NewRepository(nil))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader([]byte("{not json")))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "user-1"))
	rec := httptest.NewRecorder()

	h.Exchange(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want 400", rec.Code)
	}
}

func TestExchange_ContentTypeHeader(t *testing.T) {
	h := sync.NewHandler(sync.NewRepository(nil))
	body, _ := json.Marshal(map[string]any{"deviceId": "device-a"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, "user-1"))
	rec := httptest.NewRecorder()

	h.Exchange(rec, req)

	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type: got %q, want application/json", ct)
	}
}

// ── Integration tests (real Postgres via testcontainers) ────────────────────

func TestExchange_StoresAndRelaysDeltasBetweenTwoDevices(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	ctx := context.Background()
	handler := sync.NewHandler(sync.NewRepository(pool))

	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('sync-user@example.com', 'hash') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	// Device A uploads one delta.
	deltaA := sync.Delta{
		ID: "a-1", DeviceID: "device-a", Sequence: 1, Timestamp: 1000,
		VectorClock: map[string]int64{"device-a": 1}, ActionType: "COMMONS_RESOURCE_CONTRIBUTION",
		Payload: map[string]any{"node": "toolLibraryProgress", "amount": float64(5)},
		Hash:    "hash-a-1", Signature: "sig-a-1",
	}
	bodyA, _ := json.Marshal(map[string]any{"deviceId": "device-a", "vectorClock": map[string]int64{}, "deltas": []sync.Delta{deltaA}})
	reqA := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader(bodyA))
	reqA = reqA.WithContext(context.WithValue(reqA.Context(), middleware.UserIDKey, userID))
	recA := httptest.NewRecorder()
	handler.Exchange(recA, reqA)
	if recA.Code != http.StatusOK {
		t.Fatalf("device A upload: got status %d: %s", recA.Code, recA.Body.String())
	}

	// Device B, starting from an empty vector clock, should learn about device A's delta.
	bodyB, _ := json.Marshal(map[string]any{"deviceId": "device-b", "vectorClock": map[string]int64{}, "deltas": []sync.Delta{}})
	reqB := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader(bodyB))
	reqB = reqB.WithContext(context.WithValue(reqB.Context(), middleware.UserIDKey, userID))
	recB := httptest.NewRecorder()
	handler.Exchange(recB, reqB)
	if recB.Code != http.StatusOK {
		t.Fatalf("device B fetch: got status %d: %s", recB.Code, recB.Body.String())
	}

	var respB struct {
		Deltas      []sync.Delta     `json:"deltas"`
		VectorClock map[string]int64 `json:"vectorClock"`
	}
	if err := json.Unmarshal(recB.Body.Bytes(), &respB); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(respB.Deltas) != 1 || respB.Deltas[0].ID != "a-1" {
		t.Fatalf("expected device B to learn device A's delta, got %+v", respB.Deltas)
	}
	if respB.VectorClock["device-a"] != 1 {
		t.Errorf("expected server vector clock to report device-a:1, got %v", respB.VectorClock)
	}

	// Re-uploading the same delta from device A again must not duplicate it
	// (idempotent on the (user_id, device_id, sequence) primary key).
	recA2 := httptest.NewRecorder()
	reqA2 := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader(bodyA))
	reqA2 = reqA2.WithContext(context.WithValue(reqA2.Context(), middleware.UserIDKey, userID))
	handler.Exchange(recA2, reqA2)
	if recA2.Code != http.StatusOK {
		t.Fatalf("device A re-upload: got status %d: %s", recA2.Code, recA2.Body.String())
	}

	recB2 := httptest.NewRecorder()
	reqB2 := httptest.NewRequest(http.MethodPost, "/api/v1/sync/deltas", bytes.NewReader(bodyB))
	reqB2 = reqB2.WithContext(context.WithValue(reqB2.Context(), middleware.UserIDKey, userID))
	handler.Exchange(recB2, reqB2)
	var respB2 struct {
		Deltas []sync.Delta `json:"deltas"`
	}
	_ = json.Unmarshal(recB2.Body.Bytes(), &respB2)
	if len(respB2.Deltas) != 1 {
		t.Errorf("expected exactly 1 delta after a duplicate re-upload, got %d", len(respB2.Deltas))
	}
}
