// Package kernelcontracts defines the public plugin contract for District: Common Ground.
// Every minigame backend module depends on this package — never on apps/api/internal/kernel.
// This keeps plugin source code fully decoupled from the core API binary.
//
// To add a new minigame backend plugin:
//  1. Create a new Go module (e.g. packages/go/plugin-my-game/)
//  2. Import this package and implement GamePlugin
//  3. In the plugin's init(), call kernel.DefaultRegistry.Register(&MyPlugin{})
//     where kernel.DefaultRegistry is provided by the host at startup
//  4. The host binary blank-imports the plugin module so its init() fires
package kernelcontracts

import "context"

// Registrar is the minimal host-side contract a plugin needs in order to
// register itself into the running server.
type Registrar interface {
	Register(GamePlugin)
}

// PluginMetadata describes a registered minigame plugin.
//
// M29 — the JSON tags on Name/Entrypoint were renamed to title/entrypointUrl
// (and Description/ThumbnailURL/TargetHardware added) to match the
// frontend's canonical MinigameManifest/ServerGameManifest shape
// (packages/shared-types/src/kernel.ts, apps/web/src/api/endpoints/games.ts).
// Before this fix, every catalog entry — including the pre-existing
// courier-rush one — rendered with a blank title/entrypoint wherever the
// frontend read GET /api/v1/games, since the old tags (name/entrypoint)
// never matched what the frontend was decoding for.
type PluginMetadata struct {
	ID             string   `json:"id"`
	Version        string   `json:"version"`
	Name           string   `json:"title"`
	Description    string   `json:"description"`
	Author         string   `json:"author"`
	Category       string   `json:"category"`
	ThumbnailURL   string   `json:"thumbnailUrl"`
	Entrypoint     string   `json:"entrypointUrl"`
	TargetHardware string   `json:"targetHardware"`
	Permissions    []string `json:"permissions"`
}

// SessionConfig carries per-session context from the host to the plugin.
type SessionConfig struct {
	SessionID   string         `json:"sessionId"`
	UserID      string         `json:"userId"`
	Archetype   string         `json:"archetype"`
	Difficulty  int            `json:"difficulty"`
	DistrictDay int            `json:"districtDay"`
	CustomData  map[string]any `json:"customData"`
}

// GameInputEvent represents a single real-time input tick from the client.
type GameInputEvent struct {
	Timestamp int64          `json:"timestamp"`
	Action    string         `json:"action"`
	Payload   map[string]any `json:"payload"`
}

// ResourceGrant specifies the resource deltas to apply when a session ends.
type ResourceGrant struct {
	CashDelta       int `json:"cashDelta"`
	EnergyDelta     int `json:"energyDelta"`
	TrustDelta      int `json:"trustDelta"`
	ResilienceDelta int `json:"resilienceDelta"`
}

// GameSessionResult is the final result returned by ComputeScore.
type GameSessionResult struct {
	SessionID      string         `json:"sessionId"`
	Score          int64          `json:"score"`
	Completed      bool           `json:"completed"`
	DurationSec    float64        `json:"durationSec"`
	RewardsGranted ResourceGrant  `json:"rewardsGranted"`
	Telemetry      map[string]any `json:"telemetry"`
}

// GamePlugin is the contract every minigame backend module must implement.
// A plugin self-registers into the host registry from its own init() —
// adding a plugin never requires editing the core API packages.
type GamePlugin interface {
	Metadata() PluginMetadata
	StartSession(ctx context.Context, cfg SessionConfig) (sessionToken string, err error)
	ProcessInput(ctx context.Context, sessionToken string, event GameInputEvent) error
	ComputeScore(ctx context.Context, sessionToken string, finalPayload []byte) (GameSessionResult, error)
	HealthCheck(ctx context.Context) error
}
