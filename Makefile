# ==============================================================================
# District: Common Ground — Master Automation Makefile
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Colors for terminal output
BOLD    := \033[1m
GREEN   := \033[32m
YELLOW  := \033[33m
BLUE    := \033[34m
CYAN    := \033[36m
RED     := \033[31m
RESET   := \033[0m

COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_PROD := docker compose -f docker-compose.yml

# Detect OS for browser opening
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	OPEN_CMD := open
else
	OPEN_CMD := xdg-open
endif

.PHONY: help
help: ## Show this help menu with all available commands
	@echo -e "\n$(BOLD)$(CYAN)╔══════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo -e "$(BOLD)$(CYAN)║          District: Common Ground — Developer Control Center      ║$(RESET)"
	@echo -e "$(BOLD)$(CYAN)╚══════════════════════════════════════════════════════════════════╝$(RESET)\n"
	@echo -e "$(BOLD)Usage:$(RESET) make $(YELLOW)<command>$(RESET)\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ==============================================================================
# Setup & Housekeeping
# ==============================================================================

.PHONY: setup
setup: env-init install ## Complete first-time repository setup (env + npm + go)
	@echo -e "\n$(GREEN)✔ Repository setup complete!$(RESET)"
	@echo -e "Run $(YELLOW)make dev$(RESET) to start the local development stack, or $(YELLOW)make play$(RESET) to test.\n"

.PHONY: env-init
env-init: ## Initialize .env from .env.example if missing
	@if [ ! -f .env ]; then \
		echo -e "$(YELLOW)Creating .env from .env.example...$(RESET)"; \
		cp .env.example .env; \
		echo -e "$(GREEN)✔ .env created$(RESET)"; \
	else \
		echo -e "$(BLUE)ℹ .env already exists$(RESET)"; \
	fi

.PHONY: install
install: ## Install dependencies across monorepo workspaces and Go modules
	@echo -e "$(CYAN)Installing root and web npm workspace dependencies...$(RESET)"
	npm install
	@echo -e "$(CYAN)Downloading Go modules in apps/api...$(RESET)"
	cd apps/api && go mod download
	@echo -e "$(GREEN)✔ Dependencies installed successfully$(RESET)"

# ==============================================================================
# Development (Hot-Reload Stack)
# ==============================================================================

.PHONY: dev
dev: env-init ## Start local dev stack with hot-reloading (Vite HMR + Go live sync)
	@echo -e "$(CYAN)Starting District: Common Ground (Development Stack)...$(RESET)"
	@echo -e "$(YELLOW)Web frontend will be available at: http://localhost:9300$(RESET)"
	@echo -e "$(YELLOW)Go API will be available at:       http://localhost:8080$(RESET)"
	@echo -e "$(YELLOW)PostgreSQL available on port:      5432$(RESET)\n"
	$(COMPOSE_DEV) up --build

.PHONY: dev-d
dev-d: env-init ## Start local dev stack in detached background mode
	@echo -e "$(CYAN)Starting development stack in background...$(RESET)"
	$(COMPOSE_DEV) up --build -d
	@echo -e "$(GREEN)✔ Dev stack running!$(RESET) Access at $(CYAN)http://localhost:9300$(RESET)"

.PHONY: dev-down
dev-down: ## Stop and remove development stack containers and networks
	@echo -e "$(YELLOW)Stopping development stack...$(RESET)"
	$(COMPOSE_DEV) down

.PHONY: dev-logs
dev-logs: ## Follow live logs from the development stack
	$(COMPOSE_DEV) logs -f

# Standalone development targets (running without docker)
.PHONY: dev-web
dev-web: ## Run web frontend standalone locally via Vite (http://localhost:9300)
	@echo -e "$(CYAN)Starting Vite dev server...$(RESET)"
	npm -w apps/web run dev

.PHONY: dev-api
dev-api: ## Run Go API standalone locally (requires running PostgreSQL on 5432)
	@echo -e "$(CYAN)Starting Go server...$(RESET)"
	cd apps/api && go run ./cmd/server

.PHONY: dev-db
dev-db: ## Start standalone PostgreSQL container for local Go development
	@echo -e "$(CYAN)Starting development PostgreSQL database on port 5432...$(RESET)"
	$(COMPOSE_DEV) up db -d

# ==============================================================================
# Production-like Stack & Release
# ==============================================================================

.PHONY: up
up: env-init ## Start production-like stack (optimized static Nginx + compiled Go binary)
	@echo -e "$(CYAN)Starting production stack in background...$(RESET)"
	$(COMPOSE_PROD) up --build -d
	@echo -e "\n$(GREEN)✔ Game is live!$(RESET) Play at: $(BOLD)$(CYAN)http://localhost:9300$(RESET)\n"

.PHONY: down
down: ## Stop production-like stack
	@echo -e "$(YELLOW)Stopping stack...$(RESET)"
	$(COMPOSE_PROD) down

.PHONY: logs
logs: ## Follow live logs from the production stack
	$(COMPOSE_PROD) logs -f

.PHONY: ps
ps: ## Check container status and health
	@docker compose ps

.PHONY: play
play: ## Open the game in your default web browser
	@echo -e "$(CYAN)Opening District: Common Ground (http://localhost:9300)...$(RESET)"
	@$(OPEN_CMD) http://localhost:9300 2>/dev/null || echo -e "$(YELLOW)Open http://localhost:9300 in your browser.$(RESET)"

# ==============================================================================
# Quality Assurance, Linting & Testing
# ==============================================================================

.PHONY: check
check: lint test ## Run full quality checks (TypeScript + oxlint + unit tests)
	@echo -e "\n$(GREEN)✔ All code quality checks passed!$(RESET)\n"

.PHONY: lint
lint: ## Run oxlint on frontend and go vet on backend
	@echo -e "$(CYAN)Linting TypeScript frontend with oxlint...$(RESET)"
	npm -w apps/web run lint
	@echo -e "$(CYAN)Checking Go backend with go vet...$(RESET)"
	cd apps/api && go vet ./...
	@echo -e "$(GREEN)✔ Lint checks passed$(RESET)"

.PHONY: typecheck
typecheck: ## Run TypeScript compiler type-check
	@echo -e "$(CYAN)Type-checking TypeScript workspaces...$(RESET)"
	npm -w apps/web run typecheck
	@echo -e "$(GREEN)✔ TypeScript type-check passed$(RESET)"

.PHONY: test
test: test-web test-api ## Run all unit tests (Vitest + Go short tests)

.PHONY: test-web
test-web: ## Run frontend Vitest suite
	@echo -e "$(CYAN)Running Vitest frontend test suite...$(RESET)"
	npm -w apps/web run test

.PHONY: test-api
test-api: ## Run Go unit tests
	@echo -e "$(CYAN)Running Go unit tests...$(RESET)"
	cd apps/api && go test -race -short ./...

.PHONY: test-integration
test-integration: ## Run full Go test suite including DB testcontainers (Docker required)
	@echo -e "$(CYAN)Running full Go integration test suite...$(RESET)"
	cd apps/api && go test -race ./...

# ==============================================================================
# Build & Clean
# ==============================================================================

.PHONY: build
build: ## Build production bundles (Vite dist + Go binary)
	@echo -e "$(CYAN)Building web frontend bundle (Vite/Rolldown)...$(RESET)"
	npm -w apps/web run build
	@echo -e "$(CYAN)Building Go API static binary...$(RESET)"
	cd apps/api && CGO_ENABLED=0 go build -ldflags="-s -w" -o dist/server ./cmd/server
	@echo -e "$(GREEN)✔ Build outputs ready$(RESET)"

.PHONY: build-offline-pwa
build-offline-pwa: ## Build the zero-network PWA bundle (M18) — installable, offline-first via vite-plugin-pwa
	@echo -e "$(CYAN)Building offline-first PWA bundle (Vite/Rolldown + Workbox precache)...$(RESET)"
	npm -w apps/web run build
	@echo -e "$(GREEN)✔ Offline PWA build ready at apps/web/dist$(RESET)"

.PHONY: build-desktop-tauri
build-desktop-tauri: build-offline-pwa ## Build the Tauri v2 desktop shell (M18) — requires a Rust toolchain, unverified in CI
	@echo -e "$(CYAN)Building Tauri v2 desktop shell from apps/web/src-tauri...$(RESET)"
	cd apps/web && npx tauri build

.PHONY: build-android-capacitor
build-android-capacitor: build-offline-pwa ## Build the Capacitor Android APK (M18) — requires an Android SDK, unverified in CI
	@echo -e "$(CYAN)Syncing Capacitor Android project and building APK...$(RESET)"
	cd apps/web && npx cap sync android && npx cap build android

.PHONY: clean
clean: ## Remove build artifacts, test outputs, and temporary caches
	@echo -e "$(YELLOW)Cleaning build artifacts and dist directories...$(RESET)"
	rm -rf apps/web/dist apps/api/dist
	rm -rf apps/web/.vite
	@echo -e "$(GREEN)✔ Clean complete$(RESET)"

.PHONY: clean-all
clean-all: clean ## Deep clean: remove node_modules, volumes, and docker containers
	@echo -e "$(RED)Deep cleaning: stopping all containers and removing volumes...$(RESET)"
	$(COMPOSE_DEV) down -v --remove-orphans 2>/dev/null || true
	$(COMPOSE_PROD) down -v --remove-orphans 2>/dev/null || true
	@echo -e "$(YELLOW)Removing node_modules...$(RESET)"
	rm -rf node_modules apps/web/node_modules
	@echo -e "$(GREEN)✔ Deep clean complete. Run 'make setup' to re-initialize.$(RESET)"
