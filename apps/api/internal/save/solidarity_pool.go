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

type SolidarityHandler struct {
	pool *pgxpool.Pool
}

func NewSolidarityHandler(pool *pgxpool.Pool) *SolidarityHandler {
	return &SolidarityHandler{pool: pool}
}

type districtResilienceResp struct {
	GlobalIndex     float64 `json:"globalIndex"`
	SolidarityCount int     `json:"solidarityCount"`
	ScapegoatCount  int     `json:"scapegoatCount"`
	TotalDecisions  int     `json:"totalDecisions"`
	Message         string  `json:"message"`
}

// HandleDistrictResilience serves GET /api/v1/district/resilience
// Returns aggregate solidarity statistics across all players.
func (h *SolidarityHandler) HandleDistrictResilience(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5000000000) // 5s
	defer cancel()

	var solidarityCount, scapegoatCount int
	if h.pool != nil {
		row := h.pool.QueryRow(ctx, `
			SELECT
				COUNT(*) FILTER (WHERE choice = 'solidarity') AS solidarity,
				COUNT(*) FILTER (WHERE choice = 'scapegoat')  AS scapegoat
			FROM crisis_log
		`)
		if err := row.Scan(&solidarityCount, &scapegoatCount); err != nil {
			slog.Warn("solidarity_pool query failed, returning defaults", "err", err)
			solidarityCount, scapegoatCount = 0, 0
		}
	}

	total := solidarityCount + scapegoatCount
	var globalIndex float64
	if total > 0 {
		globalIndex = float64(solidarityCount) / float64(total) * 100
	} else {
		globalIndex = 50.0 // neutral default when no data
	}

	var message string
	switch {
	case globalIndex >= 70:
		message = "The district holds together. Solidarity is winning."
	case globalIndex >= 50:
		message = "Communities are divided but neighbours persist."
	default:
		message = "Scapegoating is rising. Build the commons now."
	}

	resp := districtResilienceResp{
		GlobalIndex:     globalIndex,
		SolidarityCount: solidarityCount,
		ScapegoatCount:  scapegoatCount,
		TotalDecisions:  total,
		Message:         message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		slog.Error("solidarity_pool encode", "err", err)
	}
}

type scenarioSolidarityRow struct {
	CrisisID        string  `json:"crisisId"`
	SolidarityCount int     `json:"solidarityCount"`
	ScapegoatCount  int     `json:"scapegoatCount"`
	SolidarityRatio float64 `json:"solidarityRatio"`
	Skewed          bool    `json:"skewed"`
}

type scenarioSolidarityResp struct {
	Scenarios []scenarioSolidarityRow `json:"scenarios"`
}

// HandleResilienceByScenario serves GET /api/v1/district/resilience/by-scenario
// — the planning doc's ">85% or <15% skew -> re-balance" check made readable:
// a per-crisis_id breakdown of the same crisis_log table HandleDistrictResilience
// already aggregates globally. crisis_id and day were already columns
// (003_create_crisis_log.up.sql) — this is a GROUP BY, not new infrastructure.
// Read-only: a designer reads `skewed` rows and edits crisis_scenarios.json by
// hand, no auto-rebalancer is implied or built here.
func (h *SolidarityHandler) HandleResilienceByScenario(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5000000000) // 5s
	defer cancel()

	rows := []scenarioSolidarityRow{}
	if h.pool != nil {
		result, err := h.pool.Query(ctx, `
			SELECT
				crisis_id,
				COUNT(*) FILTER (WHERE choice = 'solidarity') AS solidarity,
				COUNT(*) FILTER (WHERE choice = 'scapegoat')  AS scapegoat
			FROM crisis_log
			GROUP BY crisis_id
			ORDER BY crisis_id
		`)
		if err != nil {
			slog.Warn("solidarity_pool by-scenario query failed, returning empty", "err", err)
		} else {
			defer result.Close()
			for result.Next() {
				var row scenarioSolidarityRow
				var solidarity, scapegoat int
				if err := result.Scan(&row.CrisisID, &solidarity, &scapegoat); err != nil {
					slog.Warn("solidarity_pool by-scenario row scan failed", "err", err)
					continue
				}
				row.SolidarityCount = solidarity
				row.ScapegoatCount = scapegoat
				total := solidarity + scapegoat
				if total > 0 {
					row.SolidarityRatio = float64(solidarity) / float64(total) * 100
				}
				row.Skewed = total > 0 && (row.SolidarityRatio > 85 || row.SolidarityRatio < 15)
				rows = append(rows, row)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if err := json.NewEncoder(w).Encode(scenarioSolidarityResp{Scenarios: rows}); err != nil {
		slog.Error("solidarity_pool by-scenario encode", "err", err)
	}
}

type recordCrisisChoiceRequest struct {
	CrisisID string `json:"crisisId"`
	Day      int    `json:"day"`
	Choice   string `json:"choice"`
}

// HandleRecordCrisisChoice serves POST /api/v1/district/crisis-log (auth required).
// Records one anonymous crisis-resolution choice (scapegoat/solidarity) so the
// Global Solidarity Pool computed by HandleDistrictResilience reflects real
// gameplay instead of only its own test fixtures. No other player data is stored.
func (h *SolidarityHandler) HandleRecordCrisisChoice(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	if h.pool == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	var req recordCrisisChoiceRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<12)).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if req.CrisisID == "" || (req.Choice != "solidarity" && req.Choice != "scapegoat") {
		http.Error(w, `{"error":"crisisId and a valid choice are required"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5000000000) // 5s
	defer cancel()

	_, err := h.pool.Exec(ctx,
		`INSERT INTO crisis_log (user_id, crisis_id, day, choice) VALUES ($1, $2, $3, $4)`,
		userID, req.CrisisID, req.Day, req.Choice,
	)
	if err != nil {
		slog.Error("record crisis choice", "err", err)
		http.Error(w, `{"error":"failed to record crisis choice"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
