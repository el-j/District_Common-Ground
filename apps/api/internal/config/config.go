package config

import (
	"errors"
	"os"
)

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	GameSessionSecret string
	PluginOwnerUserID string
	GoEnv             string
	ViteOrigin        string
	// TrustProxy: take the client IP from X-Real-IP (set by our nginx) for
	// rate limiting. Only enable when the API is reachable solely via the proxy.
	TrustProxy bool
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		GoEnv:             getEnv("GO_ENV", "production"),
		ViteOrigin:        getEnv("VITE_ORIGIN", "http://localhost:9300"),
		PluginOwnerUserID: getEnv("PLUGIN_OWNER_USER_ID", ""),
		TrustProxy:        getEnv("TRUST_PROXY", "false") == "true",
	}

	cfg.DatabaseURL = os.Getenv("DATABASE_URL")
	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	cfg.JWTSecret = os.Getenv("JWT_SECRET")
	if len(cfg.JWTSecret) < 32 {
		return nil, errors.New("JWT_SECRET must be at least 32 characters")
	}

	cfg.GameSessionSecret = os.Getenv("GAME_SESSION_SECRET")
	if len(cfg.GameSessionSecret) < 32 {
		return nil, errors.New("GAME_SESSION_SECRET must be at least 32 characters")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
