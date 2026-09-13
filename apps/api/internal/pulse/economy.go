package pulse

import (
	"encoding/json"
	"log/slog"
	"math"
	"net/http"
	"sync"
	"time"
)

var (
	cachedPulse   *DistrictPulseState
	cacheMu       sync.RWMutex
	cacheExpiry   time.Time
	cacheDuration = 24 * time.Hour
)

// GetPulseState returns cached pulse state or generates seasonal fallback.
func GetPulseState() *DistrictPulseState {
	cacheMu.RLock()
	if cachedPulse != nil && time.Now().Before(cacheExpiry) {
		p := cachedPulse
		cacheMu.RUnlock()
		return p
	}
	cacheMu.RUnlock()

	p := seasonalFallback(time.Now())
	cacheMu.Lock()
	cachedPulse = p
	cacheExpiry = time.Now().Add(cacheDuration)
	cacheMu.Unlock()
	return p
}

// seasonalFallback generates sinusoidal multipliers based on current month.
func seasonalFallback(t time.Time) *DistrictPulseState {
	m := float64(t.Month() - 1) // 0–11
	phase := (m / 12.0) * 2 * math.Pi

	// Food peaks in winter (Jan), low in summer
	food := 1.0 + 0.15*math.Cos(phase)
	// Energy: double hump — summer heat + winter heating
	energy := 1.0 + 0.2*math.Cos(phase-math.Pi) + 0.1*math.Cos(phase)
	// Heat peaks in August
	heat := 0.6 + 0.4*math.Sin(phase-math.Pi/2)
	// Migration peaks Sep–Nov
	migrant := 1.0 + 0.15*math.Sin(phase+math.Pi/4)

	return &DistrictPulseState{
		Multipliers: EconomicMultipliers{
			Food:    clamp(food, 0.7, 1.5),
			Energy:  clamp(energy, 0.8, 1.5),
			Wage:    1.0,
			Transit: 1.0,
			Heat:    clamp(heat, 0.4, 1.5),
			Migrant: clamp(migrant, 0.7, 1.5),
		},
		FetchedAt: t.UTC().Format(time.RFC3339),
		Source:    "seasonal-fallback",
	}
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// HandleEconomy serves GET /api/v1/pulse/economy
func HandleEconomy(w http.ResponseWriter, r *http.Request) {
	state := GetPulseState()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if err := json.NewEncoder(w).Encode(state); err != nil {
		slog.Error("pulse/economy encode", "err", err)
	}
}

// HandleClimate serves GET /api/v1/pulse/climate
func HandleClimate(w http.ResponseWriter, r *http.Request) {
	state := GetPulseState()
	type climateResp struct {
		Heat    float64 `json:"heat"`
		Migrant float64 `json:"migrant"`
		Source  string  `json:"source"`
	}
	resp := climateResp{
		Heat:    state.Multipliers.Heat,
		Migrant: state.Multipliers.Migrant,
		Source:  state.Source,
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		slog.Error("pulse/climate encode", "err", err)
	}
}
