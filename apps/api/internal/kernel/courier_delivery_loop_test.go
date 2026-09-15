package kernel_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	courierrush "github.com/district-cg/plugin-courier-rush"

	"github.com/district-cg/api/internal/kernel"
	"github.com/district-cg/api/testutil"
)

// M14 follow-up (audit 2026-09-15) Test 14.4 — Full Courier Delivery Loop.
// StartSession, ComputeScore and RecordSession were each unit-tested in
// isolation but never chained together against the real courier-rush plugin.
// This test drives the real HTTP handlers end-to-end: session-start ->
// deliveries payload -> score submission -> persisted audit row, using the
// real plugin (not a mock) and real Postgres.
//
// Note on scope: internal/kernel/repository.go's RecordSession only persists
// an anti-cheat audit row (plugin_sessions) — reward application to the
// player's cash/trust/energy happens client-side through the existing,
// already-tested save flow (see repository.go's own doc comment). So "the
// wallet actually increases" is verified here as "the server computed and
// persisted the correct reward grant for the client to apply" — there is no
// separate server-side wallet this plugin type credits.

func newGamesRouter(h *kernel.Handler) chi.Router {
	r := chi.NewRouter()
	r.Post("/games/{id}/session", h.StartSession)
	r.Post("/games/{id}/complete", h.CompleteSession)
	return r
}

func TestCourierRushFullDeliveryLoop_SessionToRecordedReward(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := kernel.NewRepository(pool)
	registry := kernel.NewRegistry()
	courierrush.Register(registry)
	sessions := kernel.NewSessionManager("test-secret-at-least-32-bytes-long!!")

	userID := seedUser(t, pool, "courier-player@example.com")
	h := kernel.NewHandler(registry, sessions, repo, "owner-not-relevant-here")
	router := newGamesRouter(h)

	// 1. Start a session for the real courier-rush plugin.
	startBody, _ := json.Marshal(map[string]any{"archetype": "pip", "difficulty": 1, "districtDay": 5})
	startReq := withUser(httptest.NewRequest(http.MethodPost, "/games/courier-rush/session", bytes.NewReader(startBody)), userID)
	startRR := httptest.NewRecorder()
	router.ServeHTTP(startRR, startReq)
	if startRR.Code != http.StatusOK {
		t.Fatalf("start session: expected 200, got %d: %s", startRR.Code, startRR.Body.String())
	}
	var started struct {
		SessionID    string `json:"sessionId"`
		SessionToken string `json:"sessionToken"`
	}
	if err := json.NewDecoder(startRR.Body).Decode(&started); err != nil {
		t.Fatalf("decode start response: %v", err)
	}
	if started.SessionToken == "" {
		t.Fatal("expected a non-empty session token")
	}

	// 2. Submit a plausible delivery-run payload (4 deliveries, well within the
	// anti-cheat bound for a 60s run) and complete the session.
	completeBody, _ := json.Marshal(map[string]any{
		"sessionToken": started.SessionToken,
		"payload": map[string]any{
			"deliveries":  4,
			"comboMax":    3,
			"crashes":     1,
			"durationSec": 60.0,
		},
	})
	completeReq := withUser(httptest.NewRequest(http.MethodPost, "/games/courier-rush/complete", bytes.NewReader(completeBody)), userID)
	completeRR := httptest.NewRecorder()
	router.ServeHTTP(completeRR, completeReq)
	if completeRR.Code != http.StatusOK {
		t.Fatalf("complete session: expected 200, got %d: %s", completeRR.Code, completeRR.Body.String())
	}

	var result struct {
		Score          int64 `json:"score"`
		Completed      bool  `json:"completed"`
		RewardsGranted struct {
			CashDelta   int `json:"cashDelta"`
			TrustDelta  int `json:"trustDelta"`
			EnergyDelta int `json:"energyDelta"`
		} `json:"rewardsGranted"`
	}
	if err := json.NewDecoder(completeRR.Body).Decode(&result); err != nil {
		t.Fatalf("decode complete response: %v", err)
	}

	// Matches courierrush.ComputeScore's real formula: 4 deliveries >= completionThreshold(3).
	if !result.Completed {
		t.Errorf("expected the delivery run to be marked completed")
	}
	if result.RewardsGranted.CashDelta != 4*8 {
		t.Errorf("cashDelta: got %d, want %d", result.RewardsGranted.CashDelta, 4*8)
	}
	if result.RewardsGranted.EnergyDelta != -5 {
		t.Errorf("energyDelta: got %d, want -5", result.RewardsGranted.EnergyDelta)
	}
	if result.RewardsGranted.TrustDelta <= 0 {
		t.Errorf("expected a positive trustDelta for a completed run, got %d", result.RewardsGranted.TrustDelta)
	}

	// 3. The reward grant was actually persisted server-side (the audit trail
	// the client's next /shop/wallet read and the anti-cheat review both rely
	// on) — not just computed and discarded.
	var persistedScore int64
	var persistedCompleted bool
	var rewardsJSON []byte
	err := pool.QueryRow(context.Background(),
		`SELECT score, completed, rewards FROM plugin_sessions WHERE user_id = $1 AND plugin_id = 'courier-rush'`,
		userID,
	).Scan(&persistedScore, &persistedCompleted, &rewardsJSON)
	if err != nil {
		t.Fatalf("query persisted session: %v", err)
	}
	if persistedScore != result.Score {
		t.Errorf("persisted score %d does not match response score %d", persistedScore, result.Score)
	}
	if !persistedCompleted {
		t.Error("persisted row should be marked completed")
	}
	var persistedRewards map[string]any
	if err := json.Unmarshal(rewardsJSON, &persistedRewards); err != nil {
		t.Fatalf("unmarshal persisted rewards: %v", err)
	}
	if int(persistedRewards["cashDelta"].(float64)) != 4*8 {
		t.Errorf("persisted cashDelta: got %v, want %d", persistedRewards["cashDelta"], 4*8)
	}
}

func TestCourierRushFullDeliveryLoop_ImplausibleDeliveries_Rejected(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := kernel.NewRepository(pool)
	registry := kernel.NewRegistry()
	courierrush.Register(registry)
	sessions := kernel.NewSessionManager("test-secret-at-least-32-bytes-long!!")

	userID := seedUser(t, pool, "cheater-player@example.com")
	h := kernel.NewHandler(registry, sessions, repo, "owner-not-relevant-here")
	router := newGamesRouter(h)

	startReq := withUser(httptest.NewRequest(http.MethodPost, "/games/courier-rush/session", bytes.NewReader([]byte("{}"))), userID)
	startRR := httptest.NewRecorder()
	router.ServeHTTP(startRR, startReq)
	var started struct {
		SessionToken string `json:"sessionToken"`
	}
	_ = json.NewDecoder(startRR.Body).Decode(&started)

	// 50 deliveries in 10 seconds is far beyond the anti-cheat bound
	// (minSecondsPerDelivery = 6.0s) — the real plugin must reject this.
	completeBody, _ := json.Marshal(map[string]any{
		"sessionToken": started.SessionToken,
		"payload": map[string]any{
			"deliveries":  50,
			"comboMax":    50,
			"crashes":     0,
			"durationSec": 10.0,
		},
	})
	completeReq := withUser(httptest.NewRequest(http.MethodPost, "/games/courier-rush/complete", bytes.NewReader(completeBody)), userID)
	completeRR := httptest.NewRecorder()
	router.ServeHTTP(completeRR, completeReq)
	if completeRR.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for an implausible delivery count, got %d: %s", completeRR.Code, completeRR.Body.String())
	}

	var count int
	if err := pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM plugin_sessions WHERE user_id = $1`, userID,
	).Scan(&count); err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	if count != 0 {
		t.Errorf("a rejected score must never be persisted, found %d rows", count)
	}
}
