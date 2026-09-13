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
	GoEnv             string
	ViteOrigin        string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:       getEnv("PORT", "8080"),
		GoEnv:      getEnv("GO_ENV", "production"),
		ViteOrigin: getEnv("VITE_ORIGIN", "http://localhost:9300"),
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
