package save

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("save not found")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Load(ctx context.Context, userId string) (json.RawMessage, error) {
	var state json.RawMessage
	err := r.db.QueryRow(ctx,
		`SELECT state FROM game_saves WHERE user_id = $1`,
		userId,
	).Scan(&state)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load save: %w", err)
	}
	return state, nil
}

func (r *Repository) Upsert(ctx context.Context, userId string, state json.RawMessage) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO game_saves (user_id, state, updated_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (user_id) DO UPDATE
		   SET state = EXCLUDED.state, updated_at = NOW()`,
		userId, state,
	)
	if err != nil {
		return fmt.Errorf("upsert save: %w", err)
	}
	return nil
}
