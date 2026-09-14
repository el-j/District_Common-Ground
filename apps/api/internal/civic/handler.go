package civic

import (
	"encoding/json"
	"net/http"
)

// defaultRegionCode is used whenever the client omits ?region= — it is a
// static fallback bucket, never inferred from the request (no IP lookup).
const defaultRegionCode = "GENERIC"

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// Ticker serves GET /api/v1/civic/ticker?region=CODE.
//
// Privacy guarantee: this handler reads only the coarse `region` query
// parameter the player chose in Settings. It never reads r.RemoteAddr, any
// X-Forwarded-For/CF-Connecting-IP style header, or any geolocation API, and
// nothing about the requester is persisted — see Security & Privacy test in
// docs/tasks/M15-civic-networking-theme-shop.md.
func (h *Handler) Ticker(w http.ResponseWriter, r *http.Request) {
	region := r.URL.Query().Get("region")
	if region == "" {
		region = defaultRegionCode
	}
	actions, err := h.repo.ListUpcomingActions(r.Context(), region)
	if err != nil {
		http.Error(w, `{"error":"civic ticker unavailable"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(actions)
}

// Chapters serves GET /api/v1/civic/chapters?region=CODE — same privacy
// guarantee as Ticker above.
func (h *Handler) Chapters(w http.ResponseWriter, r *http.Request) {
	region := r.URL.Query().Get("region")
	if region == "" {
		region = defaultRegionCode
	}
	chapters, err := h.repo.ListChapters(r.Context(), region)
	if err != nil {
		http.Error(w, `{"error":"chapter directory unavailable"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(chapters)
}
