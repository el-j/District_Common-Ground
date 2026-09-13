// Package kernel implements the M14 microkernel: an in-process, self-registering
// plugin registry for minigames. See docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md
// section 3.1 for the architectural rationale (in-process interface registry chosen
// over WASM/subprocess plugins to keep CGO_ENABLED=0 static-binary builds intact).
package kernel

import "context"

type PluginMetadata struct {
	ID          string   `json:"id"`
	Version     string   `json:"version"`
	Name        string   `json:"name"`
	Author      string   `json:"author"`
	Category    string   `json:"category"`
	Entrypoint  string   `json:"entrypoint"`
	Permissions []string `json:"permissions"`
}

type SessionConfig struct {
	SessionID   string         `json:"sessionId"`
	UserID      string         `json:"userId"`
	Archetype   string         `json:"archetype"`
	Difficulty  int            `json:"difficulty"`
	DistrictDay int            `json:"districtDay"`
	CustomData  map[string]any `json:"customData"`
}

type GameInputEvent struct {
	Timestamp int64          `json:"timestamp"`
	Action    string         `json:"action"`
	Payload   map[string]any `json:"payload"`
}

type ResourceGrant struct {
	CashDelta       int `json:"cashDelta"`
	EnergyDelta     int `json:"energyDelta"`
	TrustDelta      int `json:"trustDelta"`
	ResilienceDelta int `json:"resilienceDelta"`
}

type GameSessionResult struct {
	SessionID      string         `json:"sessionId"`
	Score          int64          `json:"score"`
	Completed      bool           `json:"completed"`
	DurationSec    float64        `json:"durationSec"`
	RewardsGranted ResourceGrant  `json:"rewardsGranted"`
	Telemetry      map[string]any `json:"telemetry"`
}

// GamePlugin is the contract every minigame backend module implements. A plugin
// self-registers into DefaultRegistry from its own init() (see internal/plugins/register.go)
// — adding a plugin never requires editing this package.
type GamePlugin interface {
	Metadata() PluginMetadata
	StartSession(ctx context.Context, cfg SessionConfig) (sessionToken string, err error)
	ProcessInput(ctx context.Context, sessionToken string, event GameInputEvent) error
	ComputeScore(ctx context.Context, sessionToken string, finalPayload []byte) (GameSessionResult, error)
	HealthCheck(ctx context.Context) error
}
