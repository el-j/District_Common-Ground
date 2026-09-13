package save_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/district-cg/api/internal/save"
	"github.com/district-cg/api/testutil"
	"github.com/stretchr/testify/assert"
)

func TestUpsertAndLoad(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := save.NewRepository(pool)
	ctx := context.Background()

	// seed a user
	var userId string
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('test@example.com', 'hash') RETURNING id`,
	).Scan(&userId)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	state := json.RawMessage(`{"meta":{"day":3,"tick":0,"activeSkin":"default","phase":"playing"}}`)

	if err := repo.Upsert(ctx, userId, state); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	got, err := repo.Load(ctx, userId)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	assert.JSONEq(t, string(state), string(got))
}

func TestLoad_NotFound(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := save.NewRepository(pool)
	ctx := context.Background()

	_, err := repo.Load(ctx, "00000000-0000-0000-0000-000000000000")
	if !errors.Is(err, save.ErrNotFound) {
		t.Errorf("got %v, want ErrNotFound", err)
	}
}

func TestUpsert_Idempotent(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := save.NewRepository(pool)
	ctx := context.Background()

	var userId string
	_ = pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('idem@example.com', 'hash') RETURNING id`,
	).Scan(&userId)

	state1 := json.RawMessage(`{"meta":{"day":1}}`)
	state2 := json.RawMessage(`{"meta":{"day":2}}`)

	_ = repo.Upsert(ctx, userId, state1)
	_ = repo.Upsert(ctx, userId, state2)

	got, err := repo.Load(ctx, userId)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	assert.JSONEq(t, string(state2), string(got))
}
