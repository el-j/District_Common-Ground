package narrative

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"
)

// Provider selects which AI backend to use.
type Provider string

const (
	ProviderOllama     Provider = "ollama"
	ProviderOpenAIComp Provider = "openai-compat" // Groq, Cloudflare, HuggingFace
)

type Config struct {
	Provider   Provider
	Model      string
	Endpoint   string
	APIKey     string
	TimeoutSec int
}

// LoadConfig reads AI configuration from environment variables.
// All settings are optional; if absent the client returns ErrNoProvider.
func LoadConfig() Config {
	provider := Provider(getEnv("AI_PROVIDER", ""))
	if provider == "" {
		return Config{}
	}
	return Config{
		Provider:   provider,
		Model:      getEnv("AI_MODEL", "llama3.2:3b"),
		Endpoint:   getEnv("AI_ENDPOINT", "http://localhost:11434"),
		APIKey:     getEnv("AI_API_KEY", ""),
		TimeoutSec: 30,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ErrNoProvider is returned when no AI provider is configured.
var ErrNoProvider = fmt.Errorf("no AI provider configured")

type Client struct {
	cfg    Config
	http   *http.Client
}

func NewClient(cfg Config) *Client {
	return &Client{
		cfg:  cfg,
		http: &http.Client{Timeout: time.Duration(cfg.TimeoutSec) * time.Second},
	}
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream"`
}

type ollamaResponse struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// Complete sends a chat completion request and returns the assistant content.
func (c *Client) Complete(ctx context.Context, messages []Message) (string, error) {
	if c.cfg.Provider == "" {
		return "", ErrNoProvider
	}

	body, err := json.Marshal(chatRequest{
		Model:    c.cfg.Model,
		Messages: messages,
		Stream:   false,
	})
	if err != nil {
		return "", fmt.Errorf("marshal: %w", err)
	}

	var url string
	switch c.cfg.Provider {
	case ProviderOllama:
		url = c.cfg.Endpoint + "/api/chat"
	case ProviderOpenAIComp:
		url = c.cfg.Endpoint + "/v1/chat/completions"
	default:
		return "", fmt.Errorf("unknown provider: %s", c.cfg.Provider)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("http: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("provider %s: status %d: %s", c.cfg.Provider, resp.StatusCode, raw)
	}

	switch c.cfg.Provider {
	case ProviderOllama:
		var r ollamaResponse
		if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
			return "", fmt.Errorf("decode ollama: %w", err)
		}
		return r.Message.Content, nil
	default:
		var r openAIResponse
		if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
			return "", fmt.Errorf("decode openai-compat: %w", err)
		}
		if len(r.Choices) == 0 {
			return "", fmt.Errorf("empty choices from provider")
		}
		return r.Choices[0].Message.Content, nil
	}
}

// GenerateScenario builds messages and calls Complete, then validates the result.
// Falls back to (nil, nil) when no provider is configured so callers use curated vault.
func GenerateScenario(ctx context.Context, client *Client, pulse PulseContext) (*DynamicScenario, error) {
	if client == nil || client.cfg.Provider == "" {
		return nil, nil
	}

	msgs := BuildMessages(pulse)
	raw, err := client.Complete(ctx, msgs)
	if err != nil {
		slog.Warn("narrative/generate failed, falling back to curated vault", "err", err)
		return nil, nil
	}

	scenario, err := ValidateScenario(raw)
	if err != nil {
		slog.Warn("narrative/validate rejected LLM output", "err", err)
		return nil, nil
	}
	return scenario, nil
}
