package kernel

// M29 — 4 of the 5 built-in minigames (kitchen-rush, solidarity-line,
// tenant-match, tool-workshop) have no real Go-side GamePlugin: no backend
// session/anti-cheat logic exists for them (only courier-rush has that,
// via packages/go/plugin-courier-rush, registered in the real Registry).
// Porting real StartSession/ProcessInput/ComputeScore logic for each is a
// separate, much larger effort unrelated to "is this game loaded via the
// plugin system" — out of scope here. This file gives them a lightweight,
// metadata-only catalog entry instead, so GET /api/v1/games can list all 5
// built-ins with real title/entrypointUrl/etc., matching what
// apps/web/src/core/kernel/builtinMinigameCatalog.ts expects. Their
// entrypointUrl points at the same static bundle path each package's
// `npm run build` (Vite lib mode) emits into apps/web/public/plugins/<id>/.
func BuiltinGameManifests() []PluginMetadata {
	return []PluginMetadata{
		{
			ID:             "kitchen-rush",
			Version:        "1.0.0",
			Name:           "Community Kitchen Rush",
			Description:    "Work the Community Kitchen's stove: click ingredients in the right order to fulfill each ticket before hungry neighbors give up waiting.",
			Category:       "cooking",
			ThumbnailURL:   "/assets/minigames/kitchen-rush.png",
			Entrypoint:     "/plugins/kitchen-rush/index.js",
			TargetHardware: "canvas",
			Permissions:    []string{"wallet:grant", "audio:sfx"},
		},
		{
			ID:             "solidarity-line",
			Version:        "1.0.0",
			Name:           "Solidarity Line",
			Description:    "Displacement pressure is closing in on three fronts. Place mutual-aid shields along the line to turn eviction notices back before they reach the Land Trust.",
			Category:       "defense",
			ThumbnailURL:   "/assets/minigames/solidarity-line.png",
			Entrypoint:     "/plugins/solidarity-line/index.js",
			TargetHardware: "canvas",
			Permissions:    []string{"wallet:grant", "audio:sfx"},
		},
		{
			ID:             "tenant-match",
			Version:        "1.0.0",
			Name:           "Tenant Rights Match",
			Description:    "A memory-match challenge through two rounds of legal paperwork — pair up lease clauses, code citations, and covenants before the clock runs out.",
			Category:       "puzzle",
			ThumbnailURL:   "/assets/minigames/tenant-match.png",
			Entrypoint:     "/plugins/tenant-match/index.js",
			TargetHardware: "canvas",
			Permissions:    []string{"wallet:grant", "audio:sfx"},
		},
		{
			ID:             "tool-workshop",
			Version:        "1.0.0",
			Name:           "Tool Library Workshop",
			Description:    "Marcus's belt is backed up. Sort mechanical, electrical, and bike parts into the right bin — and send anything truly broken to scrap — before the line jams.",
			Category:       "assembly",
			ThumbnailURL:   "/assets/minigames/tool-workshop.png",
			Entrypoint:     "/plugins/tool-workshop/index.js",
			TargetHardware: "canvas",
			Permissions:    []string{"wallet:grant", "audio:sfx"},
		},
	}
}
