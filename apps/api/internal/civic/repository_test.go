package civic_test

import (
	"context"
	"testing"

	"github.com/district-cg/api/internal/civic"
	"github.com/district-cg/api/testutil"
)

func TestListUpcomingActions_FiltersByRegionAndOnlyFuture(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := civic.NewRepository(pool)
	ctx := context.Background()

	// The migration seeds 4 upcoming actions for GENERIC. A different or
	// unknown region code must return none of them.
	actions, err := repo.ListUpcomingActions(ctx, "GENERIC")
	if err != nil {
		t.Fatalf("ListUpcomingActions(GENERIC): %v", err)
	}
	if len(actions) != 4 {
		t.Fatalf("got %d seeded GENERIC actions, want 4", len(actions))
	}
	for i := 1; i < len(actions); i++ {
		if actions[i].StartTime < actions[i-1].StartTime {
			t.Errorf("actions not sorted soonest-first: %+v", actions)
		}
	}

	none, err := repo.ListUpcomingActions(ctx, "DOES-NOT-EXIST")
	if err != nil {
		t.Fatalf("ListUpcomingActions(unknown region): %v", err)
	}
	if len(none) != 0 {
		t.Errorf("got %d actions for an unknown region, want 0", len(none))
	}

	// A past-dated action for the same region must never be returned.
	if _, err := pool.Exec(ctx,
		`INSERT INTO civic_actions (title, organizer, start_time, location_summary, source_url, region_code)
		 VALUES ('Past Rally', 'Test Org', NOW() - INTERVAL '1 day', 'Nowhere', 'https://example.org/past', 'GENERIC')`,
	); err != nil {
		t.Fatalf("seed past action: %v", err)
	}
	afterInsert, err := repo.ListUpcomingActions(ctx, "GENERIC")
	if err != nil {
		t.Fatalf("ListUpcomingActions after past insert: %v", err)
	}
	if len(afterInsert) != 4 {
		t.Errorf("got %d actions, want still 4 (past action must be excluded)", len(afterInsert))
	}
}

func TestListChapters_FiltersByRegionAndOrdersByDistance(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := civic.NewRepository(pool)
	ctx := context.Background()

	chapters, err := repo.ListChapters(ctx, "GENERIC")
	if err != nil {
		t.Fatalf("ListChapters(GENERIC): %v", err)
	}
	if len(chapters) != 6 {
		t.Fatalf("got %d seeded GENERIC chapters, want 6", len(chapters))
	}
	for i := 1; i < len(chapters); i++ {
		if chapters[i].DistanceKm < chapters[i-1].DistanceKm {
			t.Errorf("chapters not sorted nearest-first: %+v", chapters)
		}
	}

	none, err := repo.ListChapters(ctx, "DOES-NOT-EXIST")
	if err != nil {
		t.Fatalf("ListChapters(unknown region): %v", err)
	}
	if len(none) != 0 {
		t.Errorf("got %d chapters for an unknown region, want 0", len(none))
	}
}
