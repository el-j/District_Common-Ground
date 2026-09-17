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

type proposeTradeRequest struct {
	Identifier          string `json:"identifier"`
	OfferResourceType   string `json:"offerResourceType"`
	OfferAmount         int64  `json:"offerAmount"`
	RequestResourceType string `json:"requestResourceType"`
	RequestAmount       int64  `json:"requestAmount"`
	Note                string `json:"note"`
}

// ProposeTrade serves POST /api/v1/social/trade/propose.
func (h *Handler) ProposeTrade(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}
	var req proposeTradeRequest
	if err := json.Unmarshal(body, &req); err != nil ||
		req.Identifier == "" || req.OfferAmount <= 0 || req.RequestAmount <= 0 ||
		!isValidResourceType(req.OfferResourceType) || !isValidResourceType(req.RequestResourceType) {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	offer, err := h.repo.ProposeTrade(r.Context(), userID, req.Identifier,
		req.OfferResourceType, req.OfferAmount, req.RequestResourceType, req.RequestAmount, req.Note)
	if err != nil {
		switch {
		case errors.Is(err, ErrUserNotFound):
			http.Error(w, `{"error":"no user found with that handle or invite code"}`, http.StatusNotFound)
		case errors.Is(err, ErrSelfFriend):
			http.Error(w, `{"error":"cannot propose a trade to yourself"}`, http.StatusBadRequest)
		case errors.Is(err, ErrNotFriends):
			http.Error(w, `{"error":"not friends with that user"}`, http.StatusForbidden)
		default:
			http.Error(w, `{"error":"failed to propose trade"}`, http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(offer)
}

// TradeInbox serves GET /api/v1/social/trade/inbox — pending offers awaiting
// the signed-in user's response.
func (h *Handler) TradeInbox(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	offers, err := h.repo.ListTradeInbox(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load trade inbox"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(offers)
}

// TradeOutbox serves GET /api/v1/social/trade/outbox — offers the signed-in
// user proposed that aren't fully settled yet (still pending, or resolved
// but not yet collected).
func (h *Handler) TradeOutbox(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	offers, err := h.repo.ListTradeOutbox(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to load trade outbox"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(offers)
}

// AcceptTrade serves POST /api/v1/social/trade/{id}/accept.
func (h *Handler) AcceptTrade(w http.ResponseWriter, r *http.Request) {
	h.respondTrade(w, r, true)
}

// DeclineTrade serves POST /api/v1/social/trade/{id}/decline.
func (h *Handler) DeclineTrade(w http.ResponseWriter, r *http.Request) {
	h.respondTrade(w, r, false)
}

func (h *Handler) respondTrade(w http.ResponseWriter, r *http.Request, accept bool) {
	userID := middleware.UserID(r)
	tradeID := chi.URLParam(r, "id")

	offer, err := h.repo.RespondTrade(r.Context(), userID, tradeID, accept)
	if err != nil {
		h.writeTradeError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(offer)
}

// CancelTrade serves POST /api/v1/social/trade/{id}/cancel.
func (h *Handler) CancelTrade(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	tradeID := chi.URLParam(r, "id")

	result, err := h.repo.CancelTrade(r.Context(), userID, tradeID)
	if err != nil {
		h.writeTradeError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

// SettleTrade serves POST /api/v1/social/trade/{id}/settle — the proposer
// collecting the outcome of a resolved offer.
func (h *Handler) SettleTrade(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)
	tradeID := chi.URLParam(r, "id")

	result, err := h.repo.SettleTrade(r.Context(), userID, tradeID)
	if err != nil {
		h.writeTradeError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *Handler) writeTradeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrTradeNotFound):
		http.Error(w, `{"error":"trade offer not found"}`, http.StatusNotFound)
	case errors.Is(err, ErrNotTradeRecipient):
		http.Error(w, `{"error":"not the recipient of that trade offer"}`, http.StatusForbidden)
	case errors.Is(err, ErrNotTradeProposer):
		http.Error(w, `{"error":"not the proposer of that trade offer"}`, http.StatusForbidden)
	case errors.Is(err, ErrTradeNotPending):
		http.Error(w, `{"error":"trade offer is no longer pending"}`, http.StatusConflict)
	case errors.Is(err, ErrTradeAlreadySettled):
		http.Error(w, `{"error":"trade offer already settled"}`, http.StatusConflict)
	default:
		http.Error(w, `{"error":"failed to process trade offer"}`, http.StatusInternalServerError)
	}
}
