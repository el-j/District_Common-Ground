package kernel

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository persists an audit row for every completed minigame session
// (anti-cheat / analytics trail) — it never mutates apps/api/internal/save's
// game_saves table directly; reward application happens client-side through
// the existing, already-tested save flow (see plan §2/§3b for rationale).
type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) RecordSession(ctx context.Context, userId, pluginId string, result GameSessionResult) error {
	rewards, err := json.Marshal(result.RewardsGranted)
	if err != nil {
		return fmt.Errorf("marshal rewards: %w", err)
	}
	_, err = r.db.Exec(ctx,
		`INSERT INTO plugin_sessions (id, user_id, plugin_id, score, completed, duration_sec, rewards, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		result.SessionID, userId, pluginId, result.Score, result.Completed, result.DurationSec, rewards,
	)
	if err != nil {
		return fmt.Errorf("record plugin session: %w", err)
	}
	return nil
}
