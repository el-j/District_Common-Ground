package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type mockVerifier struct {
	validToken string
	userId     string
	err        error
}

func (m *mockVerifier) Verify(token string) (string, error) {
	if m.err != nil {
		return "", m.err
	}
	if token == m.validToken {
		return m.userId, nil
	}
	return "", errors.New("invalid token")
}

func TestRequireAuth_MissingHeader(t *testing.T) {
	v := &mockVerifier{validToken: "good-token", userId: "user-1"}
	handler := RequireAuth(v)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRequireAuth_MalformedHeader(t *testing.T) {
	v := &mockVerifier{validToken: "good-token", userId: "user-1"}
	handler := RequireAuth(v)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	v := &mockVerifier{validToken: "good-token", userId: "user-1"}
	handler := RequireAuth(v)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer bad-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRequireAuth_ValidToken(t *testing.T) {
	v := &mockVerifier{validToken: "good-token", userId: "user-123"}
	var observedUserID string
	handler := RequireAuth(v)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		observedUserID = UserID(r)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer good-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if observedUserID != "user-123" {
		t.Errorf("expected observedUserID user-123, got %s", observedUserID)
	}
}

func TestUserID_Empty(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if id := UserID(req); id != "" {
		t.Errorf("expected empty user id, got %s", id)
	}
}

func TestCORS_PreflightOptions(t *testing.T) {
	origin := "http://localhost:9300"
	handler := CORS(origin)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("next handler should not be called on OPTIONS")
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/test", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != origin {
		t.Errorf("unexpected allow origin: %s", rec.Header().Get("Access-Control-Allow-Origin"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Methods"), "OPTIONS") {
		t.Errorf("missing OPTIONS in methods: %s", rec.Header().Get("Access-Control-Allow-Methods"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Headers"), "Authorization") {
		t.Errorf("missing Authorization in headers: %s", rec.Header().Get("Access-Control-Allow-Headers"))
	}
}

func TestCORS_PassThrough(t *testing.T) {
	origin := "http://localhost:9300"
	called := false
	handler := CORS(origin)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("expected next handler to be called")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != origin {
		t.Errorf("unexpected allow origin: %s", rec.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestRecover_NoPanic(t *testing.T) {
	handler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != "ok" {
		t.Errorf("expected 'ok', got %s", rec.Body.String())
	}
}

func TestRecover_WithPanic(t *testing.T) {
	handler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something went critically wrong")
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "internal server error") {
		t.Errorf("expected internal server error in body, got %s", rec.Body.String())
	}
}
