package middleware

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const UserIDKey contextKey = "userId"

// TokenVerifier is implemented by auth.Service (see internal/auth/token.go)
// — HS256 JWT verification against JWT_SECRET, CLAUDE.md-mandated to be
// >=32 bytes and fail-fast checked in internal/config. This is the entire
// authorization gate for every route it wraps in cmd/server/main.go
// (r.With(requireAuth)...): a valid, unexpired, correctly-signed token is
// the only thing checked — there is no per-route scope/role distinction,
// every authenticated user can call every requireAuth route for their own
// userId (each handler is responsible for scoping queries to UserID(r)
// itself, e.g. /save, /social/*).
type TokenVerifier interface {
	Verify(token string) (string, error)
}

// RequireAuth is real middleware, not just naming: a missing/malformed
// Authorization header or a token that fails Verify (bad signature,
// expired, wrong algorithm) always gets a 401 — there is no fallback path
// that lets a request through unauthenticated. UserID(r) below is only
// ever populated from a successfully verified token's `sub` claim (never
// from client-supplied data), so any handler that trusts it is trusting
// the JWT signature, not the caller.
func RequireAuth(v TokenVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			token := strings.TrimPrefix(header, "Bearer ")
			userId, err := v.Verify(token)
			if err != nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, userId)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserID(r *http.Request) string {
	v, _ := r.Context().Value(UserIDKey).(string)
	return v
}
