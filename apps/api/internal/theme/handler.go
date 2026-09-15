// Package theme serves the M15 theme catalog: the bundled starter themes plus
// any community theme that has cleared the M14 plugin trust gate (quarantine ->
// manifest/hash validation -> owner review). Community themes are submitted
// through the existing kernel verification queue with PluginMetadata.Category
// set to "theme" — this package adds zero new tables or review workflow, it
// only filters and merges what kernel.Repository already tracks.
package theme

import (
	"encoding/json"
	"net/http"

	"github.com/district-cg/api/internal/kernel"
)

const Category = "theme"

// builtInThemes ships with the game and never needs owner review.
var builtInThemes = []kernel.PluginMetadata{
	{ID: "solarpunk", Version: "1.0.0", Name: "Solarpunk", Author: "District Commons", Category: Category, Entrypoint: "assets/skins/solarpunk/skin.manifest.json"},
	{ID: "retro_gb", Version: "1.0.0", Name: "Retro GB", Author: "District Commons", Category: Category, Entrypoint: "assets/skins/retro_gb/skin.manifest.json"},
	{ID: "labor_woodcut", Version: "1.0.0", Name: "1930s Labor Woodcut", Author: "District Commons", Category: Category, Entrypoint: "assets/skins/labor_woodcut/skin.manifest.json"},
	{ID: "aurora", Version: "1.0.0", Name: "Aurora Glass", Author: "District Commons", Category: Category, Entrypoint: "assets/skins/aurora/skin.manifest.json"},
}

type Handler struct {
	repo *kernel.Repository
}

func NewHandler(repo *kernel.Repository) *Handler {
	return &Handler{repo: repo}
}

// List serves GET /api/v1/themes — the public catalog of built-in themes plus
// any community theme that has been approved through the plugin verification queue.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	themes := append([]kernel.PluginMetadata{}, builtInThemes...)

	verified, err := h.repo.ListVerifiedPlugins(r.Context())
	if err == nil {
		for _, plugin := range verified {
			if plugin.Category == Category {
				themes = append(themes, plugin)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(themes)
}
