package shop

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrItemNotFound      = errors.New("shop item not found")
	ErrInsufficientFunds = errors.New("insufficient solidarity tokens")
	ErrAlreadyOwned      = errors.New("item already owned")
)

type Wallet struct {
	UserID           string `json:"userId"`
	SolidarityTokens int64  `json:"solidarityTokens"`
	CivicBadges      int64  `json:"civicBadges"`
}

type Inventory struct {
	UserID       string   `json:"userId"`
	OwnedItemIDs []string `json:"ownedItemIds"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetWallet returns the user's wallet, defaulting to a zero balance if no row
// exists yet (a wallet row is only created on first credit or purchase).
func (r *Repository) GetWallet(ctx context.Context, userID string) (Wallet, error) {
	var w Wallet
	w.UserID = userID
	err := r.db.QueryRow(ctx,
		`SELECT solidarity_tokens, civic_badges FROM user_wallets WHERE user_id = $1`,
		userID,
	).Scan(&w.SolidarityTokens, &w.CivicBadges)
	if errors.Is(err, pgx.ErrNoRows) {
		return w, nil
	}
	if err != nil {
		return Wallet{}, fmt.Errorf("get wallet: %w", err)
	}
	return w, nil
}

// GetInventory returns the ids of every item the user owns.
func (r *Repository) GetInventory(ctx context.Context, userID string) (Inventory, error) {
	rows, err := r.db.Query(ctx, `SELECT item_id FROM user_inventory WHERE user_id = $1`, userID)
	if err != nil {
		return Inventory{}, fmt.Errorf("get inventory: %w", err)
	}
	defer rows.Close()

	inv := Inventory{UserID: userID, OwnedItemIDs: []string{}}
	for rows.Next() {
		var itemID string
		if err := rows.Scan(&itemID); err != nil {
			return Inventory{}, fmt.Errorf("scan inventory row: %w", err)
		}
		inv.OwnedItemIDs = append(inv.OwnedItemIDs, itemID)
	}
	if err := rows.Err(); err != nil {
		return Inventory{}, fmt.Errorf("iterate inventory: %w", err)
	}
	return inv, nil
}

// Credit adds solidarityTokens to the user's wallet, creating the row if
// necessary. Used to seed/grant balances (tests today; future reward paths).
func (r *Repository) Credit(ctx context.Context, userID string, solidarityTokens int64) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO user_wallets (user_id, solidarity_tokens)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE
		   SET solidarity_tokens = user_wallets.solidarity_tokens + EXCLUDED.solidarity_tokens,
		       updated_at = NOW()`,
		userID, solidarityTokens,
	)
	if err != nil {
		return fmt.Errorf("credit wallet: %w", err)
	}
	return nil
}

// Purchase atomically debits the item's ST price from the user's wallet and
// grants the item, rejecting insufficient funds or a duplicate purchase.
func (r *Repository) Purchase(ctx context.Context, userID string, item Item) (Wallet, Inventory, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Wallet{}, Inventory{}, fmt.Errorf("begin purchase: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var balance int64
	err = tx.QueryRow(ctx,
		`SELECT solidarity_tokens FROM user_wallets WHERE user_id = $1 FOR UPDATE`,
		userID,
	).Scan(&balance)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Wallet{}, Inventory{}, fmt.Errorf("lock wallet: %w", err)
	}
	if balance < item.PriceST {
		return Wallet{}, Inventory{}, ErrInsufficientFunds
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)`,
		userID, item.ID,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Wallet{}, Inventory{}, ErrAlreadyOwned
		}
		return Wallet{}, Inventory{}, fmt.Errorf("grant item: %w", err)
	}

	_, err = tx.Exec(ctx,
		`UPDATE user_wallets SET solidarity_tokens = solidarity_tokens - $1, updated_at = NOW()
		 WHERE user_id = $2`,
		item.PriceST, userID,
	)
	if err != nil {
		return Wallet{}, Inventory{}, fmt.Errorf("debit wallet: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Wallet{}, Inventory{}, fmt.Errorf("commit purchase: %w", err)
	}

	wallet, err := r.GetWallet(ctx, userID)
	if err != nil {
		return Wallet{}, Inventory{}, err
	}
	inventory, err := r.GetInventory(ctx, userID)
	if err != nil {
		return Wallet{}, Inventory{}, err
	}
	return wallet, inventory, nil
}
