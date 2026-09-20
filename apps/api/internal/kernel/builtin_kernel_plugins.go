package kernel

// BuiltinKernelPlugin is the server's independent record of what version of
// each always-on (never user-installed) kernel plugin it expects the client
// to be running. It exists so the "Built-in Plugins" section of the web
// client's Plugin Library can genuinely detect drift — e.g. a deploy that
// bumped a packages/plugin-* version in the frontend bundle without this
// list being updated to match, or vice versa — the same integrity check
// ListGames already gives user-installed plugins via ServerGameManifest,
// just applied to the plugins that ship hardcoded in the client bundle
// instead of being fetched at runtime.
type BuiltinKernelPlugin struct {
	ID          string `json:"id"`
	Version     string `json:"version"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Core        bool   `json:"core"`
}

// BuiltinKernelPluginManifests mirrors the KernelPluginManifest each
// packages/plugin-*/src/plugin.ts (and the two in-tree skins/world plugins)
// exports — keep IDs and versions in sync by hand when those change, the
// same maintenance contract BuiltinGameManifests already has for minigames.
func BuiltinKernelPluginManifests() []BuiltinKernelPlugin {
	return []BuiltinKernelPlugin{
		{
			ID:          "skins",
			Version:     "1.0.0",
			Title:       "Theme Skins",
			Description: "Manifest-driven palette/asset skinning (ThemeManager) — moves default-skin bootstrap behind the kernel instead of main.ts calling it directly.",
			Core:        true,
		},
		{
			ID:          "world",
			Version:     "1.0.0",
			Title:       "World Simulation",
			Description: "The Phaser WorldScene — inventory entry only; construction and lifecycle stay in main.ts.",
			Core:        true,
		},
		{
			ID:          "geo-weather",
			Version:     "0.1.0",
			Title:       "Real-Time Geo-Weather",
			Description: "Astronomical solar cycle sync (SunCalc) plus live Open-Meteo weather, mapped to district ambient lighting and resource modifiers.",
			Core:        false,
		},
		{
			ID:          "mesh-comms",
			Version:     "0.1.0",
			Title:       "Off-Grid Mesh Networking",
			Description: "LoRa/Meshtastic radio bridge (Web Serial + Web Bluetooth) and a serverless WebRTC data channel for zero-internet neighborhood dispatch.",
			Core:        false,
		},
		{
			ID:          "mutual-credit",
			Version:     "0.1.0",
			Title:       "Decentralized Mutual Credit",
			Description: "Ed25519-signed, hash-chained mutual credit ledger for zero-fee neighbor-to-neighbor trade, relayed via a pasteable scan-to-pay code.",
			Core:        false,
		},
		{
			ID:          "bitchat",
			Version:     "0.1.0",
			Title:       "bitchat.free — Zero-Internet Neighborhood Chat",
			Description: "Zero-server, zero-hardware peer-to-peer mesh chat: discovers nearby devices and negotiates end-to-end encrypted channels automatically, no cell signal or WiFi router required.",
			Core:        false,
		},
	}
}
