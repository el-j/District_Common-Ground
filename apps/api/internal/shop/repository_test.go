package shop_test

import (
	"context"
	"errors"
	"testing"

	"github.com/district-cg/api/internal/shop"
	"github.com/district-cg/api/testutil"
)

func TestPurchase_DebitsWalletAndGrantsItem(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := shop.NewRepository(pool)
	ctx := context.Background()

	var userID string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('shopper@example.com', 'hash') RETURNING id`,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	if err := repo.Credit(ctx, userID, 100); err != nil {
		t.Fatalf("credit: %v", err)
	}

	item, ok := shop.Find("brass_doorbell_chime") // priceST: 15
	if !ok {
		t.Fatalf("catalog item missing")
	}

	wallet, inventory, err := repo.Purchase(ctx, userID, item)
	if err != nil {
		t.Fatalf("Purchase: %v", err)
	}
	if wallet.SolidarityTokens != 85 {
		t.Errorf("got balance %d, want 85", wallet.SolidarityTokens)
	}
	if len(inventory.OwnedItemIDs) != 1 || inventory.OwnedItemIDs[0] != item.ID {
		t.Errorf("got inventory %v, want [%s]", inventory.OwnedItemIDs, item.ID)
	}

	// Repeat purchase of the same item should be rejected.
	_, _, err = repo.Purchase(ctx, userID, item)
	if !errors.Is(err, shop.ErrAlreadyOwned) {
		t.Errorf("got %v, want ErrAlreadyOwned", err)
	}
}

func TestPurchase_RejectsInsufficientFunds(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := shop.NewRepository(pool)
	ctx := context.Background()

	var userID string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('broke@example.com', 'hash') RETURNING id`,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	if err := repo.Credit(ctx, userID, 10); err != nil {
		t.Fatalf("credit: %v", err)
	}

	item, ok := shop.Find("solar_facade_mural") // priceST: 50
	if !ok {
		t.Fatalf("catalog item missing")
	}

	_, _, err = repo.Purchase(ctx, userID, item)
	if !errors.Is(err, shop.ErrInsufficientFunds) {
		t.Errorf("got %v, want ErrInsufficientFunds", err)
	}

	wallet, err := repo.GetWallet(ctx, userID)
	if err != nil {
		t.Fatalf("GetWallet: %v", err)
	}
	if wallet.SolidarityTokens != 10 {
		t.Errorf("balance changed on rejected purchase: got %d, want 10", wallet.SolidarityTokens)
	}
}

func TestFind_UnknownItem(t *testing.T) {
	_, ok := shop.Find("does-not-exist")
	if ok {
		t.Fatalf("expected unknown item to be absent from catalog")
	}
}
