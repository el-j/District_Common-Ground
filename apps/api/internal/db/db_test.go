package db

import (
	"context"
	"testing"
	"time"
)

func TestOpen_InvalidURL(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := Open(ctx, "invalid-postgres-url://bad:bad@/")
	if err == nil {
		t.Fatal("expected error for invalid database URL, got nil")
	}
}

func TestOpen_ConnectionRefused(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	// Points to an unused port on localhost
	_, err := Open(ctx, "postgres://user:pass@127.0.0.1:59999/nodb?connect_timeout=1")
	if err == nil {
		t.Fatal("expected connection refused error, got nil")
	}
}

func TestRunMigrations_InvalidURL(t *testing.T) {
	err := RunMigrations("invalid-postgres-url://bad:bad@/")
	if err == nil {
		t.Fatal("expected error for invalid migration URL, got nil")
	}
}
