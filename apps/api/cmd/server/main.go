package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/district-cg/api/internal/auth"
	"github.com/district-cg/api/internal/config"
	"github.com/district-cg/api/internal/db"
	"github.com/district-cg/api/internal/gamedata"
	"github.com/district-cg/api/internal/middleware"
	"github.com/district-cg/api/internal/pulse"
	"github.com/district-cg/api/internal/save"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	pool, err := db.Open(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	tokenSvc := auth.NewTokenService(cfg.JWTSecret)
	authSvc := auth.NewService(pool, tokenSvc)
	authHandler := auth.NewHandler(authSvc)

	saveRepo := save.NewRepository(pool)
	saveHandler := save.NewHandler(saveRepo)
	solidarityHandler := save.NewSolidarityHandler(pool)

	gamedataHandler := gamedata.NewHandler()

	r := chi.NewRouter()
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Logger)
	r.Use(middleware.CORS(cfg.ViteOrigin))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	requireAuth := middleware.RequireAuth(tokenSvc)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)
		r.With(requireAuth).Get("/save", saveHandler.Load)
		r.With(requireAuth).Put("/save", saveHandler.Upsert)
		r.Get("/data/crises", gamedataHandler.Crises)
		r.Get("/pulse/economy", pulse.HandleEconomy)
		r.Get("/pulse/climate", pulse.HandleClimate)
		r.Get("/district/resilience", solidarityHandler.HandleDistrictResilience)
	})

	log.Printf("api listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
