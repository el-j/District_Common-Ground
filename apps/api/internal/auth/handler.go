package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

type authRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token  string `json:"token"`
	UserID string `json:"userId"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if !isValidEmail(req.Email) || len(req.Password) < 8 {
		jsonError(w, "email invalid or password too short", http.StatusBadRequest)
		return
	}

	userId, tok, err := h.svc.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrEmailTaken) {
			jsonError(w, "email already registered", http.StatusConflict)
			return
		}
		jsonError(w, "registration failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(authResponse{Token: tok, UserID: userId})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	userId, tok, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCreds) {
			jsonError(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		jsonError(w, "login failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(authResponse{Token: tok, UserID: userId})
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_, _ = w.Write([]byte(`{"error":"` + msg + `"}`))
}

func isValidEmail(e string) bool {
	at := strings.Index(e, "@")
	return at > 0 && at < len(e)-1
}
