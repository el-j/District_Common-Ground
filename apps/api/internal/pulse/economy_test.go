package pulse_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/district-cg/api/internal/pulse"
)

func TestHandleEconomy_OK(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/pulse/economy", nil)
	pulse.HandleEconomy(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("unexpected Content-Type: %s", ct)
	}

	var resp pulse.DistrictPulseState
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.FetchedAt == "" {
		t.Error("FetchedAt is empty")
	}
	if resp.Source == "" {
		t.Error("Source is empty")
	}

	m := resp.Multipliers
	for name, v := range map[string]float64{
		"food": m.Food, "energy": m.Energy, "wage": m.Wage,
		"transit": m.Transit, "heat": m.Heat, "migrant": m.Migrant,
	} {
		if v < 0.1 || v > 3.0 {
			t.Errorf("multiplier %s out of sane range: %.3f", name, v)
		}
	}
}

func TestHandleEconomy_Caching(t *testing.T) {
	// Two requests in quick succession should return identical data.
	w1 := httptest.NewRecorder()
	pulse.HandleEconomy(w1, httptest.NewRequest(http.MethodGet, "/", nil))

	w2 := httptest.NewRecorder()
	pulse.HandleEconomy(w2, httptest.NewRequest(http.MethodGet, "/", nil))

	if w1.Body.String() != w2.Body.String() {
		t.Error("expected identical cached responses, got different bodies")
	}
}

func TestSeasonalFallback_AllMonths(t *testing.T) {
	// Every month should produce multipliers within the designed range.
	for m := 1; m <= 12; m++ {
		ref := time.Date(2024, time.Month(m), 15, 0, 0, 0, 0, time.UTC)
		state := pulse.GetPulseStateAt(ref)
		mul := state.Multipliers
		if mul.Food < 0.7 || mul.Food > 1.5 {
			t.Errorf("month %d: food %.3f out of [0.7,1.5]", m, mul.Food)
		}
		if mul.Energy < 0.8 || mul.Energy > 1.5 {
			t.Errorf("month %d: energy %.3f out of [0.8,1.5]", m, mul.Energy)
		}
	}
}

func TestHandleClimate_OK(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/pulse/climate", nil)
	pulse.HandleClimate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	type climateResp struct {
		Heat    float64 `json:"heat"`
		Migrant float64 `json:"migrant"`
		Source  string  `json:"source"`
	}
	var resp climateResp
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Heat <= 0 || resp.Migrant <= 0 {
		t.Errorf("unexpected climate values: heat=%v migrant=%v", resp.Heat, resp.Migrant)
	}
}

func TestHandleNews_OK(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/pulse/news", nil)
	pulse.HandleNews(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	type newsResp struct {
		Items     []pulse.NewsItem `json:"items"`
		FetchedAt string          `json:"fetchedAt"`
		Source    string          `json:"source"`
	}
	var resp newsResp
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.FetchedAt == "" {
		t.Error("FetchedAt empty")
	}
}

func TestClassifyArchetype(t *testing.T) {
	cases := []struct {
		title, summary string
		want           pulse.CrisisArchetype
	}{
		{"Transit Strike Looms", "workers demand wage increase after gig rate cuts", pulse.ArchetypeLaborTransit},
		{"Heat Dome Emergency", "flood and heat wave hit district residents", pulse.ArchetypeClimateExtreme},
		{"Eviction Notices Surge", "landlord raises rent amid speculation wave", pulse.ArchetypeHousingSpeculate},
		{"Community Fridge Shutdown", "food access ends for 40 families nutrition crisis", pulse.ArchetypeFoodHealth},
		{"Disinformation Campaign", "viral video and propaganda spread misinformation", pulse.ArchetypeCivicDisinfo},
		{"ICE Enforcement Sweep", "deportation and sanctuary policy under threat", pulse.ArchetypeMigrationSanct},
		{"Far-Right March Planned", "fascist neo-nazi white nationalist extremist group", pulse.ArchetypeFascistAgitation},
	}
	for _, tc := range cases {
		got := pulse.ClassifyArchetype(tc.title, tc.summary)
		if got != tc.want {
			t.Errorf("ClassifyArchetype(%q,%q) = %v, want %v", tc.title, tc.summary, got, tc.want)
		}
	}
}
