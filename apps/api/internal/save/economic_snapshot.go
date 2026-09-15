package save

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/district-cg/api/internal/middleware"
)

// EconomicSnapshotHandler serves the M13 telemetry surface needed to compute
// docs/planning/13-....md's "Economic Attrition Rate" — a metric that, unlike
// the Solidarity Ratio (already real, see solidarity_pool.go), had zero
// backing data anywhere: crisis_log only ever recorded crisis choices, never
// day-by-day economic state. Same privacy posture as crisis_log: no free
// text, no PII, user_id only for the existing per-account dedupe pattern.
type EconomicSnapshotHandler struct {
	pool *pgxpool.Pool
}

func NewEconomicSnapshotHandler(pool *pgxpool.Pool) *EconomicSnapshotHandler {
	return &EconomicSnapshotHandler{pool: pool}
}

var validArchetypes = map[string]bool{"pip": true, "morgan": true, "arthur": true}

type recordSnapshotRequest struct {
	Day       int    `json:"day"`
	Archetype string `json:"archetype"`
	Cash      int    `json:"cash"`
	Energy    int    `json:"energy"`
}

// HandleRecordSnapshot serves POST /api/v1/district/economic-snapshot (auth required).
// Fire-and-forget from the client's advanceDay() — matches HandleRecordCrisisChoice's
// shape exactly.
func (h *EconomicSnapshotHandler) HandleRecordSnapshot(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	if h.pool == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	var req recordSnapshotRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<12)).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if !validArchetypes[req.Archetype] || req.Cash < 0 || req.Energy < 0 {
		http.Error(w, `{"error":"day, a valid archetype, and non-negative cash/energy are required"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5000000000) // 5s
	defer cancel()

	_, err := h.pool.Exec(ctx,
		`INSERT INTO economic_snapshot_log (user_id, day, archetype, cash, energy) VALUES ($1, $2, $3, $4, $5)`,
		userID, req.Day, req.Archetype, req.Cash, req.Energy,
	)
	if err != nil {
		slog.Error("record economic snapshot", "err", err)
		http.Error(w, `{"error":"failed to record economic snapshot"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type economicAttritionResp struct {
	AttritionRate float64 `json:"attritionRate"`
	AttritedUsers int     `json:"attritedUsers"`
	SampleSize    int     `json:"sampleSize"`
}

// HandleAttritionRate serves GET /api/v1/district/attrition — the % of
// distinct users who ever hit zero cash or zero energy before day 10, out of
// every distinct user with at least one recorded snapshot. Live-tuning input
// for early-game grocer credit margins per the planning doc's "Telemetry
// Dashboard Metrics for Live Tuning" section — read-only data, no auto-tuning.
func (h *EconomicSnapshotHandler) HandleAttritionRate(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5000000000) // 5s
	defer cancel()

	var attrited, total int
	if h.pool != nil {
		row := h.pool.QueryRow(ctx, `
			SELECT
				COUNT(DISTINCT user_id) FILTER (WHERE (cash = 0 OR energy = 0) AND day < 10) AS attrited,
				COUNT(DISTINCT user_id) AS total
			FROM economic_snapshot_log
		`)
		if err := row.Scan(&attrited, &total); err != nil {
			slog.Warn("economic_snapshot attrition query failed, returning defaults", "err", err)
			attrited, total = 0, 0
		}
	}

	var rate float64
	if total > 0 {
		rate = float64(attrited) / float64(total) * 100
	}

	resp := economicAttritionResp{
		AttritionRate: rate,
		AttritedUsers: attrited,
		SampleSize:    total,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		slog.Error("economic_snapshot encode", "err", err)
	}
}
