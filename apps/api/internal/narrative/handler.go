package narrative

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool   *pgxpool.Pool
	client *Client
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	cfg := LoadConfig()
	var client *Client
	if cfg.Provider != "" {
		client = NewClient(cfg)
	}
	return &Handler{pool: pool, client: client}
}

func (h *Handler) HandleDailyScenarios(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	defer cancel()

	// Build pulse context from current month
	month := int(time.Now().Month()) - 1 // 0-based
	pulse := PulseContext{
		Day:          int(time.Now().Unix() / 86400),
		FoodIndex:    seasonalFood(month),
		EnergyIndex:  seasonalEnergy(month),
		HeatIndex:    seasonalHeat(month),
		MigrantIndex: seasonalMigrant(month),
		Season:       monthToSeason(month),
	}

	// Try live generation first
	scenario, err := GenerateScenario(ctx, h.client, pulse)
	if err != nil {
		slog.Warn("narrative generate", "err", err)
	}

	// Fall back: check DB cache for recent scenarios
	var scenarios []*DynamicScenario
	if scenario != nil {
		if dbErr := UpsertScenario(ctx, h.pool, scenario); dbErr != nil {
			slog.Warn("narrative upsert", "err", dbErr)
		}
		scenarios = []*DynamicScenario{scenario}
	} else {
		cached, dbErr := GetRecentScenarios(ctx, h.pool, 5)
		if dbErr != nil {
			slog.Warn("narrative cached fetch", "err", dbErr)
		}
		scenarios = cached
	}

	type resp struct {
		Scenarios []*DynamicScenario `json:"scenarios"`
		Source    string             `json:"source"`
		GeneratedAt string           `json:"generatedAt"`
	}

	source := "cached"
	if scenario != nil {
		source = "live"
	} else if len(scenarios) == 0 {
		source = "empty"
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if err := json.NewEncoder(w).Encode(resp{
		Scenarios:   scenarios,
		Source:      source,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
	}); err != nil {
		slog.Error("narrative handler encode", "err", err)
	}
}

// Seasonal helper functions (mirrors pulse/economy.go logic)
func seasonalFood(m int) float64 {
	food := []float64{1.30, 1.28, 1.15, 1.00, 0.95, 0.95, 0.95, 0.98, 1.02, 1.10, 1.20, 1.28}
	return food[m%12]
}

func seasonalEnergy(m int) float64 {
	energy := []float64{1.25, 1.22, 1.05, 0.95, 0.95, 1.05, 1.30, 1.35, 1.15, 1.00, 1.05, 1.20}
	return energy[m%12]
}

func seasonalHeat(m int) float64 {
	heat := []float64{0.60, 0.65, 0.75, 0.85, 1.00, 1.20, 1.35, 1.40, 1.25, 1.00, 0.75, 0.62}
	return heat[m%12]
}

func seasonalMigrant(m int) float64 {
	migrant := []float64{0.90, 0.88, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.20, 1.28, 1.30, 1.10}
	return migrant[m%12]
}

func monthToSeason(m int) string {
	switch {
	case m >= 2 && m <= 4:
		return "spring"
	case m >= 5 && m <= 7:
		return "summer"
	case m >= 8 && m <= 10:
		return "autumn"
	default:
		return "winter"
	}
}

