package middleware

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const UserIDKey contextKey = "userId"

type TokenVerifier interface {
	Verify(token string) (string, error)
}

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
