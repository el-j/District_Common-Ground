// Package sync implements M18's Tier 2 (grid/internet) reconciliation
// gateway: authenticated players' devices upload their new signed action
// deltas and, in the same round-trip, learn about any deltas already
// recorded from their *other* devices that they haven't seen yet.
//
// This package deliberately does not verify Ed25519 signatures — that
// happens client-side, once, when a device applies a delta into its CRDT
// state (apps/web/src/core/offline/SignedEventLog.ts's verifyDeltaSignature).
// The server's job here is durable, idempotent storage and relay, the same
// "dumb pipe" role a mesh peer would play for Tier 1 sync.
package sync

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Delta struct {
	ID          string           `json:"id"`
	DeviceID    string           `json:"deviceId"`
	Sequence    int64            `json:"sequence"`
	Timestamp   int64            `json:"timestamp"`
	VectorClock map[string]int64 `json:"vectorClock"`
	ActionType  string           `json:"actionType"`
	Payload     map[string]any   `json:"payload"`
	PrevHash    *string          `json:"prevHash"`
	Hash        string           `json:"hash"`
	Signature   string           `json:"signature"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Store persists any new deltas the caller uploaded. Re-uploading a delta
// already on file (e.g. a retried sync round) is a safe, idempotent no-op —
// the (user_id, device_id, sequence) primary key absorbs the duplicate.
// A nil pool (matching internal/save.SolidarityHandler's fail-safe
// convention) makes this a no-op rather than an error.
func (r *Repository) Store(ctx context.Context, userID string, deltas []Delta) error {
	if r.db == nil {
		return nil
	}
	for _, d := range deltas {
		vcJSON, err := json.Marshal(d.VectorClock)
		if err != nil {
			return fmt.Errorf("marshal vector clock: %w", err)
		}
		payloadJSON, err := json.Marshal(d.Payload)
		if err != nil {
			return fmt.Errorf("marshal payload: %w", err)
		}
		_, err = r.db.Exec(ctx, `
			INSERT INTO sync_deltas (id, user_id, device_id, sequence, action_type, vector_clock, payload, prev_hash, hash, signature, occurred_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11::double precision / 1000))
			ON CONFLICT (user_id, device_id, sequence) DO NOTHING`,
			d.ID, userID, d.DeviceID, d.Sequence, d.ActionType, vcJSON, payloadJSON, d.PrevHash, d.Hash, d.Signature, d.Timestamp,
		)
		if err != nil {
			return fmt.Errorf("store delta %s: %w", d.ID, err)
		}
	}
	return nil
}

// MissingSince returns every delta belonging to this user's *other* devices
// whose sequence exceeds what the caller's vector clock already claims to
// know, plus the server's current per-device max-sequence clock (the
// "ack" the caller should fold into its own knowledge of the account).
func (r *Repository) MissingSince(ctx context.Context, userID, callerDeviceID string, callerClock map[string]int64) ([]Delta, map[string]int64, error) {
	serverClock := map[string]int64{}
	if r.db == nil {
		return []Delta{}, serverClock, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, device_id, sequence, action_type, vector_clock, payload, prev_hash, hash, signature,
		       EXTRACT(EPOCH FROM occurred_at) * 1000
		FROM sync_deltas WHERE user_id = $1 ORDER BY device_id, sequence`,
		userID,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("query deltas: %w", err)
	}
	defer rows.Close()

	missing := []Delta{}
	for rows.Next() {
		var d Delta
		var vcJSON, payloadJSON []byte
		var occurredAtMs float64
		if err := rows.Scan(&d.ID, &d.DeviceID, &d.Sequence, &d.ActionType, &vcJSON, &payloadJSON, &d.PrevHash, &d.Hash, &d.Signature, &occurredAtMs); err != nil {
			return nil, nil, fmt.Errorf("scan delta: %w", err)
		}
		if err := json.Unmarshal(vcJSON, &d.VectorClock); err != nil {
			return nil, nil, fmt.Errorf("unmarshal vector clock: %w", err)
		}
		if err := json.Unmarshal(payloadJSON, &d.Payload); err != nil {
			return nil, nil, fmt.Errorf("unmarshal payload: %w", err)
		}
		d.Timestamp = int64(occurredAtMs)

		if d.Sequence > serverClock[d.DeviceID] {
			serverClock[d.DeviceID] = d.Sequence
		}
		if d.DeviceID == callerDeviceID {
			continue
		}
		if d.Sequence > callerClock[d.DeviceID] {
			missing = append(missing, d)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate deltas: %w", err)
	}
	return missing, serverClock, nil
}
