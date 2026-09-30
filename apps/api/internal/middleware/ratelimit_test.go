package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
}

func TestRateLimit_BlocksAfterLimitWithinWindow(t *testing.T) {
	now := time.Unix(1_000, 0)
	rl := NewRateLimiter(3, time.Minute)
	rl.now = func() time.Time { return now }
	h := rl.Middleware(ByIP(false))(okHandler())

	do := func(ip string) int {
		req := httptest.NewRequest(http.MethodPost, "/x", nil)
		req.RemoteAddr = ip + ":1234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code
	}
	for i := 0; i < 3; i++ {
		if code := do("10.0.0.1"); code != http.StatusOK {
			t.Fatalf("request %d: got %d", i, code)
		}
	}
	if code := do("10.0.0.1"); code != http.StatusTooManyRequests {
		t.Fatalf("4th request: got %d, want 429", code)
	}
	if code := do("10.0.0.2"); code != http.StatusOK {
		t.Fatalf("other client: got %d, want 200", code)
	}
	now = now.Add(61 * time.Second)
	if code := do("10.0.0.1"); code != http.StatusOK {
		t.Fatalf("after window: got %d, want 200", code)
	}
}

func TestRateLimit_SetsRetryAfter(t *testing.T) {
	rl := NewRateLimiter(1, time.Minute)
	h := rl.Middleware(ByIP(false))(okHandler())
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	h.ServeHTTP(httptest.NewRecorder(), req)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Retry-After") == "" {
		t.Fatal("missing Retry-After header")
	}
}

func TestByIP_OnlyTrustsProxyHeaderWhenConfigured(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "172.18.0.5:5555"
	req.Header.Set("X-Real-IP", "203.0.113.9")
	if got := ByIP(false)(req); got != "172.18.0.5" {
		t.Errorf("untrusted: got %q", got)
	}
	if got := ByIP(true)(req); got != "203.0.113.9" {
		t.Errorf("trusted: got %q", got)
	}
}

func TestByUser_FallsBackToIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.1.1.1:1"
	if got := ByUser(false)(req); !strings.HasPrefix(got, "ip:") {
		t.Errorf("anonymous: got %q", got)
	}
}

func TestMaxBody_RejectsOversizedBodies(t *testing.T) {
	h := MaxBody(10)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 100)
		if _, err := r.Body.Read(buf); err != nil && err.Error() == "http: request body too large" {
			w.WriteHeader(http.StatusRequestEntityTooLarge)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(strings.Repeat("x", 50))))
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("got %d, want 413", rec.Code)
	}
}
