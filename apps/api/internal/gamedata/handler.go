package gamedata

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed data/crisis_scenarios.json
var dataFS embed.FS

type Handler struct{}

func NewHandler() *Handler { return &Handler{} }

func (h *Handler) Crises(w http.ResponseWriter, r *http.Request) {
	data, err := fs.ReadFile(dataFS, "data/crisis_scenarios.json")
	if err != nil {
		http.Error(w, `{"error":"crisis data unavailable"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(data)
}
