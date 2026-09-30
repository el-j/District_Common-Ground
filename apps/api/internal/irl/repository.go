// Package irl implements the M16 "IRL Real-World Action Engine": logging
// real-world mutual-aid deeds (food sharing, eldercare, park greening,
// community repair) and crediting the verified Solidarity Tokens (ST) and
// Civic Action Badges (CAB) reward to the player's existing shop wallet.
//
// Privacy note: this package never receives or stores GPS coordinates or IP
// addresses. A deed is a category + free-text note + a verification method
// ("honor_system" or "peer_verified", confirmed client-side by a local QR
// handshake) — see apps/web/src/irl/PeerVerification.ts.
package irl

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Category string

const (
	CategoryFoodSharing    Category = "food_sharing"
	CategoryEldercare      Category = "eldercare"
	CategoryParkGreening   Category = "park_greening"
	CategoryCommunityRepair Category = "community_repair"
)

func (c Category) Valid() bool {
	switch c {
	case CategoryFoodSharing, CategoryEldercare, CategoryParkGreening, CategoryCommunityRepair:
		return true
	default:
		return false
	}
}

type VerificationMethod string

const (
	VerificationHonorSystem  VerificationMethod = "honor_system"
	VerificationPeerVerified VerificationMethod = "peer_verified"
)

func (v VerificationMethod) Valid() bool {
	return v == VerificationHonorSystem || v == VerificationPeerVerified
}

// rewardFor returns the ST/CAB grant for a verification method. Peer-verified
// deeds (confirmed by a second device via the peer word-code handshake) earn more than the
// honour-system baseline, matching the 25-50 ST range from the planning doc.
func rewardFor(method VerificationMethod) (stAwarded, cabAwarded int64) {
	if method == VerificationPeerVerified {
		return 50, 2
	}
	return 25, 1
}

var ErrInvalidDeed = errors.New("invalid deed category or verification method")

// ErrDailyLimit: the user already logged DailyDeedLimit deeds today (UTC).
var ErrDailyLimit = errors.New("daily deed limit reached")

// DailyDeedLimit caps self-reported deeds per user per UTC day (2026-09-29
// launch audit §1.8 — deeds, and so Solidarity Tokens, were unlimited).
const DailyDeedLimit = 3

type Deed struct {
	ID                 string `json:"id"`
	Category           string `json:"category"`
	Note               string `json:"note"`
	VerificationMethod string `json:"verificationMethod"`
	STAwarded          int64  `json:"stAwarded"`
	CABAwarded         int64  `json:"cabAwarded"`
	CreatedAt          string `json:"createdAt"`
}

type Wallet struct {
	UserID           string `json:"userId"`
	SolidarityTokens int64  `json:"solidarityTokens"`
	CivicBadges      int64  `json:"civicBadges"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// LogDeed inserts an audit row for the deed and atomically credits the
// user's wallet (creating it if this is their first-ever credit), mirroring
// the row-locked transaction pattern in internal/shop.Repository.Purchase.
func (r *Repository) LogDeed(ctx context.Context, userID string, category Category, note string, method VerificationMethod) (Deed, Wallet, error) {
	if !category.Valid() || !method.Valid() {
		return Deed{}, Wallet{}, ErrInvalidDeed
	}
	// The server can't yet verify a peer handshake, so a client-claimed
	// "peer_verified" is recorded and paid as honor-system (audit §1.8).
	method = VerificationHonorSystem
	stAwarded, cabAwarded := rewardFor(method)

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Deed{}, Wallet{}, fmt.Errorf("begin log deed: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Serialise this user's deed logging so concurrent requests can't
	// both slip under the daily limit.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "irl-deeds:"+userID); err != nil {
		return Deed{}, Wallet{}, fmt.Errorf("lock deeds: %w", err)
	}
	var today int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM irl_deeds WHERE user_id = $1 AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
		userID,
	).Scan(&today); err != nil {
		return Deed{}, Wallet{}, fmt.Errorf("count today's deeds: %w", err)
	}
	if today >= DailyDeedLimit {
		return Deed{}, Wallet{}, ErrDailyLimit
	}

	var deed Deed
	var createdAt time.Time
	err = tx.QueryRow(ctx,
		`INSERT INTO irl_deeds (user_id, category, note, verification_method, st_awarded, cab_awarded)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, category, note, verification_method, st_awarded, cab_awarded, created_at`,
		userID, string(category), note, string(method), stAwarded, cabAwarded,
	).Scan(&deed.ID, &deed.Category, &deed.Note, &deed.VerificationMethod, &deed.STAwarded, &deed.CABAwarded, &createdAt)
	if err != nil {
		return Deed{}, Wallet{}, fmt.Errorf("insert deed: %w", err)
	}
	deed.CreatedAt = createdAt.UTC().Format(time.RFC3339)

	_, err = tx.Exec(ctx,
		`INSERT INTO user_wallets (user_id, solidarity_tokens, civic_badges)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id) DO UPDATE
		   SET solidarity_tokens = user_wallets.solidarity_tokens + EXCLUDED.solidarity_tokens,
		       civic_badges      = user_wallets.civic_badges + EXCLUDED.civic_badges,
		       updated_at        = NOW()`,
		userID, stAwarded, cabAwarded,
	)
	if err != nil {
		return Deed{}, Wallet{}, fmt.Errorf("credit wallet: %w", err)
	}

	var wallet Wallet
	wallet.UserID = userID
	err = tx.QueryRow(ctx,
		`SELECT solidarity_tokens, civic_badges FROM user_wallets WHERE user_id = $1`,
		userID,
	).Scan(&wallet.SolidarityTokens, &wallet.CivicBadges)
	if err != nil {
		return Deed{}, Wallet{}, fmt.Errorf("read wallet after credit: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Deed{}, Wallet{}, fmt.Errorf("commit log deed: %w", err)
	}
	return deed, wallet, nil
}

// ListDeeds returns the user's deed history, most recent first.
func (r *Repository) ListDeeds(ctx context.Context, userID string) ([]Deed, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, category, note, verification_method, st_awarded, cab_awarded, created_at
		 FROM irl_deeds WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list deeds: %w", err)
	}
	defer rows.Close()

	deeds := []Deed{}
	for rows.Next() {
		var d Deed
		var createdAt time.Time
		if err := rows.Scan(&d.ID, &d.Category, &d.Note, &d.VerificationMethod, &d.STAwarded, &d.CABAwarded, &createdAt); err != nil {
			return nil, fmt.Errorf("scan deed: %w", err)
		}
		d.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		deeds = append(deeds, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate deeds: %w", err)
	}
	return deeds, nil
}
