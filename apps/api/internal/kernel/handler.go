package kernel

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/district-cg/api/internal/middleware"
)

type Handler struct {
	registry    *Registry
	sessions    *SessionManager
	repo        *Repository
	ownerUserID string
}

func NewHandler(registry *Registry, sessions *SessionManager, repo *Repository, ownerUserID string) *Handler {
	return &Handler{registry: registry, sessions: sessions, repo: repo, ownerUserID: ownerUserID}
}

// ListGames serves GET /api/v1/games — the public catalog of verified, healthy minigames.
func (h *Handler) ListGames(w http.ResponseWriter, r *http.Request) {
	games := h.registry.List(r.Context())
	verified, err := h.repo.ListVerifiedPlugins(r.Context())
	if err == nil {
		games = append(games, verified...)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(games)
}

type verificationRequestBody struct {
	SourceKind   string         `json:"sourceKind"`
	ManifestURL  *string        `json:"manifestUrl,omitempty"`
	BundleSHA256 string         `json:"bundleSha256"`
	Plugin       PluginMetadata `json:"pluginMetadata"`
}

type reviewVerificationRequestBody struct {
	Approved bool   `json:"approved"`
	Notes    string `json:"notes"`
}

func (h *Handler) isOwner(r *http.Request) bool {
	return h.ownerUserID != "" && middleware.UserID(r) == h.ownerUserID
}

func (h *Handler) SubmitVerificationRequest(w http.ResponseWriter, r *http.Request) {
	var req verificationRequestBody
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Plugin.ID == "" || req.BundleSHA256 == "" || (req.SourceKind != "url" && req.SourceKind != "file") {
		jsonError(w, "invalid verification request", http.StatusBadRequest)
		return
	}
	stored, err := h.repo.SubmitVerificationRequest(r.Context(), middleware.UserID(r), req.SourceKind, req.ManifestURL, req.BundleSHA256, req.Plugin)
	if err != nil {
		jsonError(w, "failed to submit verification request", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(stored)
}

func (h *Handler) ListVerificationRequests(w http.ResponseWriter, r *http.Request) {
	if !h.isOwner(r) {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	requests, err := h.repo.ListVerificationRequests(r.Context())
	if err != nil {
		jsonError(w, "failed to list verification requests", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(requests)
}

func (h *Handler) ReviewVerificationRequest(w http.ResponseWriter, r *http.Request) {
	if !h.isOwner(r) {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	requestID := chi.URLParam(r, "id")
	var req reviewVerificationRequestBody
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := h.repo.ReviewVerificationRequest(r.Context(), requestID, middleware.UserID(r), req.Approved, req.Notes); err != nil {
		jsonError(w, "failed to review verification request", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type startSessionRequest struct {
	Archetype   string `json:"archetype"`
	Difficulty  int    `json:"difficulty"`
	DistrictDay int    `json:"districtDay"`
}

type startSessionResponse struct {
	SessionID    string `json:"sessionId"`
	SessionToken string `json:"sessionToken"`
}

// StartSession serves POST /api/v1/games/:id/session — issues a signed, short-lived
// session token binding the authenticated user to one plugin.
func (h *Handler) StartSession(w http.ResponseWriter, r *http.Request) {
	pluginID := chi.URLParam(r, "id")
	plugin, ok := h.registry.Get(pluginID)
	if !ok {
		jsonError(w, "minigame not found", http.StatusNotFound)
		return
	}

	var req startSessionRequest
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req)
	}

	userId := middleware.UserID(r)
	sessionId, err := NewSessionID()
	if err != nil {
		jsonError(w, "failed to start session", http.StatusInternalServerError)
		return
	}

	cfg := SessionConfig{
		SessionID:   sessionId,
		UserID:      userId,
		Archetype:   req.Archetype,
		Difficulty:  req.Difficulty,
		DistrictDay: req.DistrictDay,
	}
	if _, err := plugin.StartSession(r.Context(), cfg); err != nil {
		jsonError(w, "plugin rejected session", http.StatusBadRequest)
		return
	}

	token := h.sessions.Sign(NewClaims(sessionId, userId, pluginID))

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(startSessionResponse{SessionID: sessionId, SessionToken: token})
}

type completeSessionRequest struct {
	SessionToken string          `json:"sessionToken"`
	Payload      json.RawMessage `json:"payload"`
}

// CompleteSession serves POST /api/v1/games/:id/complete — verifies the session
// token server-side, delegates score computation to the plugin, persists an
// audit row, and returns the verified reward grant for the client to apply.
func (h *Handler) CompleteSession(w http.ResponseWriter, r *http.Request) {
	pluginID := chi.URLParam(r, "id")
	plugin, ok := h.registry.Get(pluginID)
	if !ok {
		jsonError(w, "minigame not found", http.StatusNotFound)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		jsonError(w, "failed to read body", http.StatusBadRequest)
		return
	}
	var req completeSessionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	claims, err := h.sessions.Verify(req.SessionToken)
	if err != nil {
		if errors.Is(err, ErrSessionExpired) {
			jsonError(w, "session expired", http.StatusUnauthorized)
			return
		}
		jsonError(w, "invalid session token", http.StatusUnauthorized)
		return
	}

	userId := middleware.UserID(r)
	if claims.UserID != userId || claims.PluginID != pluginID {
		jsonError(w, "session does not match request", http.StatusForbidden)
		return
	}

	result, err := plugin.ComputeScore(r.Context(), req.SessionToken, req.Payload)
	if err != nil {
		jsonError(w, "score verification failed", http.StatusBadRequest)
		return
	}
	result.SessionID = claims.SessionID

	if err := h.repo.RecordSession(context.WithoutCancel(r.Context()), userId, pluginID, result); err != nil {
		jsonError(w, "failed to record session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_, _ = w.Write([]byte(`{"error":"` + msg + `"}`))
}
