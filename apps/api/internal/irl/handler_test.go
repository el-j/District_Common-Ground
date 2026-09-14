package irl_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/district-cg/api/internal/irl"
	"github.com/district-cg/api/internal/middleware"
	"github.com/district-cg/api/testutil"
)

func TestLogDeed_ValidatesAndCreditsWallet(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	handler := irl.NewHandler(irl.NewRepository(pool))
	ctx := context.Background()

	var userID string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('journal-user@example.com', 'hash') RETURNING id`,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	body, _ := json.Marshal(map[string]string{
		"category":           "community_repair",
		"note":                "Fixed a neighbor's bike brakes",
		"verificationMethod": "peer_verified",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/irl/deeds", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rec := httptest.NewRecorder()

	handler.LogDeed(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Deed   irl.Deed   `json:"deed"`
		Wallet irl.Wallet `json:"wallet"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Deed.STAwarded != 50 || resp.Wallet.SolidarityTokens != 50 {
		t.Errorf("got deed st=%d wallet st=%d, want 50/50", resp.Deed.STAwarded, resp.Wallet.SolidarityTokens)
	}
}

func TestLogDeed_RejectsInvalidCategoryWith400(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	handler := irl.NewHandler(irl.NewRepository(pool))
	ctx := context.Background()

	var userID string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('bad-journal-user@example.com', 'hash') RETURNING id`,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	body, _ := json.Marshal(map[string]string{
		"category":           "arson", // not a real deed category
		"verificationMethod": "honor_system",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/irl/deeds", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rec := httptest.NewRecorder()

	handler.LogDeed(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want 400", rec.Code)
	}
}
