package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailTaken   = errors.New("email already registered")
	ErrInvalidCreds = errors.New("invalid credentials")
)

type Service struct {
	db    *pgxpool.Pool
	token *TokenService
}

func NewService(db *pgxpool.Pool, token *TokenService) *Service {
	return &Service{db: db, token: token}
}

func (s *Service) Register(ctx context.Context, email, password string) (userId, tok string, err error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", "", fmt.Errorf("hash password: %w", err)
	}

	err = s.db.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
		email, string(hash),
	).Scan(&userId)
	if err != nil {
		if isDuplicateKey(err) {
			return "", "", ErrEmailTaken
		}
		return "", "", fmt.Errorf("insert user: %w", err)
	}

	tok, err = s.token.Sign(userId)
	if err != nil {
		return "", "", fmt.Errorf("sign token: %w", err)
	}
	return userId, tok, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (userId, tok string, err error) {
	var hash string
	err = s.db.QueryRow(ctx,
		`SELECT id, password_hash FROM users WHERE email = $1`,
		email,
	).Scan(&userId, &hash)
	if err != nil {
		return "", "", ErrInvalidCreds
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return "", "", ErrInvalidCreds
	}

	tok, err = s.token.Sign(userId)
	if err != nil {
		return "", "", fmt.Errorf("sign token: %w", err)
	}
	return userId, tok, nil
}

func isDuplicateKey(err error) bool {
	return err != nil && containsCode(err.Error(), "23505")
}

func containsCode(s, code string) bool {
	for i := 0; i+len(code) <= len(s); i++ {
		if s[i:i+len(code)] == code {
			return true
		}
	}
	return false
}
