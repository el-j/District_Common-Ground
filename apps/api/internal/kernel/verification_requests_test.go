package kernel_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/district-cg/api/internal/kernel"
	"github.com/district-cg/api/internal/middleware"
	"github.com/district-cg/api/testutil"
)

// M14 follow-up (audit 2026-09-15) Test 14.5 — Trusted Plugin Review Flow.
// apps/api/internal/kernel/verification_requests.go had real submit/list/review
// handlers wired into the router with zero test coverage. This proves the full
// quarantine -> owner-approval -> verified-catalog lifecycle end-to-end against
// real Postgres, plus the non-owner rejection path.

func seedUser(t *testing.T, pool *pgxpool.Pool, email string) string {
	t.Helper()
	var id string
	if err := pool.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id`, email,
	).Scan(&id); err != nil {
		t.Fatalf("seed user %s: %v", email, err)
	}
	return id
}

func newVerificationRouter(h *kernel.Handler) chi.Router {
	r := chi.NewRouter()
	r.Post("/plugins/verification-requests", h.SubmitVerificationRequest)
	r.Get("/plugins/verification-requests", h.ListVerificationRequests)
	r.Post("/plugins/verification-requests/{id}/review", h.ReviewVerificationRequest)
	return r
}

func withUser(req *http.Request, userID string) *http.Request {
	return req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
}

func TestVerificationRequestFlow_SubmitQuarantineApprovePromotes(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := kernel.NewRepository(pool)
	registry := kernel.NewRegistry()
	sessions := kernel.NewSessionManager("test-secret-at-least-32-bytes-long!!")

	ownerID := seedUser(t, pool, "owner@example.com")
	requesterID := seedUser(t, pool, "requester@example.com")

	h := kernel.NewHandler(registry, sessions, repo, ownerID)
	router := newVerificationRouter(h)

	// 1. Submit a verification request as a regular (non-owner) user.
	submitBody, _ := json.Marshal(map[string]any{
		"sourceKind":   "url",
		"manifestUrl":  "https://example.com/plugin/manifest.json",
		"bundleSha256": "deadbeef",
		"pluginMetadata": map[string]any{
			"id":      "third-party-game",
			"name":    "Third Party Game",
			"version": "1.0.0",
		},
	})
	submitReq := withUser(httptest.NewRequest(http.MethodPost, "/plugins/verification-requests", bytes.NewReader(submitBody)), requesterID)
	submitRR := httptest.NewRecorder()
	router.ServeHTTP(submitRR, submitReq)
	if submitRR.Code != http.StatusOK {
		t.Fatalf("submit: expected 200, got %d: %s", submitRR.Code, submitRR.Body.String())
	}
	var submitted struct{ ID string }
	if err := json.NewDecoder(submitRR.Body).Decode(&submitted); err != nil {
		t.Fatalf("decode submit response: %v", err)
	}

	// 2. Quarantined: not yet in the verified catalog GET /games merges in.
	verifiedBefore, err := repo.ListVerifiedPlugins(context.Background())
	if err != nil {
		t.Fatalf("list verified before approval: %v", err)
	}
	for _, p := range verifiedBefore {
		if p.ID == "third-party-game" {
			t.Fatal("expected third-party-game to be quarantined, but it's already verified")
		}
	}

	// 3. A non-owner reviewer is rejected with 403.
	reviewBody, _ := json.Marshal(map[string]any{"approved": true, "notes": "looks fine"})
	nonOwnerReq := withUser(httptest.NewRequest(http.MethodPost, "/plugins/verification-requests/"+submitted.ID+"/review", bytes.NewReader(reviewBody)), requesterID)
	nonOwnerRR := httptest.NewRecorder()
	router.ServeHTTP(nonOwnerRR, nonOwnerReq)
	if nonOwnerRR.Code != http.StatusForbidden {
		t.Fatalf("non-owner review: expected 403, got %d", nonOwnerRR.Code)
	}

	// 4. Owner approves.
	ownerReq := withUser(httptest.NewRequest(http.MethodPost, "/plugins/verification-requests/"+submitted.ID+"/review", bytes.NewReader(reviewBody)), ownerID)
	ownerRR := httptest.NewRecorder()
	router.ServeHTTP(ownerRR, ownerReq)
	if ownerRR.Code != http.StatusNoContent {
		t.Fatalf("owner review: expected 204, got %d: %s", ownerRR.Code, ownerRR.Body.String())
	}

	// 5. Promoted: now appears in the verified catalog.
	verifiedAfter, err := repo.ListVerifiedPlugins(context.Background())
	if err != nil {
		t.Fatalf("list verified after approval: %v", err)
	}
	found := false
	for _, p := range verifiedAfter {
		if p.ID == "third-party-game" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected third-party-game to be promoted to the verified catalog after owner approval")
	}
}

func TestVerificationRequestFlow_OwnerRejectionDoesNotPromote(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := kernel.NewRepository(pool)
	registry := kernel.NewRegistry()
	sessions := kernel.NewSessionManager("test-secret-at-least-32-bytes-long!!")

	ownerID := seedUser(t, pool, "owner2@example.com")
	requesterID := seedUser(t, pool, "requester2@example.com")

	h := kernel.NewHandler(registry, sessions, repo, ownerID)
	router := newVerificationRouter(h)

	submitBody, _ := json.Marshal(map[string]any{
		"sourceKind":   "file",
		"bundleSha256": "cafebabe",
		"pluginMetadata": map[string]any{
			"id":      "rejected-game",
			"name":    "Rejected Game",
			"version": "1.0.0",
		},
	})
	submitReq := withUser(httptest.NewRequest(http.MethodPost, "/plugins/verification-requests", bytes.NewReader(submitBody)), requesterID)
	submitRR := httptest.NewRecorder()
	router.ServeHTTP(submitRR, submitReq)
	if submitRR.Code != http.StatusOK {
		t.Fatalf("submit: expected 200, got %d: %s", submitRR.Code, submitRR.Body.String())
	}
	var submitted struct{ ID string }
	_ = json.NewDecoder(submitRR.Body).Decode(&submitted)

	rejectBody, _ := json.Marshal(map[string]any{"approved": false, "notes": "not sound"})
	ownerReq := withUser(httptest.NewRequest(http.MethodPost, "/plugins/verification-requests/"+submitted.ID+"/review", bytes.NewReader(rejectBody)), ownerID)
	ownerRR := httptest.NewRecorder()
	router.ServeHTTP(ownerRR, ownerReq)
	if ownerRR.Code != http.StatusNoContent {
		t.Fatalf("owner rejection: expected 204, got %d", ownerRR.Code)
	}

	verified, err := repo.ListVerifiedPlugins(context.Background())
	if err != nil {
		t.Fatalf("list verified: %v", err)
	}
	for _, p := range verified {
		if p.ID == "rejected-game" {
			t.Fatal("rejected-game must never appear in the verified catalog")
		}
	}
}
