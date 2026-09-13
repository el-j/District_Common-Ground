package narrative

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// UpsertScenario persists a generated scenario to the dynamic_scenarios table.
func UpsertScenario(ctx context.Context, pool *pgxpool.Pool, s *DynamicScenario) error {
	data, err := json.Marshal(s)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO dynamic_scenarios (id, archetype, payload, generated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (id) DO UPDATE
		  SET payload = EXCLUDED.payload,
		      generated_at = EXCLUDED.generated_at
	`, s.ID, s.Archetype, data)
	return err
}

// GetRecentScenarios returns the N most recently generated scenarios.
func GetRecentScenarios(ctx context.Context, pool *pgxpool.Pool, limit int) ([]*DynamicScenario, error) {
	rows, err := pool.Query(ctx, `
		SELECT payload FROM dynamic_scenarios
		ORDER BY generated_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*DynamicScenario
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			slog.Warn("dynamic_scenarios scan", "err", err)
			continue
		}
		var s DynamicScenario
		if err := json.Unmarshal(raw, &s); err != nil {
			slog.Warn("dynamic_scenarios unmarshal", "err", err)
			continue
		}
		out = append(out, &s)
	}
	return out, rows.Err()
}

// PruneOldScenarios deletes scenarios older than the given duration.
func PruneOldScenarios(ctx context.Context, pool *pgxpool.Pool, olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	_, err := pool.Exec(ctx, `DELETE FROM dynamic_scenarios WHERE generated_at < $1`, cutoff)
	return err
}
