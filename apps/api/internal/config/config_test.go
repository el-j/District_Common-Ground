package config

import (
	"os"
	"strings"
	"testing"
)

func TestConfigLoad_Success(t *testing.T) {
	// Set valid environment variables
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb")
	os.Setenv("JWT_SECRET", strings.Repeat("a", 32))
	os.Setenv("GAME_SESSION_SECRET", strings.Repeat("b", 32))
	os.Setenv("PORT", "9090")
	os.Setenv("GO_ENV", "development")
	os.Setenv("VITE_ORIGIN", "http://localhost:3000")
	os.Setenv("PLUGIN_OWNER_USER_ID", "user-123")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("GAME_SESSION_SECRET")
		os.Unsetenv("PORT")
		os.Unsetenv("GO_ENV")
		os.Unsetenv("VITE_ORIGIN")
		os.Unsetenv("PLUGIN_OWNER_USER_ID")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != "9090" {
		t.Errorf("expected Port 9090, got %s", cfg.Port)
	}
	if cfg.GoEnv != "development" {
		t.Errorf("expected GoEnv development, got %s", cfg.GoEnv)
	}
	if cfg.ViteOrigin != "http://localhost:3000" {
		t.Errorf("expected ViteOrigin http://localhost:3000, got %s", cfg.ViteOrigin)
	}
	if cfg.PluginOwnerUserID != "user-123" {
		t.Errorf("expected PluginOwnerUserID user-123, got %s", cfg.PluginOwnerUserID)
	}
	if cfg.DatabaseURL != "postgres://test:test@localhost:5432/testdb" {
		t.Errorf("unexpected DatabaseURL: %s", cfg.DatabaseURL)
	}
}

func TestConfigLoad_Defaults(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb")
	os.Setenv("JWT_SECRET", strings.Repeat("a", 32))
	os.Setenv("GAME_SESSION_SECRET", strings.Repeat("b", 32))
	os.Unsetenv("PORT")
	os.Unsetenv("GO_ENV")
	os.Unsetenv("VITE_ORIGIN")
	os.Unsetenv("PLUGIN_OWNER_USER_ID")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("GAME_SESSION_SECRET")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected default Port 8080, got %s", cfg.Port)
	}
	if cfg.GoEnv != "production" {
		t.Errorf("expected default GoEnv production, got %s", cfg.GoEnv)
	}
	if cfg.ViteOrigin != "http://localhost:9300" {
		t.Errorf("expected default ViteOrigin http://localhost:9300, got %s", cfg.ViteOrigin)
	}
	if cfg.PluginOwnerUserID != "" {
		t.Errorf("expected empty PluginOwnerUserID, got %s", cfg.PluginOwnerUserID)
	}
}

func TestConfigLoad_MissingDatabaseURL(t *testing.T) {
	os.Unsetenv("DATABASE_URL")
	os.Setenv("JWT_SECRET", strings.Repeat("a", 32))
	os.Setenv("GAME_SESSION_SECRET", strings.Repeat("b", 32))
	defer func() {
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("GAME_SESSION_SECRET")
	}()

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL is required") {
		t.Fatalf("expected DATABASE_URL error, got %v", err)
	}
}

func TestConfigLoad_ShortJWTSecret(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb")
	os.Setenv("JWT_SECRET", "too-short-secret")
	os.Setenv("GAME_SESSION_SECRET", strings.Repeat("b", 32))
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("GAME_SESSION_SECRET")
	}()

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "JWT_SECRET must be at least 32 characters") {
		t.Fatalf("expected JWT_SECRET error, got %v", err)
	}
}

func TestConfigLoad_ShortGameSessionSecret(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb")
	os.Setenv("JWT_SECRET", strings.Repeat("a", 32))
	os.Setenv("GAME_SESSION_SECRET", "too-short-secret")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("GAME_SESSION_SECRET")
	}()

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "GAME_SESSION_SECRET must be at least 32 characters") {
		t.Fatalf("expected GAME_SESSION_SECRET error, got %v", err)
	}
}

func TestGetEnv(t *testing.T) {
	val := getEnv("NON_EXISTENT_KEY_12345", "fallback_value")
	if val != "fallback_value" {
		t.Errorf("expected fallback_value, got %s", val)
	}

	os.Setenv("EXISTENT_KEY_12345", "actual_value")
	defer os.Unsetenv("EXISTENT_KEY_12345")
	val = getEnv("EXISTENT_KEY_12345", "fallback_value")
	if val != "actual_value" {
		t.Errorf("expected actual_value, got %s", val)
	}
}
