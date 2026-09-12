package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newTestHandler(t *testing.T) *Handler {
	t.Helper()
	// handler_test uses a nil service — we only test input validation paths
	return &Handler{svc: nil}
}

func TestRegisterHandler_MissingBody(t *testing.T) {
	h := newTestHandler(t)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString("not-json"))
	w := httptest.NewRecorder()
	h.Register(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestRegisterHandler_ShortPassword(t *testing.T) {
	h := newTestHandler(t)
	body, _ := json.Marshal(map[string]string{"email": "a@b.com", "password": "short"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.Register(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestRegisterHandler_BadEmail(t *testing.T) {
	h := newTestHandler(t)
	body, _ := json.Marshal(map[string]string{"email": "notanemail", "password": "password123"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.Register(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want %d", w.Code, http.StatusBadRequest)
	}
}
