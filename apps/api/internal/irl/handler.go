package irl

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

type logDeedRequest struct {
	Category           string `json:"category"`
	Note               string `json:"note"`
	VerificationMethod string `json:"verificationMethod"`
}

type logDeedResponse struct {
	Deed   Deed   `json:"deed"`
	Wallet Wallet `json:"wallet"`
}

// LogDeed serves POST /api/v1/irl/deeds — auth required. Records a real-world
// mutual-aid deed and credits ST/CAB to the signed-in user's wallet.
func (h *Handler) LogDeed(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}
	var req logDeedRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	deed, wallet, err := h.repo.LogDeed(r.Context(), userID, Category(req.Category), req.Note, VerificationMethod(req.VerificationMethod))
	if err != nil {
		if errors.Is(err, ErrInvalidDeed) {
			http.Error(w, `{"error":"invalid deed category or verification method"}`, http.StatusBadRequest)
			return
		}
		http.Error(w, `{"error":"failed to log deed"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(logDeedResponse{Deed: deed, Wallet: wallet})
}

// ListDeeds serves GET /api/v1/irl/deeds — auth required. Returns the
// signed-in user's deed history, most recent first, for the Civic Journal UI.
func (h *Handler) ListDeeds(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	deeds, err := h.repo.ListDeeds(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load deed history"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(deeds)
}
