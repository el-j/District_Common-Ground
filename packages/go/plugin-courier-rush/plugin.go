// Package courierrush is the M14 reference minigame plugin: "Cargo Courier Rush"
// (Pizza-Taxi style bike delivery run). It proves the kernel.GamePlugin contract
// end-to-end and is the template for future standalone plugin modules.
//
// # Standalone Plugin Module
//
// This lives at packages/go/plugin-courier-rush and depends only on
// github.com/district-cg/kernel-contracts — never on any internal API package.
//
// # How registration works
//
// The host binary (apps/api) imports this package and calls Register(r) in its
// plugin-setup step, passing a Registrar (the kernel.DefaultRegistry):
//
//	import courierrush "github.com/district-cg/plugin-courier-rush"
//	// ... in setup:
//	courierrush.Register(kernel.DefaultRegistry)
//
// This explicit-call pattern avoids init() ordering surprises and keeps each
// plugin's registration 100% visible at the call site in register.go.
package courierrush

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"

	kc "github.com/district-cg/kernel-contracts"
)

const (
	pluginID       = "courier-rush"
	maxDurationSec = 90.0
	// Anti-cheat bound: a clean delivery (kitchen pickup -> tenant drop-off) takes
	// at least ~6s of real bike travel; reject payloads implying a faster average.
	minSecondsPerDelivery = 6.0
	completionThreshold   = 3 // matches Test 14.4: deliver 3 soup orders
)

// Registrar is the minimal interface a host registry must satisfy.
// The concrete kernel.Registry in apps/api already implements this.
type Registrar interface {
	Register(p kc.GamePlugin)
}

// Register self-registers this plugin into r. Call this once during host startup,
// before the game server starts accepting requests. It is idempotent.
func Register(r Registrar) {
	r.Register(&Plugin{})
}

// Plugin implements kc.GamePlugin.
type Plugin struct{}

func (p *Plugin) Metadata() kc.PluginMetadata {
	return kc.PluginMetadata{
		ID:          pluginID,
		Version:     "1.0.0",
		Name:        "Cargo Courier Rush",
		Author:      "District Common Ground",
		Category:    "arcade",
		Entrypoint:  "minigames/courier-rush/index.ts",
		Permissions: []string{"wallet:grant"},
	}
}

func (p *Plugin) StartSession(_ context.Context, _ kc.SessionConfig) (string, error) {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("courierrush: seed: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

// ProcessInput is a no-op in v1: score verification happens entirely against the
// final payload in ComputeScore (bounded anti-cheat, not per-tick replay validation).
func (p *Plugin) ProcessInput(_ context.Context, _ string, _ kc.GameInputEvent) error {
	return nil
}

type finalPayload struct {
	Deliveries  int     `json:"deliveries"`
	ComboMax    int     `json:"comboMax"`
	Crashes     int     `json:"crashes"`
	DurationSec float64 `json:"durationSec"`
}

func (p *Plugin) ComputeScore(_ context.Context, _ string, raw []byte) (kc.GameSessionResult, error) {
	var fp finalPayload
	if err := json.Unmarshal(raw, &fp); err != nil {
		return kc.GameSessionResult{}, fmt.Errorf("courierrush: invalid payload: %w", err)
	}
	if fp.DurationSec <= 0 || fp.DurationSec > maxDurationSec {
		return kc.GameSessionResult{}, fmt.Errorf("courierrush: duration %v out of bounds", fp.DurationSec)
	}
	if fp.Deliveries < 0 || fp.Crashes < 0 || fp.ComboMax < 0 {
		return kc.GameSessionResult{}, fmt.Errorf("courierrush: negative counters")
	}
	maxPlausibleDeliveries := int(math.Floor(fp.DurationSec/minSecondsPerDelivery)) + 1
	if fp.Deliveries > maxPlausibleDeliveries {
		return kc.GameSessionResult{}, fmt.Errorf("courierrush: %d deliveries implausible for %.1fs", fp.Deliveries, fp.DurationSec)
	}

	score := max(int64(fp.Deliveries*100+fp.ComboMax*20)-int64(fp.Crashes*15), 0)
	completed := fp.Deliveries >= completionThreshold

	rewards := kc.ResourceGrant{
		CashDelta:   fp.Deliveries * 8,
		TrustDelta:  boolToInt(completed)*5 + fp.Deliveries,
		EnergyDelta: -5,
	}

	return kc.GameSessionResult{
		Score:          score,
		Completed:      completed,
		DurationSec:    fp.DurationSec,
		RewardsGranted: rewards,
		Telemetry: map[string]any{
			"deliveries": fp.Deliveries,
			"comboMax":   fp.ComboMax,
			"crashes":    fp.Crashes,
		},
	}, nil
}

func (p *Plugin) HealthCheck(_ context.Context) error {
	return nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
