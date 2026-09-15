package narrative_test

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/district-cg/api/internal/narrative"
)

// buildValidJSON constructs a minimal valid scenario JSON string.
func buildValidJSON(id, archetype string) string {
	return fmt.Sprintf(`{
		"id": %q,
		"archetype": %q,
		"title": "Test Scenario Title",
		"context": "This is a long enough context string for the validator to accept it.",
		"choiceA": {
			"label": "Authoritarian choice",
			"type": "authoritarian",
			"description": "Take the money and run",
			"consequences": {"cashDelta": 30, "energyDelta": 0, "trustDelta": -10, "resilienceDelta": -5, "stressDelta": 5, "worldEffect": "x"}
		},
		"choiceB": {
			"label": "Solidarity choice",
			"type": "solidarity",
			"description": "Organise with neighbours",
			"consequences": {"cashDelta": -10, "energyDelta": -15, "trustDelta": 20, "resilienceDelta": 15, "stressDelta": -5, "worldEffect": "x"}
		}
	}`, id, archetype)
}

// buildJSONWithDeltas constructs a scenario with specific solidarity trust/resilience deltas.
func buildJSONWithDeltas(id, archetype string, trustDelta, resilienceDelta int) string {
	raw := map[string]any{
		"id":        id,
		"archetype": archetype,
		"title":     "Test With Deltas",
		"context":   "Long enough context string for the validator requirements here.",
		"choiceA": map[string]any{
			"label": "Auth", "type": "authoritarian", "description": "Auth desc",
			"consequences": map[string]int{"cashDelta": 10, "energyDelta": 0, "trustDelta": -5, "resilienceDelta": -5, "stressDelta": 0},
		},
		"choiceB": map[string]any{
			"label": "Sol", "type": "solidarity", "description": "Sol desc",
			"consequences": map[string]int{
				"cashDelta": -5, "energyDelta": -10,
				"trustDelta":      trustDelta,
				"resilienceDelta": resilienceDelta,
				"stressDelta":     0,
			},
		},
	}
	b, _ := json.Marshal(raw)
	return string(b)
}

// buildJSONWithAuthDeltas constructs a scenario with specific authoritarian trust/resilience deltas.
func buildJSONWithAuthDeltas(id, archetype string, trustDelta, resilienceDelta int) string {
	raw := map[string]any{
		"id":        id,
		"archetype": archetype,
		"title":     "Test Auth Deltas",
		"context":   "Long enough context string for the validator requirements here.",
		"choiceA": map[string]any{
			"label": "Auth", "type": "authoritarian", "description": "Auth desc",
			"consequences": map[string]int{
				"cashDelta": 20, "energyDelta": 0,
				"trustDelta":      trustDelta,
				"resilienceDelta": resilienceDelta,
				"stressDelta":     0,
			},
		},
		"choiceB": map[string]any{
			"label": "Sol", "type": "solidarity", "description": "Sol desc",
			"consequences": map[string]int{"cashDelta": -5, "energyDelta": -10, "trustDelta": 10, "resilienceDelta": 10, "stressDelta": 0},
		},
	}
	b, _ := json.Marshal(raw)
	return string(b)
}

func TestValidateScenario_Valid(t *testing.T) {
	raw := buildValidJSON("valid-scenario-01", "LABOR_TRANSIT")
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.ID != "valid-scenario-01" {
		t.Errorf("id mismatch: got %q", s.ID)
	}
	if s.Archetype != "LABOR_TRANSIT" {
		t.Errorf("archetype mismatch: got %q", s.Archetype)
	}
	// worldEffect must be forced
	if s.ChoiceA.Consequences.WorldEffect != "desaturate" {
		t.Errorf("choiceA worldEffect: got %q, want desaturate", s.ChoiceA.Consequences.WorldEffect)
	}
	if s.ChoiceB.Consequences.WorldEffect != "bloom" {
		t.Errorf("choiceB worldEffect: got %q, want bloom", s.ChoiceB.Consequences.WorldEffect)
	}
}

func TestValidateScenario_AllArchetypes(t *testing.T) {
	archetypes := []string{
		"LABOR_TRANSIT", "CLIMATE_EXTREME", "HOUSING_SPECULATE",
		"FOOD_HEALTH", "CIVIC_DISINFO", "MIGRATION_SANCT", "DIVISION_AGITATION",
	}
	for _, arch := range archetypes {
		t.Run(arch, func(t *testing.T) {
			raw := buildValidJSON("test-arch-"+strings.ToLower(arch[:4])+"-x", arch)
			_, err := narrative.ValidateScenario(raw)
			if err != nil {
				t.Errorf("archetype %q should be valid, got error: %v", arch, err)
			}
		})
	}
}

func TestValidateScenario_MalformedJSON(t *testing.T) {
	_, err := narrative.ValidateScenario(`{not valid json at all`)
	if err == nil {
		t.Fatal("expected error for malformed JSON")
	}
}

func TestValidateScenario_InvalidID_Spaces(t *testing.T) {
	raw := buildValidJSON("ID With Spaces", "CIVIC_DISINFO")
	_, err := narrative.ValidateScenario(raw)
	if err == nil {
		t.Fatal("expected error for ID with spaces")
	}
}

func TestValidateScenario_InvalidID_TooShort(t *testing.T) {
	raw := buildValidJSON("ab", "CIVIC_DISINFO")
	_, err := narrative.ValidateScenario(raw)
	if err == nil {
		t.Fatal("expected error for ID that is too short")
	}
}

func TestValidateScenario_InvalidArchetype(t *testing.T) {
	raw := buildValidJSON("test-bad-arch-01", "NOT_AN_ARCHETYPE")
	_, err := narrative.ValidateScenario(raw)
	if err == nil {
		t.Fatal("expected error for unknown archetype")
	}
}

func TestValidateScenario_WrongChoiceAType(t *testing.T) {
	raw := `{
		"id": "wrong-type-01",
		"archetype": "LABOR_TRANSIT",
		"title": "Wrong type scenario",
		"context": "Long enough context string for the validator to accept.",
		"choiceA": {"label": "A", "type": "solidarity", "description": "Wrong type", "consequences": {}},
		"choiceB": {"label": "B", "type": "solidarity", "description": "Fine", "consequences": {}}
	}`
	_, err := narrative.ValidateScenario(raw)
	if err == nil {
		t.Fatal("expected error when choiceA.type is not authoritarian")
	}
}

func TestValidateScenario_WrongChoiceBType(t *testing.T) {
	raw := `{
		"id": "wrong-type-02",
		"archetype": "LABOR_TRANSIT",
		"title": "Wrong B type scenario",
		"context": "Long enough context string for the validator to accept.",
		"choiceA": {"label": "A", "type": "authoritarian", "description": "Fine", "consequences": {}},
		"choiceB": {"label": "B", "type": "authoritarian", "description": "Wrong", "consequences": {}}
	}`
	_, err := narrative.ValidateScenario(raw)
	if err == nil {
		t.Fatal("expected error when choiceB.type is not solidarity")
	}
}

func TestValidateScenario_ClampsTrustDeltaHigh(t *testing.T) {
	raw := buildJSONWithDeltas("clamp-trust-hi-01", "CIVIC_DISINFO", 999, 10)
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.ChoiceB.Consequences.TrustDelta != 30 {
		t.Errorf("expected solidarity trustDelta clamped to 30, got %d", s.ChoiceB.Consequences.TrustDelta)
	}
}

func TestValidateScenario_ClampsTrustDeltaLow_Solidarity(t *testing.T) {
	raw := buildJSONWithDeltas("clamp-trust-lo-01", "CIVIC_DISINFO", -999, 10)
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.ChoiceB.Consequences.TrustDelta != 0 {
		t.Errorf("expected solidarity trustDelta clamped to 0 (minimum), got %d", s.ChoiceB.Consequences.TrustDelta)
	}
}

func TestValidateScenario_ClampsResilienceDeltaHigh_Solidarity(t *testing.T) {
	raw := buildJSONWithDeltas("clamp-res-hi-01", "HOUSING_SPECULATE", 10, 999)
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.ChoiceB.Consequences.ResilienceDelta != 30 {
		t.Errorf("expected solidarity resilienceDelta clamped to 30, got %d", s.ChoiceB.Consequences.ResilienceDelta)
	}
}

func TestValidateScenario_ClampsAuthTrustDelta(t *testing.T) {
	// Authoritarian trust delta must be <= 0; clamp to 0
	raw := buildJSONWithAuthDeltas("clamp-auth-trust-01", "CLIMATE_EXTREME", 999, -5)
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.ChoiceA.Consequences.TrustDelta != 0 {
		t.Errorf("expected authoritarian trustDelta clamped to 0, got %d", s.ChoiceA.Consequences.TrustDelta)
	}
}

func TestValidateScenario_ClampsAuthResilienceDelta(t *testing.T) {
	// Authoritarian resilience delta must be <= 0; value -999 should clamp to -30
	raw := buildJSONWithAuthDeltas("clamp-auth-res-01", "CLIMATE_EXTREME", -5, -999)
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.ChoiceA.Consequences.ResilienceDelta != -30 {
		t.Errorf("expected authoritarian resilienceDelta clamped to -30, got %d", s.ChoiceA.Consequences.ResilienceDelta)
	}
}

func TestValidateScenario_StripsMarkdownFences(t *testing.T) {
	raw := "```json\n" + buildValidJSON("strip-fence-01", "FOOD_HEALTH") + "\n```"
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("should strip markdown fences and parse: %v", err)
	}
	if s.ID != "strip-fence-01" {
		t.Errorf("unexpected id after fence strip: %q", s.ID)
	}
}

func TestValidateScenario_StripsMarkdownFencesNoLang(t *testing.T) {
	raw := "```\n" + buildValidJSON("strip-nolang-01", "MIGRATION_SANCT") + "\n```"
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatalf("should strip plain fences: %v", err)
	}
	if s.ID != "strip-nolang-01" {
		t.Errorf("unexpected id: %q", s.ID)
	}
}

func TestValidateScenario_ForcesWorldEffect(t *testing.T) {
	// worldEffect in JSON is ignored — validator overwrites to desaturate/bloom
	raw := buildValidJSON("effect-override-01", "DIVISION_AGITATION")
	s, err := narrative.ValidateScenario(raw)
	if err != nil {
		t.Fatal(err)
	}
	if s.ChoiceA.Consequences.WorldEffect != "desaturate" {
		t.Errorf("choiceA worldEffect must always be desaturate, got %q", s.ChoiceA.Consequences.WorldEffect)
	}
	if s.ChoiceB.Consequences.WorldEffect != "bloom" {
		t.Errorf("choiceB worldEffect must always be bloom, got %q", s.ChoiceB.Consequences.WorldEffect)
	}
}

func TestValidateScenario_TitleTooShort(t *testing.T) {
	raw := `{
		"id": "short-title-01",
		"archetype": "LABOR_TRANSIT",
		"title": "Ab",
		"context": "Long enough context string for the validator to accept.",
		"choiceA": {"label": "A", "type": "authoritarian", "description": "d", "consequences": {}},
		"choiceB": {"label": "B", "type": "solidarity", "description": "d", "consequences": {}}
	}`
	_, err := narrative.ValidateScenario(raw)
	if err == nil {
		t.Fatal("expected error for title that is too short")
	}
}

func TestValidateScenario_ContextTooShort(t *testing.T) {
	raw := `{
		"id": "short-context-01",
		"archetype": "LABOR_TRANSIT",
		"title": "Valid Title",
		"context": "Too short",
		"choiceA": {"label": "A", "type": "authoritarian", "description": "d", "consequences": {}},
		"choiceB": {"label": "B", "type": "solidarity", "description": "d", "consequences": {}}
	}`
	_, err := narrative.ValidateScenario(raw)
	if err == nil {
		t.Fatal("expected error for context that is too short")
	}
}
