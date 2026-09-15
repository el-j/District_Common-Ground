package sync

import (
	"encoding/json"
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

type exchangeRequest struct {
	DeviceID    string           `json:"deviceId"`
	VectorClock map[string]int64 `json:"vectorClock"`
	Deltas      []Delta          `json:"deltas"`
}

type exchangeResponse struct {
	Deltas      []Delta          `json:"deltas"`
	VectorClock map[string]int64 `json:"vectorClock"`
}

// Exchange serves POST /api/v1/sync/deltas — auth required. Stores the
// caller's new deltas, then returns any deltas from the account's other
// devices the caller doesn't have yet, per docs/planning/18-...md's
// 4-stage delayed synchronization pipeline (stages 2-4).
func (h *Handler) Exchange(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}
	var req exchangeRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}
	if req.DeviceID == "" {
		http.Error(w, `{"error":"deviceId is required"}`, http.StatusBadRequest)
		return
	}
	if req.VectorClock == nil {
		req.VectorClock = map[string]int64{}
	}

	if err := h.repo.Store(r.Context(), userID, req.Deltas); err != nil {
		http.Error(w, `{"error":"failed to store deltas"}`, http.StatusInternalServerError)
		return
	}

	missing, serverClock, err := h.repo.MissingSince(r.Context(), userID, req.DeviceID, req.VectorClock)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch missing deltas"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(exchangeResponse{Deltas: missing, VectorClock: serverClock})
}
