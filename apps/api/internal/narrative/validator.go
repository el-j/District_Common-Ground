package narrative

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// DynamicScenario mirrors the CrisisScenario structure used by the frontend.
type DynamicScenario struct {
	ID        string        `json:"id"`
	Archetype string        `json:"archetype"`
	Title     string        `json:"title"`
	Context   string        `json:"context"`
	ChoiceA   DynamicChoice `json:"choiceA"`
	ChoiceB   DynamicChoice `json:"choiceB"`
}

type DynamicChoice struct {
	Label       string              `json:"label"`
	Type        string              `json:"type"`
	Description string              `json:"description"`
	Consequences DynamicConsequences `json:"consequences"`
}

type DynamicConsequences struct {
	CashDelta       int    `json:"cashDelta"`
	EnergyDelta     int    `json:"energyDelta"`
	TrustDelta      int    `json:"trustDelta"`
	ResilienceDelta int    `json:"resilienceDelta"`
	StressDelta     int    `json:"stressDelta"`
	WorldEffect     string `json:"worldEffect"`
}

var validArchetypes = map[string]bool{
	"LABOR_TRANSIT": true, "CLIMATE_EXTREME": true, "HOUSING_SPECULATE": true,
	"FOOD_HEALTH": true, "CIVIC_DISINFO": true, "MIGRATION_SANCT": true, "FASCIST_AGITATION": true,
}

var idPattern = regexp.MustCompile(`^[a-z0-9-]{3,60}$`)

// ValidateScenario parses and validates LLM output, clamping all stat deltas.
// Returns error when the output is structurally invalid.
func ValidateScenario(raw string) (*DynamicScenario, error) {
	// Strip markdown code fences if present
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	var s DynamicScenario
	if err := json.Unmarshal([]byte(raw), &s); err != nil {
		return nil, fmt.Errorf("json unmarshal: %w", err)
	}

	// Structural checks
	if !idPattern.MatchString(s.ID) {
		return nil, fmt.Errorf("invalid id %q", s.ID)
	}
	if !validArchetypes[s.Archetype] {
		return nil, fmt.Errorf("invalid archetype %q", s.Archetype)
	}
	if len(s.Title) < 3 || len(s.Context) < 20 {
		return nil, fmt.Errorf("title or context too short")
	}
	if s.ChoiceA.Type != "authoritarian" {
		return nil, fmt.Errorf("choiceA.type must be authoritarian")
	}
	if s.ChoiceB.Type != "solidarity" {
		return nil, fmt.Errorf("choiceB.type must be solidarity")
	}

	// Hard-clamp all numeric deltas
	s.ChoiceA.Consequences = clampConsequences(s.ChoiceA.Consequences, true)
	s.ChoiceB.Consequences = clampConsequences(s.ChoiceB.Consequences, false)

	// Enforce worldEffect
	s.ChoiceA.Consequences.WorldEffect = "desaturate"
	s.ChoiceB.Consequences.WorldEffect = "bloom"

	return &s, nil
}

func clampConsequences(c DynamicConsequences, isAuthoritarian bool) DynamicConsequences {
	if isAuthoritarian {
		c.CashDelta = clampInt(c.CashDelta, -50, 100)
		c.EnergyDelta = clampInt(c.EnergyDelta, -30, 20)
		c.TrustDelta = clampInt(c.TrustDelta, -30, 0)
		c.ResilienceDelta = clampInt(c.ResilienceDelta, -30, 0)
	} else {
		c.CashDelta = clampInt(c.CashDelta, -30, 20)
		c.EnergyDelta = clampInt(c.EnergyDelta, -30, 0)
		c.TrustDelta = clampInt(c.TrustDelta, 0, 30)
		c.ResilienceDelta = clampInt(c.ResilienceDelta, 0, 30)
	}
	c.StressDelta = clampInt(c.StressDelta, -15, 20)
	return c
}

func clampInt(v, min, max int) int {
	if v < min { return min }
	if v > max { return max }
	return v
}
