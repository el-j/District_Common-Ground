package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/district-cg/api/internal/auth"
	"github.com/district-cg/api/internal/config"
)

func TestBuildRouter_Routes(t *testing.T) {
	cfg := &config.Config{
		Port:              "8080",
		DatabaseURL:       "postgres://test:test@localhost:5432/testdb",
		JWTSecret:         strings.Repeat("j", 32),
		GameSessionSecret: strings.Repeat("s", 32),
		PluginOwnerUserID: "owner-1",
		GoEnv:             "test",
		ViteOrigin:        "http://localhost:9300",
	}

	tokenSvc := auth.NewTokenService(cfg.JWTSecret)
	// pool is nil for unit test of router wiring and routes that do not touch db
	r := buildRouter(cfg, nil, tokenSvc)

	t.Run("GET /health", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		var res map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
			t.Fatalf("failed to parse json: %v", err)
		}
		if res["status"] != "ok" {
			t.Errorf("expected status 'ok', got %s", res["status"])
		}
	})

	t.Run("GET /api/v1/data/crises", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/data/crises", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("GET /api/v1/themes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/themes", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("GET /api/v1/kernel-plugins", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/kernel-plugins", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("GET /api/v1/pulse/economy", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/pulse/economy", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("GET /api/v1/pulse/climate", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/pulse/climate", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("GET /api/v1/pulse/news", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/pulse/news", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("GET /api/v1/save without auth returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/save", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})
}
