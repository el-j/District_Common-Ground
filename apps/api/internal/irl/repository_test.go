package irl_test

import (
	"context"
	"errors"
	"testing"

	"github.com/district-cg/api/internal/irl"
	"github.com/district-cg/api/testutil"
)

func TestLogDeed_HonorSystemAwardsSTAndCAB(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := irl.NewRepository(pool)
	ctx := context.Background()

	var userID string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('deed-doer@example.com', 'hash') RETURNING id`,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	deed, wallet, err := repo.LogDeed(ctx, userID, irl.CategoryFoodSharing, "Shared extra bread with neighbors", irl.VerificationHonorSystem)
	if err != nil {
		t.Fatalf("LogDeed: %v", err)
	}
	if deed.STAwarded != 25 || deed.CABAwarded != 1 {
		t.Errorf("got st=%d cab=%d, want st=25 cab=1", deed.STAwarded, deed.CABAwarded)
	}
	if wallet.SolidarityTokens != 25 || wallet.CivicBadges != 1 {
		t.Errorf("got wallet st=%d cab=%d, want st=25 cab=1", wallet.SolidarityTokens, wallet.CivicBadges)
	}
}

func TestLogDeed_PeerVerifiedAwardsMoreThanHonorSystem(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := irl.NewRepository(pool)
	ctx := context.Background()

	var userID string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('verified-doer@example.com', 'hash') RETURNING id`,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	deed, wallet, err := repo.LogDeed(ctx, userID, irl.CategoryEldercare, "Carried groceries for Mrs. Alvarez", irl.VerificationPeerVerified)
	if err != nil {
		t.Fatalf("LogDeed: %v", err)
	}
	if deed.STAwarded != 50 || deed.CABAwarded != 2 {
		t.Errorf("got st=%d cab=%d, want st=50 cab=2", deed.STAwarded, deed.CABAwarded)
	}
	if wallet.SolidarityTokens != 50 || wallet.CivicBadges != 2 {
		t.Errorf("got wallet st=%d cab=%d, want st=50 cab=2", wallet.SolidarityTokens, wallet.CivicBadges)
	}

	// A second deed should accumulate on top of the first.
	_, wallet2, err := repo.LogDeed(ctx, userID, irl.CategoryParkGreening, "Watered street trees", irl.VerificationHonorSystem)
	if err != nil {
		t.Fatalf("LogDeed (second): %v", err)
	}
	if wallet2.SolidarityTokens != 75 || wallet2.CivicBadges != 3 {
		t.Errorf("got accumulated wallet st=%d cab=%d, want st=75 cab=3", wallet2.SolidarityTokens, wallet2.CivicBadges)
	}

	deeds, err := repo.ListDeeds(ctx, userID)
	if err != nil {
		t.Fatalf("ListDeeds: %v", err)
	}
	if len(deeds) != 2 {
		t.Fatalf("got %d deeds, want 2", len(deeds))
	}
}

func TestLogDeed_RejectsInvalidCategoryAndMethod(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := irl.NewRepository(pool)
	ctx := context.Background()

	var userID string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('invalid-doer@example.com', 'hash') RETURNING id`,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	_, _, err = repo.LogDeed(ctx, userID, irl.Category("not_a_real_category"), "", irl.VerificationHonorSystem)
	if !errors.Is(err, irl.ErrInvalidDeed) {
		t.Errorf("got %v, want ErrInvalidDeed for bad category", err)
	}

	_, _, err = repo.LogDeed(ctx, userID, irl.CategoryFoodSharing, "", irl.VerificationMethod("gps_tracked"))
	if !errors.Is(err, irl.ErrInvalidDeed) {
		t.Errorf("got %v, want ErrInvalidDeed for bad verification method", err)
	}
}
