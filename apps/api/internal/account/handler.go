package account

import (
	"errors"
	"net/http"

	"github.com/district-cg/api/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// Export serves GET /api/v1/account/export — auth required. Downloads
// everything stored about the signed-in player as JSON.
func (h *Handler) Export(w http.ResponseWriter, r *http.Request) {
	doc, err := h.repo.Export(r.Context(), middleware.UserID(r))
	if err != nil {
		http.Error(w, `{"error":"failed to export account"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="district-common-ground-my-data.json"`)
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(doc)
}

// Delete serves DELETE /api/v1/account — auth required. Permanently deletes
// the signed-in player's account and all their data.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	err := h.repo.Delete(r.Context(), middleware.UserID(r))
	if err != nil && !errors.Is(err, ErrNotFound) {
		http.Error(w, `{"error":"failed to delete account"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
