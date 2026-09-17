package social_test

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/district-cg/api/internal/social"
	"github.com/district-cg/api/testutil"
)

func seedUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, email string) (id, handle string) {
	t.Helper()
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id, handle`,
		email,
	).Scan(&id, &handle)
	if err != nil {
		t.Fatalf("seed user %s: %v", email, err)
	}
	return id, handle
}

func TestAddFriend_ByHandleIsSymmetric(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	aliceID, _ := seedUser(t, ctx, pool, "alice@example.com")
	_, bobHandle := seedUser(t, ctx, pool, "bob@example.com")

	friend, err := repo.AddFriend(ctx, aliceID, bobHandle)
	if err != nil {
		t.Fatalf("AddFriend: %v", err)
	}
	if friend.Handle != bobHandle {
		t.Errorf("got handle %q, want %q", friend.Handle, bobHandle)
	}

	// Symmetric: bob should now see alice as a friend too, without a
	// separate add call.
	bobID, _, err := repoResolve(ctx, pool, bobHandle)
	if err != nil {
		t.Fatalf("resolve bob: %v", err)
	}
	bobsFriends, err := repo.ListFriends(ctx, bobID)
	if err != nil {
		t.Fatalf("ListFriends(bob): %v", err)
	}
	if len(bobsFriends) != 1 || bobsFriends[0].UserID != aliceID {
		t.Errorf("got bob's friends %+v, want [alice]", bobsFriends)
	}

	// Duplicate add is rejected.
	_, err = repo.AddFriend(ctx, aliceID, bobHandle)
	if !errors.Is(err, social.ErrAlreadyFriends) {
		t.Errorf("got %v, want ErrAlreadyFriends", err)
	}
}

func TestAddFriend_ByInviteCodeAndRejectsSelf(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	aliceID, _ := seedUser(t, ctx, pool, "carol@example.com")
	var carolInvite string
	if err := pool.QueryRow(ctx, `SELECT invite_code FROM users WHERE id = $1`, aliceID).Scan(&carolInvite); err != nil {
		t.Fatalf("read invite code: %v", err)
	}

	_, err := repo.AddFriend(ctx, aliceID, carolInvite)
	if !errors.Is(err, social.ErrSelfFriend) {
		t.Errorf("got %v, want ErrSelfFriend", err)
	}

	_, err = repo.AddFriend(ctx, aliceID, "does-not-exist")
	if !errors.Is(err, social.ErrUserNotFound) {
		t.Errorf("got %v, want ErrUserNotFound", err)
	}
}

func TestCaravan_DispatchRequiresFriendshipAndClaimIsIdempotent(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	senderID, _ := seedUser(t, ctx, pool, "dana@example.com")
	recipientID, recipientHandle := seedUser(t, ctx, pool, "eli@example.com")
	strangerID, _ := seedUser(t, ctx, pool, "frank@example.com")

	// Dispatch before friendship is rejected.
	_, err := repo.DispatchCaravan(ctx, senderID, recipientHandle, "energy", 20, "hang in there")
	if !errors.Is(err, social.ErrNotFriends) {
		t.Errorf("got %v, want ErrNotFriends", err)
	}

	if _, err := repo.AddFriend(ctx, senderID, recipientHandle); err != nil {
		t.Fatalf("AddFriend: %v", err)
	}

	caravan, err := repo.DispatchCaravan(ctx, senderID, recipientHandle, "energy", 20, "hang in there")
	if err != nil {
		t.Fatalf("DispatchCaravan: %v", err)
	}
	if caravan.Claimed {
		t.Errorf("newly dispatched caravan should be unclaimed")
	}

	inbox, err := repo.ListInbox(ctx, recipientID)
	if err != nil {
		t.Fatalf("ListInbox: %v", err)
	}
	if len(inbox) != 1 || inbox[0].ID != caravan.ID {
		t.Errorf("got inbox %+v, want [%s]", inbox, caravan.ID)
	}

	// A stranger cannot claim someone else's caravan.
	_, _, err = repo.ClaimCaravan(ctx, strangerID, caravan.ID)
	if !errors.Is(err, social.ErrNotRecipient) {
		t.Errorf("got %v, want ErrNotRecipient", err)
	}

	resourceType, amount, err := repo.ClaimCaravan(ctx, recipientID, caravan.ID)
	if err != nil {
		t.Fatalf("ClaimCaravan: %v", err)
	}
	if resourceType != "energy" || amount != 20 {
		t.Errorf("got (%s, %d), want (energy, 20)", resourceType, amount)
	}

	// Claiming twice must not double-credit.
	_, _, err = repo.ClaimCaravan(ctx, recipientID, caravan.ID)
	if !errors.Is(err, social.ErrAlreadyClaimed) {
		t.Errorf("got %v, want ErrAlreadyClaimed", err)
	}

	inboxAfterClaim, err := repo.ListInbox(ctx, recipientID)
	if err != nil {
		t.Fatalf("ListInbox after claim: %v", err)
	}
	if len(inboxAfterClaim) != 0 {
		t.Errorf("claimed caravan should no longer appear in inbox, got %+v", inboxAfterClaim)
	}
}

func TestDistrictSnapshot_RequiresFriendship(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	viewerID, _ := seedUser(t, ctx, pool, "gina@example.com")
	targetID, _ := seedUser(t, ctx, pool, "hank@example.com")

	_, err := repo.DistrictSnapshot(ctx, viewerID, targetID)
	if !errors.Is(err, social.ErrNotFriends) {
		t.Errorf("got %v, want ErrNotFriends", err)
	}

	var targetHandle string
	if err := pool.QueryRow(ctx, `SELECT handle FROM users WHERE id = $1`, targetID).Scan(&targetHandle); err != nil {
		t.Fatalf("read handle: %v", err)
	}
	if _, err := repo.AddFriend(ctx, viewerID, targetHandle); err != nil {
		t.Fatalf("AddFriend: %v", err)
	}

	snapshot, err := repo.DistrictSnapshot(ctx, viewerID, targetID)
	if err != nil {
		t.Fatalf("DistrictSnapshot: %v", err)
	}
	if snapshot.Handle != targetHandle {
		t.Errorf("got handle %q, want %q", snapshot.Handle, targetHandle)
	}
	if snapshot.Day != 1 {
		t.Errorf("got day %d, want 1 (default for a user with no save yet)", snapshot.Day)
	}
}

func TestTrade_ProposeAcceptGrantsBothSides(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	proposerID, _ := seedUser(t, ctx, pool, "ivy@example.com")
	recipientID, recipientHandle := seedUser(t, ctx, pool, "jack@example.com")
	if _, err := repo.AddFriend(ctx, proposerID, recipientHandle); err != nil {
		t.Fatalf("AddFriend: %v", err)
	}

	offer, err := repo.ProposeTrade(ctx, proposerID, recipientHandle, "cash", 20, "energy", 15, "for the co-op")
	if err != nil {
		t.Fatalf("ProposeTrade: %v", err)
	}
	if offer.Status != "pending" {
		t.Errorf("got status %q, want pending", offer.Status)
	}

	inbox, err := repo.ListTradeInbox(ctx, recipientID)
	if err != nil {
		t.Fatalf("ListTradeInbox: %v", err)
	}
	if len(inbox) != 1 || inbox[0].ID != offer.ID {
		t.Errorf("got inbox %+v, want [%s]", inbox, offer.ID)
	}

	accepted, err := repo.RespondTrade(ctx, recipientID, offer.ID, true)
	if err != nil {
		t.Fatalf("RespondTrade(accept): %v", err)
	}
	if accepted.Status != "accepted" {
		t.Errorf("got status %q, want accepted", accepted.Status)
	}

	// Recipient's pending inbox no longer shows it.
	inboxAfter, err := repo.ListTradeInbox(ctx, recipientID)
	if err != nil {
		t.Fatalf("ListTradeInbox after respond: %v", err)
	}
	if len(inboxAfter) != 0 {
		t.Errorf("accepted offer should leave the inbox, got %+v", inboxAfter)
	}

	// A second response to the same offer is rejected.
	if _, err := repo.RespondTrade(ctx, recipientID, offer.ID, false); !errors.Is(err, social.ErrTradeNotPending) {
		t.Errorf("got %v, want ErrTradeNotPending", err)
	}

	// Proposer collects the outcome from their outbox.
	outbox, err := repo.ListTradeOutbox(ctx, proposerID)
	if err != nil {
		t.Fatalf("ListTradeOutbox: %v", err)
	}
	if len(outbox) != 1 || outbox[0].ID != offer.ID {
		t.Errorf("got outbox %+v, want [%s]", outbox, offer.ID)
	}

	settled, err := repo.SettleTrade(ctx, proposerID, offer.ID)
	if err != nil {
		t.Fatalf("SettleTrade: %v", err)
	}
	if settled.Status != "accepted" || settled.ResourceType != "energy" || settled.Amount != 15 {
		t.Errorf("got %+v, want {accepted energy 15}", settled)
	}

	// Settling twice does not double-credit.
	if _, err := repo.SettleTrade(ctx, proposerID, offer.ID); !errors.Is(err, social.ErrTradeAlreadySettled) {
		t.Errorf("got %v, want ErrTradeAlreadySettled", err)
	}

	outboxAfterSettle, err := repo.ListTradeOutbox(ctx, proposerID)
	if err != nil {
		t.Fatalf("ListTradeOutbox after settle: %v", err)
	}
	if len(outboxAfterSettle) != 0 {
		t.Errorf("settled offer should leave the outbox, got %+v", outboxAfterSettle)
	}
}

func TestTrade_DeclineRefundsProposerOnly(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	proposerID, _ := seedUser(t, ctx, pool, "kim@example.com")
	_, recipientHandle := seedUser(t, ctx, pool, "leo2@example.com")
	if _, err := repo.AddFriend(ctx, proposerID, recipientHandle); err != nil {
		t.Fatalf("AddFriend: %v", err)
	}

	offer, err := repo.ProposeTrade(ctx, proposerID, recipientHandle, "food", 10, "cash", 5, "")
	if err != nil {
		t.Fatalf("ProposeTrade: %v", err)
	}

	recipientID, _, err := repoResolve(ctx, pool, recipientHandle)
	if err != nil {
		t.Fatalf("resolve recipient: %v", err)
	}
	declined, err := repo.RespondTrade(ctx, recipientID, offer.ID, false)
	if err != nil {
		t.Fatalf("RespondTrade(decline): %v", err)
	}
	if declined.Status != "declined" {
		t.Errorf("got status %q, want declined", declined.Status)
	}

	settled, err := repo.SettleTrade(ctx, proposerID, offer.ID)
	if err != nil {
		t.Fatalf("SettleTrade: %v", err)
	}
	if settled.Status != "declined" || settled.ResourceType != "food" || settled.Amount != 10 {
		t.Errorf("got %+v, want {declined food 10} (proposer's own offer refunded)", settled)
	}
}

func TestTrade_CancelRefundsSynchronouslyAndBlocksLateResponse(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	proposerID, _ := seedUser(t, ctx, pool, "mona@example.com")
	recipientID, recipientHandle := seedUser(t, ctx, pool, "nate@example.com")
	strangerID, _ := seedUser(t, ctx, pool, "olive@example.com")
	if _, err := repo.AddFriend(ctx, proposerID, recipientHandle); err != nil {
		t.Fatalf("AddFriend: %v", err)
	}

	offer, err := repo.ProposeTrade(ctx, proposerID, recipientHandle, "energy", 8, "cash", 12, "")
	if err != nil {
		t.Fatalf("ProposeTrade: %v", err)
	}

	// A stranger cannot cancel someone else's offer.
	if _, err := repo.CancelTrade(ctx, strangerID, offer.ID); !errors.Is(err, social.ErrNotTradeProposer) {
		t.Errorf("got %v, want ErrNotTradeProposer", err)
	}

	result, err := repo.CancelTrade(ctx, proposerID, offer.ID)
	if err != nil {
		t.Fatalf("CancelTrade: %v", err)
	}
	if result.Status != "cancelled" || result.ResourceType != "energy" || result.Amount != 8 {
		t.Errorf("got %+v, want {cancelled energy 8}", result)
	}

	// The recipient can no longer respond to a cancelled offer.
	if _, err := repo.RespondTrade(ctx, recipientID, offer.ID, true); !errors.Is(err, social.ErrTradeNotPending) {
		t.Errorf("got %v, want ErrTradeNotPending", err)
	}

	// Cancel already settles synchronously, so a later settle attempt fails.
	if _, err := repo.SettleTrade(ctx, proposerID, offer.ID); !errors.Is(err, social.ErrTradeAlreadySettled) {
		t.Errorf("got %v, want ErrTradeAlreadySettled", err)
	}
}

func TestTrade_ProposeRequiresFriendshipAndRejectsSelf(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test — requires Docker")
	}
	pool := testutil.NewPostgres(t)
	repo := social.NewRepository(pool)
	ctx := context.Background()

	proposerID, proposerHandle := seedUser(t, ctx, pool, "pat@example.com")
	_, strangerHandle := seedUser(t, ctx, pool, "quinn@example.com")

	if _, err := repo.ProposeTrade(ctx, proposerID, strangerHandle, "cash", 5, "energy", 5, ""); !errors.Is(err, social.ErrNotFriends) {
		t.Errorf("got %v, want ErrNotFriends", err)
	}
	if _, err := repo.ProposeTrade(ctx, proposerID, proposerHandle, "cash", 5, "energy", 5, ""); !errors.Is(err, social.ErrSelfFriend) {
		t.Errorf("got %v, want ErrSelfFriend", err)
	}
}

// repoResolve is a small test-only helper mirroring Repository.resolveUser,
// which is unexported and only needed here to look up a seeded user's id
// from their handle for assertions.
func repoResolve(ctx context.Context, pool *pgxpool.Pool, handle string) (id, resolvedHandle string, err error) {
	err = pool.QueryRow(ctx, `SELECT id, handle FROM users WHERE handle = $1`, handle).Scan(&id, &resolvedHandle)
	return id, resolvedHandle, err
}
