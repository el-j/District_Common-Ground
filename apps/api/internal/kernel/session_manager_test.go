package kernel_test

import (
	"testing"
	"time"

	"github.com/district-cg/api/internal/kernel"
)

func TestSessionManager_SignAndVerify_RoundTrips(t *testing.T) {
	sm := kernel.NewSessionManager("a-very-long-test-secret-value-32b")
	claims := kernel.NewClaims("sess-1", "user-1", "courier-rush")

	token := sm.Sign(claims)
	got, err := sm.Verify(token)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if got.SessionID != "sess-1" || got.UserID != "user-1" || got.PluginID != "courier-rush" {
		t.Errorf("claims mismatch: got %+v", got)
	}
}

func TestSessionManager_Verify_RejectsTamperedSignature(t *testing.T) {
	sm := kernel.NewSessionManager("a-very-long-test-secret-value-32b")
	token := sm.Sign(kernel.NewClaims("sess-1", "user-1", "courier-rush"))

	tampered := token[:len(token)-2] + "xx"
	if _, err := sm.Verify(tampered); err == nil {
		t.Fatal("expected error for tampered token, got nil")
	}
}

func TestSessionManager_Verify_RejectsWrongSecret(t *testing.T) {
	sm1 := kernel.NewSessionManager("a-very-long-test-secret-value-32b")
	sm2 := kernel.NewSessionManager("a-different-secret-value-32bytes")

	token := sm1.Sign(kernel.NewClaims("sess-1", "user-1", "courier-rush"))
	if _, err := sm2.Verify(token); err == nil {
		t.Fatal("expected error for token signed with a different secret")
	}
}

func TestSessionManager_Verify_RejectsExpiredToken(t *testing.T) {
	sm := kernel.NewSessionManager("a-very-long-test-secret-value-32b")
	claims := kernel.SessionClaims{
		SessionID: "sess-1", UserID: "user-1", PluginID: "courier-rush",
		ExpiresAt: time.Now().Add(-1 * time.Minute),
	}
	token := sm.Sign(claims)

	_, err := sm.Verify(token)
	if err != kernel.ErrSessionExpired {
		t.Fatalf("got %v, want ErrSessionExpired", err)
	}
}

func TestSessionManager_Verify_RejectsMalformedToken(t *testing.T) {
	sm := kernel.NewSessionManager("a-very-long-test-secret-value-32b")
	if _, err := sm.Verify("not-a-real-token"); err == nil {
		t.Fatal("expected error for malformed token")
	}
}

func TestNewSessionID_ReturnsUniqueValues(t *testing.T) {
	a, err := kernel.NewSessionID()
	if err != nil {
		t.Fatalf("NewSessionID: %v", err)
	}
	b, err := kernel.NewSessionID()
	if err != nil {
		t.Fatalf("NewSessionID: %v", err)
	}
	if a == b {
		t.Error("expected two distinct session ids")
	}
	if len(a) == 0 {
		t.Error("expected non-empty session id")
	}
}
