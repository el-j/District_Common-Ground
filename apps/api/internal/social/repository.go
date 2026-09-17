package social

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrSelfFriend      = errors.New("cannot friend yourself")
	ErrAlreadyFriends  = errors.New("already friends")
	ErrNotFriends      = errors.New("not friends with that user")
	ErrCaravanNotFound = errors.New("caravan not found")
	ErrNotRecipient    = errors.New("not the recipient of that caravan")
	ErrAlreadyClaimed  = errors.New("caravan already claimed")

	ErrTradeNotFound       = errors.New("trade offer not found")
	ErrNotTradeRecipient   = errors.New("not the recipient of that trade offer")
	ErrNotTradeProposer    = errors.New("not the proposer of that trade offer")
	ErrTradeNotPending     = errors.New("trade offer is no longer pending")
	ErrTradeAlreadySettled = errors.New("trade offer already settled")
)

// FriendProfile mirrors packages/shared-types/src/social.ts's FriendProfile,
// enriched with live status read from the friend's game_saves row (if any).
type FriendProfile struct {
	UserID          string  `json:"userId"`
	Handle          string  `json:"handle"`
	DistrictName    string  `json:"districtName"`
	Day             int64   `json:"day"`
	ResilienceScore float64 `json:"resilienceScore"`
	ActiveCrisis    *string `json:"activeCrisis"`
}

// DistrictSnapshot is a sanitized, read-only view of a friend's district —
// deliberately narrower than the raw game_saves state (no cash/position/etc).
type DistrictSnapshot struct {
	Handle          string  `json:"handle"`
	Day             int64   `json:"day"`
	ResilienceScore float64 `json:"resilienceScore"`
	ActiveCrisis    *string `json:"activeCrisis"`
	Commons         struct {
		SolarGridProgress   float64 `json:"solarGridProgress"`
		KitchenProgress     float64 `json:"kitchenProgress"`
		LegalFundProgress   float64 `json:"legalFundProgress"`
		ToolLibraryProgress float64 `json:"toolLibraryProgress"`
		LandTrustProgress   float64 `json:"landTrustProgress"`
	} `json:"commons"`
}

type Caravan struct {
	ID           string `json:"id"`
	SenderHandle string `json:"senderHandle"`
	ResourceType string `json:"resourceType"`
	Amount       int64  `json:"amount"`
	Note         string `json:"note"`
	Claimed      bool   `json:"claimed"`
}

// TradeOffer mirrors packages/shared-types/src/social.ts's TradeOffer.
type TradeOffer struct {
	ID                  string `json:"id"`
	ProposerHandle      string `json:"proposerHandle"`
	RecipientHandle     string `json:"recipientHandle"`
	OfferResourceType   string `json:"offerResourceType"`
	OfferAmount         int64  `json:"offerAmount"`
	RequestResourceType string `json:"requestResourceType"`
	RequestAmount       int64  `json:"requestAmount"`
	Note                string `json:"note"`
	Status              string `json:"status"`
}

// TradeSettleResult carries what the proposer should apply locally after
// collecting a resolved trade: on 'accepted' it's the request side (what
// they asked for and now receive); on 'declined' it's their own offer side
// refunded back to them.
type TradeSettleResult struct {
	Status       string `json:"status"`
	ResourceType string `json:"resourceType"`
	Amount       int64  `json:"amount"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// MyProfile carries the signed-in user's own handle and invite code — needed
// by the frontend's invite-code copy button, since AddFriend only ever
// returns the *other* user's profile, never the caller's own.
type MyProfile struct {
	Handle     string `json:"handle"`
	InviteCode string `json:"inviteCode"`
}

// Me returns the signed-in user's own handle and invite code.
func (r *Repository) Me(ctx context.Context, userID string) (MyProfile, error) {
	var p MyProfile
	err := r.db.QueryRow(ctx, `SELECT handle, invite_code FROM users WHERE id = $1`, userID).Scan(&p.Handle, &p.InviteCode)
	if errors.Is(err, pgx.ErrNoRows) {
		return MyProfile{}, ErrUserNotFound
	}
	if err != nil {
		return MyProfile{}, fmt.Errorf("get my profile: %w", err)
	}
	return p, nil
}

// resolveUser looks up a user id by handle or invite code.
func (r *Repository) resolveUser(ctx context.Context, identifier string) (id, handle string, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT id, handle FROM users WHERE handle = $1 OR invite_code = $1`,
		identifier,
	).Scan(&id, &handle)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrUserNotFound
	}
	if err != nil {
		return "", "", fmt.Errorf("resolve user: %w", err)
	}
	return id, handle, nil
}

// AddFriend creates a symmetric friendship between userID and the user
// identified by handle or invite code.
func (r *Repository) AddFriend(ctx context.Context, userID, identifier string) (FriendProfile, error) {
	friendID, _, err := r.resolveUser(ctx, identifier)
	if err != nil {
		return FriendProfile{}, err
	}
	if friendID == userID {
		return FriendProfile{}, ErrSelfFriend
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return FriendProfile{}, fmt.Errorf("begin add friend: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `INSERT INTO user_friends (user_id, friend_id) VALUES ($1, $2)`, userID, friendID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return FriendProfile{}, ErrAlreadyFriends
		}
		return FriendProfile{}, fmt.Errorf("insert friendship: %w", err)
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO user_friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		friendID, userID,
	)
	if err != nil {
		return FriendProfile{}, fmt.Errorf("insert reverse friendship: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return FriendProfile{}, fmt.Errorf("commit add friend: %w", err)
	}

	profiles, err := r.listFriendProfiles(ctx, friendID)
	if err != nil {
		return FriendProfile{}, err
	}
	if len(profiles) == 0 {
		return FriendProfile{}, fmt.Errorf("add friend: profile not found after insert")
	}
	return profiles[0], nil
}

// ListFriends returns every friend of userID with their live district status.
func (r *Repository) ListFriends(ctx context.Context, userID string) ([]FriendProfile, error) {
	rows, err := r.db.Query(ctx,
		`SELECT u.id, u.handle,
		        COALESCE((gs.state->'meta'->>'day')::bigint, 1) AS day,
		        COALESCE((gs.state->'commons'->>'resilienceScore')::float8, 0) AS resilience,
		        gs.state->'crisisState'->>'activeCrisisId' AS active_crisis
		 FROM user_friends uf
		 JOIN users u ON u.id = uf.friend_id
		 LEFT JOIN game_saves gs ON gs.user_id = u.id
		 WHERE uf.user_id = $1
		 ORDER BY u.handle`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list friends: %w", err)
	}
	defer rows.Close()

	friends := []FriendProfile{}
	for rows.Next() {
		var p FriendProfile
		if err := rows.Scan(&p.UserID, &p.Handle, &p.Day, &p.ResilienceScore, &p.ActiveCrisis); err != nil {
			return nil, fmt.Errorf("scan friend row: %w", err)
		}
		p.DistrictName = p.Handle + "'s Block"
		friends = append(friends, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate friends: %w", err)
	}
	return friends, nil
}

// listFriendProfiles fetches the same shape as ListFriends but scoped to a
// specific set of friend ids — used right after AddFriend to return the
// newly-added friend's profile without duplicating the query shape above.
func (r *Repository) listFriendProfiles(ctx context.Context, friendIDs ...string) ([]FriendProfile, error) {
	rows, err := r.db.Query(ctx,
		`SELECT u.id, u.handle,
		        COALESCE((gs.state->'meta'->>'day')::bigint, 1) AS day,
		        COALESCE((gs.state->'commons'->>'resilienceScore')::float8, 0) AS resilience,
		        gs.state->'crisisState'->>'activeCrisisId' AS active_crisis
		 FROM users u
		 LEFT JOIN game_saves gs ON gs.user_id = u.id
		 WHERE u.id = ANY($1)`,
		friendIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("list friend profiles: %w", err)
	}
	defer rows.Close()

	profiles := []FriendProfile{}
	for rows.Next() {
		var p FriendProfile
		if err := rows.Scan(&p.UserID, &p.Handle, &p.Day, &p.ResilienceScore, &p.ActiveCrisis); err != nil {
			return nil, fmt.Errorf("scan friend profile row: %w", err)
		}
		p.DistrictName = p.Handle + "'s Block"
		profiles = append(profiles, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate friend profiles: %w", err)
	}
	return profiles, nil
}

// areFriends checks whether requesterID is allowed to view targetID's district.
func (r *Repository) areFriends(ctx context.Context, requesterID, targetID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM user_friends WHERE user_id = $1 AND friend_id = $2)`,
		requesterID, targetID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check friendship: %w", err)
	}
	return exists, nil
}

// DistrictSnapshot returns a sanitized view of targetUserID's district, only
// if requesterID is friends with them.
func (r *Repository) DistrictSnapshot(ctx context.Context, requesterID, targetUserID string) (DistrictSnapshot, error) {
	ok, err := r.areFriends(ctx, requesterID, targetUserID)
	if err != nil {
		return DistrictSnapshot{}, err
	}
	if !ok {
		return DistrictSnapshot{}, ErrNotFriends
	}

	var snap DistrictSnapshot
	err = r.db.QueryRow(ctx,
		`SELECT u.handle,
		        COALESCE((gs.state->'meta'->>'day')::bigint, 1),
		        COALESCE((gs.state->'commons'->>'resilienceScore')::float8, 0),
		        gs.state->'crisisState'->>'activeCrisisId',
		        COALESCE((gs.state->'commons'->>'solarGridProgress')::float8, 0),
		        COALESCE((gs.state->'commons'->>'kitchenProgress')::float8, 0),
		        COALESCE((gs.state->'commons'->>'legalFundProgress')::float8, 0),
		        COALESCE((gs.state->'commons'->>'toolLibraryProgress')::float8, 0),
		        COALESCE((gs.state->'commons'->>'landTrustProgress')::float8, 0)
		 FROM users u
		 LEFT JOIN game_saves gs ON gs.user_id = u.id
		 WHERE u.id = $1`,
		targetUserID,
	).Scan(
		&snap.Handle, &snap.Day, &snap.ResilienceScore, &snap.ActiveCrisis,
		&snap.Commons.SolarGridProgress, &snap.Commons.KitchenProgress,
		&snap.Commons.LegalFundProgress, &snap.Commons.ToolLibraryProgress, &snap.Commons.LandTrustProgress,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return DistrictSnapshot{}, ErrUserNotFound
	}
	if err != nil {
		return DistrictSnapshot{}, fmt.Errorf("district snapshot: %w", err)
	}
	return snap, nil
}

// DispatchCaravan records a mutual aid caravan from senderID to the friend
// identified by handle or invite code. The sender's own resources are
// decremented client-side (they live in game_saves' opaque JSONB, which is
// the client's domain — see internal/kernel's reward-settlement pattern);
// this call is the server-side record of the transfer and its recipient gate.
func (r *Repository) DispatchCaravan(ctx context.Context, senderID, identifier, resourceType string, amount int64, note string) (Caravan, error) {
	recipientID, _, err := r.resolveUser(ctx, identifier)
	if err != nil {
		return Caravan{}, err
	}
	if recipientID == senderID {
		return Caravan{}, ErrSelfFriend
	}

	ok, err := r.areFriends(ctx, senderID, recipientID)
	if err != nil {
		return Caravan{}, err
	}
	if !ok {
		return Caravan{}, ErrNotFriends
	}

	var c Caravan
	err = r.db.QueryRow(ctx,
		`INSERT INTO mutual_aid_caravans (sender_id, recipient_id, resource_type, amount, note)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, resource_type, amount, note, claimed`,
		senderID, recipientID, resourceType, amount, note,
	).Scan(&c.ID, &c.ResourceType, &c.Amount, &c.Note, &c.Claimed)
	if err != nil {
		return Caravan{}, fmt.Errorf("dispatch caravan: %w", err)
	}

	var senderHandle string
	if err := r.db.QueryRow(ctx, `SELECT handle FROM users WHERE id = $1`, senderID).Scan(&senderHandle); err != nil {
		return Caravan{}, fmt.Errorf("lookup sender handle: %w", err)
	}
	c.SenderHandle = senderHandle
	return c, nil
}

// ListInbox returns unclaimed caravans addressed to userID.
func (r *Repository) ListInbox(ctx context.Context, userID string) ([]Caravan, error) {
	rows, err := r.db.Query(ctx,
		`SELECT mac.id, u.handle, mac.resource_type, mac.amount, mac.note, mac.claimed
		 FROM mutual_aid_caravans mac
		 JOIN users u ON u.id = mac.sender_id
		 WHERE mac.recipient_id = $1 AND mac.claimed = FALSE
		 ORDER BY mac.created_at`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list inbox: %w", err)
	}
	defer rows.Close()

	caravans := []Caravan{}
	for rows.Next() {
		var c Caravan
		if err := rows.Scan(&c.ID, &c.SenderHandle, &c.ResourceType, &c.Amount, &c.Note, &c.Claimed); err != nil {
			return nil, fmt.Errorf("scan caravan row: %w", err)
		}
		caravans = append(caravans, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate inbox: %w", err)
	}
	return caravans, nil
}

// ClaimCaravan marks a caravan claimed and returns its resource payload,
// rejecting a second claim attempt (row-locked so concurrent claims can't
// both succeed).
func (r *Repository) ClaimCaravan(ctx context.Context, userID, caravanID string) (resourceType string, amount int64, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", 0, fmt.Errorf("begin claim: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var recipientID string
	var claimed bool
	err = tx.QueryRow(ctx,
		`SELECT recipient_id, resource_type, amount, claimed
		 FROM mutual_aid_caravans WHERE id = $1 FOR UPDATE`,
		caravanID,
	).Scan(&recipientID, &resourceType, &amount, &claimed)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", 0, ErrCaravanNotFound
	}
	if err != nil {
		return "", 0, fmt.Errorf("lock caravan: %w", err)
	}
	if recipientID != userID {
		return "", 0, ErrNotRecipient
	}
	if claimed {
		return "", 0, ErrAlreadyClaimed
	}

	_, err = tx.Exec(ctx,
		`UPDATE mutual_aid_caravans SET claimed = TRUE, claimed_at = NOW() WHERE id = $1`,
		caravanID,
	)
	if err != nil {
		return "", 0, fmt.Errorf("claim caravan: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", 0, fmt.Errorf("commit claim: %w", err)
	}
	return resourceType, amount, nil
}

const tradeOfferSelectCols = `
	t.id, p.handle, r.handle, t.offer_resource_type, t.offer_amount,
	t.request_resource_type, t.request_amount, t.note, t.status`

func scanTradeOffer(row pgx.Row) (TradeOffer, error) {
	var o TradeOffer
	err := row.Scan(
		&o.ID, &o.ProposerHandle, &o.RecipientHandle, &o.OfferResourceType, &o.OfferAmount,
		&o.RequestResourceType, &o.RequestAmount, &o.Note, &o.Status,
	)
	return o, err
}

func isValidResourceType(t string) bool {
	return t == "energy" || t == "food" || t == "cash"
}

// ProposeTrade creates a pending trade offer from proposerID to the friend
// identified by handle or invite code. Mirrors DispatchCaravan's shape: the
// proposer's offered resource is escrowed client-side by the caller before
// (or after, on success) this returns — this call is only the server-side
// record and the recipient's future gate.
func (r *Repository) ProposeTrade(
	ctx context.Context, proposerID, identifier string,
	offerResourceType string, offerAmount int64,
	requestResourceType string, requestAmount int64,
	note string,
) (TradeOffer, error) {
	recipientID, _, err := r.resolveUser(ctx, identifier)
	if err != nil {
		return TradeOffer{}, err
	}
	if recipientID == proposerID {
		return TradeOffer{}, ErrSelfFriend
	}
	ok, err := r.areFriends(ctx, proposerID, recipientID)
	if err != nil {
		return TradeOffer{}, err
	}
	if !ok {
		return TradeOffer{}, ErrNotFriends
	}

	var id string
	if err := r.db.QueryRow(ctx,
		`INSERT INTO trade_offers (proposer_id, recipient_id, offer_resource_type, offer_amount, request_resource_type, request_amount, note)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		proposerID, recipientID, offerResourceType, offerAmount, requestResourceType, requestAmount, note,
	).Scan(&id); err != nil {
		return TradeOffer{}, fmt.Errorf("propose trade: %w", err)
	}
	return r.getTradeOffer(ctx, id)
}

func (r *Repository) getTradeOffer(ctx context.Context, id string) (TradeOffer, error) {
	row := r.db.QueryRow(ctx, fmt.Sprintf(`
		SELECT %s FROM trade_offers t
		JOIN users p ON p.id = t.proposer_id
		JOIN users r ON r.id = t.recipient_id
		WHERE t.id = $1`, tradeOfferSelectCols), id)
	o, err := scanTradeOffer(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return TradeOffer{}, ErrTradeNotFound
	}
	if err != nil {
		return TradeOffer{}, fmt.Errorf("get trade offer: %w", err)
	}
	return o, nil
}

// ListTradeInbox returns pending trade offers addressed to userID, awaiting
// their accept/decline.
func (r *Repository) ListTradeInbox(ctx context.Context, userID string) ([]TradeOffer, error) {
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT %s FROM trade_offers t
		JOIN users p ON p.id = t.proposer_id
		JOIN users r ON r.id = t.recipient_id
		WHERE t.recipient_id = $1 AND t.status = 'pending'
		ORDER BY t.created_at`, tradeOfferSelectCols), userID)
	if err != nil {
		return nil, fmt.Errorf("list trade inbox: %w", err)
	}
	defer rows.Close()
	return collectTradeOffers(rows)
}

// ListTradeOutbox returns every trade offer userID proposed that isn't fully
// settled yet — still-pending ones (waiting on the recipient) and
// resolved-but-uncollected ones (accepted/declined, refund or receipt not
// yet applied). The caller auto-settles the resolved ones and offers a
// Cancel action on the still-pending ones.
func (r *Repository) ListTradeOutbox(ctx context.Context, userID string) ([]TradeOffer, error) {
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT %s FROM trade_offers t
		JOIN users p ON p.id = t.proposer_id
		JOIN users r ON r.id = t.recipient_id
		WHERE t.proposer_id = $1 AND t.proposer_settled = FALSE
		ORDER BY t.created_at`, tradeOfferSelectCols), userID)
	if err != nil {
		return nil, fmt.Errorf("list trade outbox: %w", err)
	}
	defer rows.Close()
	return collectTradeOffers(rows)
}

func collectTradeOffers(rows pgx.Rows) ([]TradeOffer, error) {
	offers := []TradeOffer{}
	for rows.Next() {
		o, err := scanTradeOffer(rows)
		if err != nil {
			return nil, fmt.Errorf("scan trade offer row: %w", err)
		}
		offers = append(offers, o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate trade offers: %w", err)
	}
	return offers, nil
}

// RespondTrade accepts or declines a pending offer on behalf of its
// recipient. Row-locked so a double-click can't respond twice.
func (r *Repository) RespondTrade(ctx context.Context, recipientID, tradeID string, accept bool) (TradeOffer, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return TradeOffer{}, fmt.Errorf("begin respond trade: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var actualRecipientID, status string
	err = tx.QueryRow(ctx, `SELECT recipient_id, status FROM trade_offers WHERE id = $1 FOR UPDATE`, tradeID).
		Scan(&actualRecipientID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return TradeOffer{}, ErrTradeNotFound
	}
	if err != nil {
		return TradeOffer{}, fmt.Errorf("lock trade offer: %w", err)
	}
	if actualRecipientID != recipientID {
		return TradeOffer{}, ErrNotTradeRecipient
	}
	if status != "pending" {
		return TradeOffer{}, ErrTradeNotPending
	}

	newStatus := "declined"
	if accept {
		newStatus = "accepted"
	}
	if _, err := tx.Exec(ctx,
		`UPDATE trade_offers SET status = $1, resolved_at = NOW() WHERE id = $2`,
		newStatus, tradeID,
	); err != nil {
		return TradeOffer{}, fmt.Errorf("respond trade: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return TradeOffer{}, fmt.Errorf("commit respond trade: %w", err)
	}
	return r.getTradeOffer(ctx, tradeID)
}

// CancelTrade withdraws a still-pending offer on behalf of its proposer,
// settling synchronously (the proposer is present for this call, unlike the
// accept/decline case where they might not be).
func (r *Repository) CancelTrade(ctx context.Context, proposerID, tradeID string) (TradeSettleResult, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return TradeSettleResult{}, fmt.Errorf("begin cancel trade: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var actualProposerID, status, offerResourceType string
	var offerAmount int64
	err = tx.QueryRow(ctx,
		`SELECT proposer_id, status, offer_resource_type, offer_amount FROM trade_offers WHERE id = $1 FOR UPDATE`,
		tradeID,
	).Scan(&actualProposerID, &status, &offerResourceType, &offerAmount)
	if errors.Is(err, pgx.ErrNoRows) {
		return TradeSettleResult{}, ErrTradeNotFound
	}
	if err != nil {
		return TradeSettleResult{}, fmt.Errorf("lock trade offer: %w", err)
	}
	if actualProposerID != proposerID {
		return TradeSettleResult{}, ErrNotTradeProposer
	}
	if status != "pending" {
		return TradeSettleResult{}, ErrTradeNotPending
	}

	if _, err := tx.Exec(ctx,
		`UPDATE trade_offers SET status = 'cancelled', resolved_at = NOW(), proposer_settled = TRUE WHERE id = $1`,
		tradeID,
	); err != nil {
		return TradeSettleResult{}, fmt.Errorf("cancel trade: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return TradeSettleResult{}, fmt.Errorf("commit cancel trade: %w", err)
	}
	return TradeSettleResult{Status: "cancelled", ResourceType: offerResourceType, Amount: offerAmount}, nil
}

// SettleTrade lets a proposer collect the outcome of a resolved offer: on
// 'accepted' they receive the request side; on 'declined' their own offer
// side is refunded. Idempotent — a second settle attempt fails with
// ErrTradeAlreadySettled rather than double-crediting.
func (r *Repository) SettleTrade(ctx context.Context, proposerID, tradeID string) (TradeSettleResult, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return TradeSettleResult{}, fmt.Errorf("begin settle trade: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var actualProposerID, status string
	var settled bool
	var offerResourceType, requestResourceType string
	var offerAmount, requestAmount int64
	err = tx.QueryRow(ctx,
		`SELECT proposer_id, status, proposer_settled, offer_resource_type, offer_amount, request_resource_type, request_amount
		 FROM trade_offers WHERE id = $1 FOR UPDATE`,
		tradeID,
	).Scan(&actualProposerID, &status, &settled, &offerResourceType, &offerAmount, &requestResourceType, &requestAmount)
	if errors.Is(err, pgx.ErrNoRows) {
		return TradeSettleResult{}, ErrTradeNotFound
	}
	if err != nil {
		return TradeSettleResult{}, fmt.Errorf("lock trade offer: %w", err)
	}
	if actualProposerID != proposerID {
		return TradeSettleResult{}, ErrNotTradeProposer
	}
	if status == "pending" {
		return TradeSettleResult{}, ErrTradeNotPending
	}
	if settled {
		return TradeSettleResult{}, ErrTradeAlreadySettled
	}

	if _, err := tx.Exec(ctx, `UPDATE trade_offers SET proposer_settled = TRUE WHERE id = $1`, tradeID); err != nil {
		return TradeSettleResult{}, fmt.Errorf("settle trade: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return TradeSettleResult{}, fmt.Errorf("commit settle trade: %w", err)
	}

	if status == "accepted" {
		return TradeSettleResult{Status: status, ResourceType: requestResourceType, Amount: requestAmount}, nil
	}
	return TradeSettleResult{Status: status, ResourceType: offerResourceType, Amount: offerAmount}, nil
}
