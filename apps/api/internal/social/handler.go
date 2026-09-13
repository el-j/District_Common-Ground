package social

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/district-cg/api/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// Me serves GET /api/v1/social/me — the signed-in user's own handle and
// invite code, for the "copy invite code" UI.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	profile, err := h.repo.Me(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load profile"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(profile)
}

// Friends serves GET /api/v1/social/friends.
func (h *Handler) Friends(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	friends, err := h.repo.ListFriends(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load friends"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(friends)
}

type addFriendRequest struct {
	Identifier string `json:"identifier"`
}

// AddFriend serves POST /api/v1/social/friends/add — accepts either a handle
// or an invite code in the "identifier" field.
func (h *Handler) AddFriend(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}
	var req addFriendRequest
	if err := json.Unmarshal(body, &req); err != nil || req.Identifier == "" {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	friend, err := h.repo.AddFriend(r.Context(), userID, req.Identifier)
	if err != nil {
		switch {
		case errors.Is(err, ErrUserNotFound):
			http.Error(w, `{"error":"no user found with that handle or invite code"}`, http.StatusNotFound)
		case errors.Is(err, ErrSelfFriend):
			http.Error(w, `{"error":"cannot friend yourself"}`, http.StatusBadRequest)
		case errors.Is(err, ErrAlreadyFriends):
			http.Error(w, `{"error":"already friends"}`, http.StatusConflict)
		default:
			http.Error(w, `{"error":"failed to add friend"}`, http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(friend)
}

// District serves GET /api/v1/social/district/{userId} — a sanitized,
// read-only snapshot of a friend's district.
func (h *Handler) District(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	targetID := chi.URLParam(r, "userId")

	snapshot, err := h.repo.DistrictSnapshot(r.Context(), userID, targetID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFriends):
			http.Error(w, `{"error":"not friends with that user"}`, http.StatusForbidden)
		case errors.Is(err, ErrUserNotFound):
			http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		default:
			http.Error(w, `{"error":"failed to load district"}`, http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(snapshot)
}

type dispatchCaravanRequest struct {
	Identifier   string `json:"identifier"`
	ResourceType string `json:"resourceType"`
	Amount       int64  `json:"amount"`
	Note         string `json:"note"`
}

// DispatchCaravan serves POST /api/v1/social/caravan/dispatch.
func (h *Handler) DispatchCaravan(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}
	var req dispatchCaravanRequest
	if err := json.Unmarshal(body, &req); err != nil ||
		req.Identifier == "" || req.Amount <= 0 ||
		(req.ResourceType != "energy" && req.ResourceType != "food" && req.ResourceType != "cash") {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	caravan, err := h.repo.DispatchCaravan(r.Context(), userID, req.Identifier, req.ResourceType, req.Amount, req.Note)
	if err != nil {
		switch {
		case errors.Is(err, ErrUserNotFound):
			http.Error(w, `{"error":"no user found with that handle or invite code"}`, http.StatusNotFound)
		case errors.Is(err, ErrSelfFriend):
			http.Error(w, `{"error":"cannot dispatch a caravan to yourself"}`, http.StatusBadRequest)
		case errors.Is(err, ErrNotFriends):
			http.Error(w, `{"error":"not friends with that user"}`, http.StatusForbidden)
		default:
			http.Error(w, `{"error":"failed to dispatch caravan"}`, http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(caravan)
}

// Inbox serves GET /api/v1/social/caravan/inbox — unclaimed caravans
// addressed to the signed-in user (needed by the Caravan Dispatch Widget to
// show what's waiting to be claimed).
func (h *Handler) Inbox(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	caravans, err := h.repo.ListInbox(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load inbox"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(caravans)
}

type claimCaravanResponse struct {
	ResourceType string `json:"resourceType"`
	Amount       int64  `json:"amount"`
}

// ClaimCaravan serves POST /api/v1/social/caravan/{id}/claim.
func (h *Handler) ClaimCaravan(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	caravanID := chi.URLParam(r, "id")

	resourceType, amount, err := h.repo.ClaimCaravan(r.Context(), userID, caravanID)
	if err != nil {
		switch {
		case errors.Is(err, ErrCaravanNotFound):
			http.Error(w, `{"error":"caravan not found"}`, http.StatusNotFound)
		case errors.Is(err, ErrNotRecipient):
			http.Error(w, `{"error":"not the recipient of that caravan"}`, http.StatusForbidden)
		case errors.Is(err, ErrAlreadyClaimed):
			http.Error(w, `{"error":"caravan already claimed"}`, http.StatusConflict)
		default:
			http.Error(w, `{"error":"failed to claim caravan"}`, http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(claimCaravanResponse{ResourceType: resourceType, Amount: amount})
}
