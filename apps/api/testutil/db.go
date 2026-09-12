package testutil

import (
	"context"
	"testing"

	"github.com/district-cg/api/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

// NewPostgres spins up a real PostgreSQL container for integration tests.
// Runs migrations, returns a pool. Container is terminated on t.Cleanup.
func NewPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	ctr, err := postgres.Run(ctx,
		"postgres:17-alpine",
		postgres.WithDatabase("district_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		t.Fatalf("start postgres container: %v", err)
	}
	t.Cleanup(func() { _ = ctr.Terminate(ctx) })

	dsn, err := ctr.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("connection string: %v", err)
	}

	if err := db.RunMigrations(dsn); err != nil {
		t.Fatalf("migrations: %v", err)
	}

	pool, err := db.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open pool: %v", err)
	}
	t.Cleanup(pool.Close)

	return pool
}
