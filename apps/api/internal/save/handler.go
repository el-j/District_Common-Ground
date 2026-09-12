package save

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

func (h *Handler) Load(w http.ResponseWriter, r *http.Request) {
	userId := middleware.UserID(r)
	state, err := h.repo.Load(r.Context(), userId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			http.Error(w, `{"error":"no save found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"failed to load save"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(state)
}

func (h *Handler) Upsert(w http.ResponseWriter, r *http.Request) {
	userId := middleware.UserID(r)

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}
	if !json.Valid(body) {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if err := h.repo.Upsert(r.Context(), userId, json.RawMessage(body)); err != nil {
		http.Error(w, `{"error":"failed to save"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
