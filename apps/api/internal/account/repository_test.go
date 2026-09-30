package account_test

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/district-cg/api/internal/account"
	"github.com/district-cg/api/testutil"
)

// 2026-09-29 launch audit §4.3 / D6 (EU launch) — players need to be able
// to export and delete their data (GDPR Art. 15, 17, 20).
func TestExportAndDelete(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := account.NewRepository(pool)
	ctx := context.Background()

	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ('gdpr@example.com', 'secret-hash') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO game_saves (user_id, state) VALUES ($1, '{"meta":{"day":7}}')`, userID); err != nil {
		t.Fatalf("seed save: %v", err)
	}

	raw, err := repo.Export(ctx, userID)
	if err != nil {
		t.Fatalf("Export: %v", err)
	}
	var doc map[string]json.RawMessage
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("export is not JSON: %v", err)
	}
	for _, key := range []string{"account", "saves", "deeds", "wallet", "inventory", "friends", "caravans", "trades", "crisisLog", "economicSnapshots"} {
		if _, ok := doc[key]; !ok {
			t.Errorf("export is missing %q", key)
		}
	}
	if string(doc["account"]) == "" || contains(raw, "secret-hash") {
		t.Error("export must include the account but never the password hash")
	}
	if !contains(doc["saves"], `"day": 7`) && !contains(doc["saves"], `"day":7`) {
		t.Errorf("export is missing the save: %s", doc["saves"])
	}

	if err := repo.Delete(ctx, userID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	var n int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM game_saves WHERE user_id = $1`, userID).Scan(&n); err != nil || n != 0 {
		t.Fatalf("save not deleted: n=%d err=%v", n, err)
	}
	if err := repo.Delete(ctx, userID); !errors.Is(err, account.ErrNotFound) {
		t.Fatalf("second delete: got %v, want ErrNotFound", err)
	}
}

func contains(b []byte, s string) bool {
	return strings.Contains(string(b), s)
}
