package pulse

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// CrisisArchetype classifies news items by impact category.
type CrisisArchetype string

const (
	ArchetypeLaborTransit      CrisisArchetype = "LABOR_TRANSIT"
	ArchetypeClimateExtreme    CrisisArchetype = "CLIMATE_EXTREME"
	ArchetypeHousingSpeculate  CrisisArchetype = "HOUSING_SPECULATE"
	ArchetypeFoodHealth        CrisisArchetype = "FOOD_HEALTH"
	ArchetypeCivicDisinfo      CrisisArchetype = "CIVIC_DISINFO"
	ArchetypeMigrationSanct    CrisisArchetype = "MIGRATION_SANCT"
	ArchetypeDivisionAgitation CrisisArchetype = "DIVISION_AGITATION"
)

type NewsItem struct {
	ID        string          `json:"id"`
	Title     string          `json:"title"`
	Summary   string          `json:"summary"`
	Source    string          `json:"source"`
	Archetype CrisisArchetype `json:"archetype"`
	FetchedAt string          `json:"fetchedAt"`
}

type NewsResponse struct {
	Items     []NewsItem `json:"items"`
	FetchedAt string     `json:"fetchedAt"`
	Source    string     `json:"source"`
}

// archetypeKeywords maps each archetype to triggering keyword sets.
var archetypeKeywords = map[CrisisArchetype][]string{
	ArchetypeLaborTransit:      {"strike", "gig", "transit", "fare", "courier", "warehouse", "contract", "wage", "labour", "labor", "worker"},
	ArchetypeClimateExtreme:    {"flood", "heat", "wildfire", "air quality", "storm", "climate", "drought", "cold snap", "power outage"},
	ArchetypeHousingSpeculate:  {"eviction", "rent", "landlord", "housing", "speculation", "gentrification", "short-term rental", "airbnb", "displacement"},
	ArchetypeFoodHealth:        {"food", "grocery", "fridge", "nutrition", "hunger", "meal", "water shutoff", "health", "pharmacy"},
	ArchetypeCivicDisinfo:      {"disinformation", "misinformation", "viral", "poll", "voting", "election", "surveillance", "propaganda", "social media"},
	ArchetypeMigrationSanct:    {"migrant", "refugee", "sanctuary", "border", "immigration", "deportation", "asylum", "enforcement"},
	ArchetypeDivisionAgitation: {"far-right", "fascist", "neo-nazi", "white nationalist", "extremist", "hate group", "intimidation", "march"},
}

// ClassifyArchetype assigns the most likely archetype from title+summary text.
func ClassifyArchetype(title, summary string) CrisisArchetype {
	lower := strings.ToLower(title + " " + summary)
	best := ArchetypeCivicDisinfo
	bestCount := 0
	for archetype, keywords := range archetypeKeywords {
		count := 0
		for _, kw := range keywords {
			if strings.Contains(lower, kw) {
				count++
			}
		}
		if count > bestCount {
			bestCount = count
			best = archetype
		}
	}
	return best
}

// HandleNews serves GET /api/v1/pulse/news
// Returns current news items; falls back to empty array when no live feed configured.
func HandleNews(w http.ResponseWriter, r *http.Request) {
	resp := NewsResponse{
		Items:     []NewsItem{},
		FetchedAt: time.Now().UTC().Format(time.RFC3339),
		Source:    "stub",
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=900")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		slog.Error("pulse/news encode", "err", err)
	}
}
