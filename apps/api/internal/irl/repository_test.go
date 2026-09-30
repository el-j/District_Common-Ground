package irl_test

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"

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

// 2026-09-29 launch audit §1.8 — "peer_verified" came from the client and
// was trusted, paying double. Until the server can verify a peer
// handshake, a claimed peer verification is recorded and paid as an
// honor-system deed.
func TestLogDeed_ClientClaimedPeerVerificationIsNotTrusted(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := irl.NewRepository(pool)
	ctx := context.Background()
	userID := seedUser(t, pool, "verified-doer@example.com")

	deed, wallet, err := repo.LogDeed(ctx, userID, irl.CategoryEldercare, "Carried groceries for Mrs. Alvarez", irl.VerificationPeerVerified)
	if err != nil {
		t.Fatalf("LogDeed: %v", err)
	}
	if deed.STAwarded != 25 || deed.VerificationMethod != string(irl.VerificationHonorSystem) {
		t.Errorf("got st=%d method=%s, want 25 honor_system", deed.STAwarded, deed.VerificationMethod)
	}

	_, wallet2, err := repo.LogDeed(ctx, userID, irl.CategoryParkGreening, "Watered street trees", irl.VerificationHonorSystem)
	if err != nil {
		t.Fatalf("LogDeed (second): %v", err)
	}
	if wallet2.SolidarityTokens != wallet.SolidarityTokens+25 {
		t.Errorf("wallet did not accumulate: %d then %d", wallet.SolidarityTokens, wallet2.SolidarityTokens)
	}
	deeds, err := repo.ListDeeds(ctx, userID)
	if err != nil || len(deeds) != 2 {
		t.Fatalf("ListDeeds: %v, %d deeds", err, len(deeds))
	}
}

// 2026-09-29 launch audit §1.8 — deeds were unlimited (unlimited tokens).
func TestLogDeed_DailyLimit(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := irl.NewRepository(pool)
	ctx := context.Background()
	userID := seedUser(t, pool, "busy-doer@example.com")

	for i := 0; i < irl.DailyDeedLimit; i++ {
		if _, _, err := repo.LogDeed(ctx, userID, irl.CategoryFoodSharing, "deed", irl.VerificationHonorSystem); err != nil {
			t.Fatalf("deed %d: %v", i, err)
		}
	}
	_, _, err := repo.LogDeed(ctx, userID, irl.CategoryFoodSharing, "one too many", irl.VerificationHonorSystem)
	if !errors.Is(err, irl.ErrDailyLimit) {
		t.Fatalf("got %v, want ErrDailyLimit", err)
	}
	var st int64
	if err := pool.QueryRow(ctx, `SELECT solidarity_tokens FROM user_wallets WHERE user_id = $1`, userID).Scan(&st); err != nil {
		t.Fatalf("read wallet: %v", err)
	}
	if st != int64(irl.DailyDeedLimit)*25 {
		t.Errorf("wallet st=%d, want %d", st, irl.DailyDeedLimit*25)
	}
}

func seedUser(t *testing.T, pool interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}, email string) string {
	t.Helper()
	var id string
	if err := pool.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id`, email,
	).Scan(&id); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return id
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
