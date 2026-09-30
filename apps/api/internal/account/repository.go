// Package account implements the player's data rights (2026-09-29 launch
// audit §4.3, EU launch): exporting everything stored about them, and
// deleting their account. Every user-linked table references users(id)
// with ON DELETE CASCADE, so deleting the user row removes all of it.
package account

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("account not found")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// exportQuery builds one JSON document from every table holding the
// user's data. The password hash is never included.
const exportQuery = `
SELECT json_build_object(
  'exportedAt', NOW(),
  'account', (SELECT json_build_object('id', id, 'email', email, 'handle', handle, 'inviteCode', invite_code, 'createdAt', created_at)
              FROM users WHERE id = $1),
  'saves', COALESCE((SELECT json_agg(s) FROM game_saves s WHERE s.user_id = $1), '[]'),
  'deeds', COALESCE((SELECT json_agg(d) FROM irl_deeds d WHERE d.user_id = $1), '[]'),
  'wallet', (SELECT row_to_json(w) FROM user_wallets w WHERE w.user_id = $1),
  'inventory', COALESCE((SELECT json_agg(i) FROM user_inventory i WHERE i.user_id = $1), '[]'),
  'friends', COALESCE((SELECT json_agg(json_build_object('handle', u.handle, 'since', f.created_at))
                       FROM user_friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1), '[]'),
  'caravans', COALESCE((SELECT json_agg(c) FROM mutual_aid_caravans c WHERE c.sender_id = $1 OR c.recipient_id = $1), '[]'),
  'trades', COALESCE((SELECT json_agg(t) FROM trade_offers t WHERE t.proposer_id = $1 OR t.recipient_id = $1), '[]'),
  'crisisLog', COALESCE((SELECT json_agg(l) FROM crisis_log l WHERE l.user_id = $1), '[]'),
  'economicSnapshots', COALESCE((SELECT json_agg(e) FROM economic_snapshot_log e WHERE e.user_id = $1), '[]'),
  'pluginSessions', COALESCE((SELECT json_agg(p) FROM plugin_sessions p WHERE p.user_id = $1), '[]'),
  'syncDeltas', COALESCE((SELECT json_agg(sd) FROM sync_deltas sd WHERE sd.user_id = $1), '[]')
)`

// Export returns a JSON document with all data stored about the user.
func (r *Repository) Export(ctx context.Context, userID string) ([]byte, error) {
	var doc []byte
	if err := r.db.QueryRow(ctx, exportQuery, userID).Scan(&doc); err != nil {
		return nil, fmt.Errorf("export account: %w", err)
	}
	return doc, nil
}

// Delete removes the user and, through ON DELETE CASCADE, all their data.
func (r *Repository) Delete(ctx context.Context, userID string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete account: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
