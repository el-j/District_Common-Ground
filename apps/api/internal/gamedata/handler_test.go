package gamedata

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandler_Crises(t *testing.T) {
	h := NewHandler()
	if h == nil {
		t.Fatal("expected non-nil handler")
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/data/crises", nil)
	rec := httptest.NewRecorder()
	h.Crises(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var crises []map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &crises); err != nil {
		t.Fatalf("failed to parse crises JSON: %v", err)
	}

	if len(crises) == 0 {
		t.Errorf("expected at least 1 crisis scenario, got 0")
	}
}
