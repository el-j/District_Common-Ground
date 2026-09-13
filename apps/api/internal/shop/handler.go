package shop

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/district-cg/api/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// Catalog serves GET /api/v1/shop/catalog — public, no auth required.
func (h *Handler) Catalog(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(Catalog())
}

// Wallet serves GET /api/v1/shop/wallet — the signed-in user's current balance.
func (h *Handler) Wallet(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	wallet, err := h.repo.GetWallet(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load wallet"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(wallet)
}

// Inventory serves GET /api/v1/shop/inventory — the signed-in user's owned items.
func (h *Handler) Inventory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	inventory, err := h.repo.GetInventory(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load inventory"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(inventory)
}

type purchaseRequest struct {
	ItemID string `json:"itemId"`
}

type purchaseResponse struct {
	Wallet    Wallet    `json:"wallet"`
	Inventory Inventory `json:"inventory"`
}

// Purchase serves POST /api/v1/shop/purchase — validates balance, debits ST,
// and grants the item atomically.
func (h *Handler) Purchase(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}
	var req purchaseRequest
	if err := json.Unmarshal(body, &req); err != nil || req.ItemID == "" {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	item, ok := Find(req.ItemID)
	if !ok {
		http.Error(w, `{"error":"item not found"}`, http.StatusNotFound)
		return
	}

	wallet, inventory, err := h.repo.Purchase(r.Context(), userID, item)
	if err != nil {
		switch {
		case errors.Is(err, ErrInsufficientFunds):
			http.Error(w, `{"error":"insufficient solidarity tokens"}`, http.StatusConflict)
		case errors.Is(err, ErrAlreadyOwned):
			http.Error(w, `{"error":"item already owned"}`, http.StatusConflict)
		default:
			http.Error(w, `{"error":"purchase failed"}`, http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(purchaseResponse{Wallet: wallet, Inventory: inventory})
}
