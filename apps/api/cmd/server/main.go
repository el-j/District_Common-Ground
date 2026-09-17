package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/district-cg/api/internal/auth"
	"github.com/district-cg/api/internal/civic"
	"github.com/district-cg/api/internal/config"
	"github.com/district-cg/api/internal/db"
	"github.com/district-cg/api/internal/gamedata"
	"github.com/district-cg/api/internal/irl"
	"github.com/district-cg/api/internal/kernel"
	"github.com/district-cg/api/internal/middleware"
	"github.com/district-cg/api/internal/narrative"
	"github.com/district-cg/api/internal/plugins" // plugin manifest: RegisterAll() wires minigames
	"github.com/district-cg/api/internal/pulse"
	"github.com/district-cg/api/internal/save"
	"github.com/district-cg/api/internal/shop"
	"github.com/district-cg/api/internal/social"
	"github.com/district-cg/api/internal/sync"
	"github.com/district-cg/api/internal/theme"
)

func main() {
	// Register bundled plugins and start runtime discovery before anything else.
	// New plugin binaries dropped into ./plugins are picked up without a code change.
	plugins.RegisterAll()

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
	economicSnapshotHandler := save.NewEconomicSnapshotHandler(pool)

	gamedataHandler := gamedata.NewHandler()
	narrativeHandler := narrative.NewHandler(pool)

	kernelRepo := kernel.NewRepository(pool)
	kernelHandler := kernel.NewHandler(kernel.DefaultRegistry, kernel.NewSessionManager(cfg.GameSessionSecret), kernelRepo, cfg.PluginOwnerUserID)
	themeHandler := theme.NewHandler(kernelRepo)
	shopHandler := shop.NewHandler(shop.NewRepository(pool))
	socialHandler := social.NewHandler(social.NewRepository(pool))
	civicHandler := civic.NewHandler(civic.NewRepository(pool))
	irlHandler := irl.NewHandler(irl.NewRepository(pool))
	syncHandler := sync.NewHandler(sync.NewRepository(pool))

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
		r.Get("/pulse/news", pulse.HandleNews)
		r.Get("/narrative/daily-scenarios", narrativeHandler.HandleDailyScenarios)
		r.Get("/district/resilience", solidarityHandler.HandleDistrictResilience)
		r.Get("/district/resilience/by-scenario", solidarityHandler.HandleResilienceByScenario)
		r.With(requireAuth).Post("/district/crisis-log", solidarityHandler.HandleRecordCrisisChoice)
		r.Get("/district/attrition", economicSnapshotHandler.HandleAttritionRate)
		r.With(requireAuth).Post("/district/economic-snapshot", economicSnapshotHandler.HandleRecordSnapshot)
		r.Get("/games", kernelHandler.ListGames)
		r.Get("/themes", themeHandler.List)
		r.Get("/shop/catalog", shopHandler.Catalog)
		r.With(requireAuth).Get("/shop/wallet", shopHandler.Wallet)
		r.With(requireAuth).Get("/shop/inventory", shopHandler.Inventory)
		r.With(requireAuth).Post("/shop/purchase", shopHandler.Purchase)
		r.With(requireAuth).Get("/social/me", socialHandler.Me)
		r.With(requireAuth).Get("/social/friends", socialHandler.Friends)
		r.With(requireAuth).Post("/social/friends/add", socialHandler.AddFriend)
		r.With(requireAuth).Get("/social/district/{userId}", socialHandler.District)
		r.With(requireAuth).Post("/social/caravan/dispatch", socialHandler.DispatchCaravan)
		r.With(requireAuth).Get("/social/caravan/inbox", socialHandler.Inbox)
		r.With(requireAuth).Post("/social/caravan/{id}/claim", socialHandler.ClaimCaravan)
		r.With(requireAuth).Post("/social/trade/propose", socialHandler.ProposeTrade)
		r.With(requireAuth).Get("/social/trade/inbox", socialHandler.TradeInbox)
		r.With(requireAuth).Get("/social/trade/outbox", socialHandler.TradeOutbox)
		r.With(requireAuth).Post("/social/trade/{id}/accept", socialHandler.AcceptTrade)
		r.With(requireAuth).Post("/social/trade/{id}/decline", socialHandler.DeclineTrade)
		r.With(requireAuth).Post("/social/trade/{id}/cancel", socialHandler.CancelTrade)
		r.With(requireAuth).Post("/social/trade/{id}/settle", socialHandler.SettleTrade)
		r.Get("/civic/ticker", civicHandler.Ticker)
		r.Get("/civic/chapters", civicHandler.Chapters)
		r.With(requireAuth).Post("/irl/deeds", irlHandler.LogDeed)
		r.With(requireAuth).Get("/irl/deeds", irlHandler.ListDeeds)
		r.With(requireAuth).Post("/sync/deltas", syncHandler.Exchange)
		r.With(requireAuth).Post("/plugins/verification-requests", kernelHandler.SubmitVerificationRequest)
		r.With(requireAuth).Get("/plugins/verification-requests", kernelHandler.ListVerificationRequests)
		r.With(requireAuth).Post("/plugins/verification-requests/{id}/review", kernelHandler.ReviewVerificationRequest)
		r.With(requireAuth).Post("/games/{id}/session", kernelHandler.StartSession)
		r.With(requireAuth).Post("/games/{id}/complete", kernelHandler.CompleteSession)
	})

	log.Printf("api listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
