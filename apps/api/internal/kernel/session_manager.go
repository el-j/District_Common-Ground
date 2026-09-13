package kernel

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"
)

const sessionTTL = 10 * time.Minute

var (
	ErrSessionExpired = errors.New("session token expired")
	ErrSessionInvalid = errors.New("session token invalid")
)

// SessionClaims is the payload signed into every session token. Ephemeral and
// short-lived (sessionTTL) — distinct from the 30-day auth JWT in internal/auth.
type SessionClaims struct {
	SessionID string
	UserID    string
	PluginID  string
	ExpiresAt time.Time
}

// SessionManager issues and verifies HMAC-SHA256 signed, ephemeral minigame
// session tokens (anti-cheat: the client cannot forge a session or its plugin
// binding, and every score submission must present a token minted server-side).
type SessionManager struct {
	secret []byte
}

func NewSessionManager(secret string) *SessionManager {
	return &SessionManager{secret: []byte(secret)}
}

// NewSessionID returns a random, URL-safe session identifier.
func NewSessionID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate session id: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

func (s *SessionManager) Sign(claims SessionClaims) string {
	payload := encodePayload(claims)
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return payload + "." + sig
}

func (s *SessionManager) Verify(token string) (SessionClaims, error) {
	idx := strings.LastIndex(token, ".")
	if idx < 0 {
		return SessionClaims{}, ErrSessionInvalid
	}
	payload, sig := token[:idx], token[idx+1:]

	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if subtle.ConstantTimeCompare([]byte(sig), []byte(expectedSig)) != 1 {
		return SessionClaims{}, ErrSessionInvalid
	}

	claims, err := decodePayload(payload)
	if err != nil {
		return SessionClaims{}, ErrSessionInvalid
	}
	if time.Now().After(claims.ExpiresAt) {
		return SessionClaims{}, ErrSessionExpired
	}
	return claims, nil
}

func encodePayload(c SessionClaims) string {
	exp := make([]byte, 8)
	binary.BigEndian.PutUint64(exp, uint64(c.ExpiresAt.Unix()))
	raw := fmt.Sprintf("%s|%s|%s|%s", c.SessionID, c.UserID, c.PluginID, hex.EncodeToString(exp))
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodePayload(encoded string) (SessionClaims, error) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return SessionClaims{}, err
	}
	parts := strings.Split(string(raw), "|")
	if len(parts) != 4 {
		return SessionClaims{}, ErrSessionInvalid
	}
	expBytes, err := hex.DecodeString(parts[3])
	if err != nil || len(expBytes) != 8 {
		return SessionClaims{}, ErrSessionInvalid
	}
	exp := time.Unix(int64(binary.BigEndian.Uint64(expBytes)), 0)
	return SessionClaims{
		SessionID: parts[0],
		UserID:    parts[1],
		PluginID:  parts[2],
		ExpiresAt: exp,
	}, nil
}

// NewClaims builds claims for a fresh session expiring sessionTTL from now.
func NewClaims(sessionID, userID, pluginID string) SessionClaims {
	return SessionClaims{
		SessionID: sessionID,
		UserID:    userID,
		PluginID:  pluginID,
		ExpiresAt: time.Now().Add(sessionTTL),
	}
}
