package middleware

import (
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// RateLimiter is a small in-memory fixed-window limiter (2026-09-29 launch
// audit §1.8 — nothing was rate limited; login/register run bcrypt at cost
// 12, which made them a brute-force and CPU-exhaustion target). It is per
// process: behind several API replicas, move this to a shared store.
type RateLimiter struct {
	limit  int
	window time.Duration
	now    func() time.Time

	mu      sync.Mutex
	buckets map[string]*bucket
	lastGC  time.Time
}

type bucket struct {
	start time.Time
	count int
}

// NewRateLimiter allows `limit` requests per key per `window`.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{limit: limit, window: window, now: time.Now, buckets: map[string]*bucket{}}
}

// allow records one request for key and reports whether it is allowed, and
// if not, how long until the window resets.
func (rl *RateLimiter) allow(key string) (bool, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := rl.now()
	if now.Sub(rl.lastGC) > rl.window {
		for k, b := range rl.buckets {
			if now.Sub(b.start) >= rl.window {
				delete(rl.buckets, k)
			}
		}
		rl.lastGC = now
	}
	b, ok := rl.buckets[key]
	if !ok || now.Sub(b.start) >= rl.window {
		rl.buckets[key] = &bucket{start: now, count: 1}
		return true, 0
	}
	if b.count >= rl.limit {
		return false, rl.window - now.Sub(b.start)
	}
	b.count++
	return true, 0
}

// Middleware rejects requests over the limit with 429 and Retry-After.
func (rl *RateLimiter) Middleware(key func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ok, wait := rl.allow(key(r))
			if !ok {
				secs := int(wait.Seconds()) + 1
				w.Header().Set("Retry-After", strconv.Itoa(secs))
				http.Error(w, `{"error":"too many requests — please slow down"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ByIP keys on the client IP. X-Real-IP (set by our nginx) is only trusted
// when trustProxy is true, since any client could otherwise spoof it.
func ByIP(trustProxy bool) func(*http.Request) string {
	return func(r *http.Request) string {
		if trustProxy {
			if ip := r.Header.Get("X-Real-IP"); ip != "" {
				return ip
			}
		}
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			return r.RemoteAddr
		}
		return host
	}
}

// ByUser keys on the signed-in user (set by RequireAuth), falling back to IP.
func ByUser(trustProxy bool) func(*http.Request) string {
	ip := ByIP(trustProxy)
	return func(r *http.Request) string {
		if id := UserID(r); id != "" {
			return "user:" + id
		}
		return "ip:" + ip(r)
	}
}

// MaxBody caps request bodies; reading past the cap fails with
// "http: request body too large".
func MaxBody(n int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, n)
			}
			next.ServeHTTP(w, r)
		})
	}
}
