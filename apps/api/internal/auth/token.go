package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenTTL = 30 * 24 * time.Hour

type TokenService struct {
	secret []byte
}

func NewTokenService(secret string) *TokenService {
	return &TokenService{secret: []byte(secret)}
}

func (t *TokenService) Sign(userId string) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userId,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(tokenTTL)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(t.secret)
}

func (t *TokenService) Verify(tokenStr string) (string, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(tok *jwt.Token) (any, error) {
		if _, ok := tok.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return t.secret, nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := tok.Claims.(*jwt.RegisteredClaims)
	if !ok || !tok.Valid {
		return "", errors.New("invalid token")
	}
	return claims.Subject, nil
}
