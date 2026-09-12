package auth

import (
	"testing"
)

func TestToken_RoundTrip(t *testing.T) {
	svc := NewTokenService("test-secret-that-is-32-chars-long!!")
	userId := "123e4567-e89b-12d3-a456-426614174000"

	tok, err := svc.Sign(userId)
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	got, err := svc.Verify(tok)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if got != userId {
		t.Errorf("got userId %q, want %q", got, userId)
	}
}

func TestToken_InvalidSignature(t *testing.T) {
	svc := NewTokenService("test-secret-that-is-32-chars-long!!")
	_, err := svc.Verify("notavalidtoken")
	if err == nil {
		t.Fatal("expected error for invalid token, got nil")
	}
}

func TestToken_WrongSecret(t *testing.T) {
	svcA := NewTokenService("test-secret-that-is-32-chars-long!!")
	svcB := NewTokenService("different-secret-that-is-32-chars!!")

	tok, err := svcA.Sign("user-1")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}
	_, err = svcB.Verify(tok)
	if err == nil {
		t.Fatal("expected error for wrong secret, got nil")
	}
}
