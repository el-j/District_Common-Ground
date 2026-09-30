package civic

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Action mirrors the shared-types CivicAction shape.
type Action struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Organizer       string `json:"organizer"`
	StartTime       string `json:"startTime"`
	LocationSummary string `json:"locationSummary"`
	SourceURL       string `json:"sourceUrl"`
	RegionCode      string `json:"regionCode"`
	// InFiction marks the game's own fictional places and events (shown as
	// "In the game world", never presented as real listings).
	InFiction bool `json:"inFiction"`
}

// Chapter mirrors the shared-types LocalChapter shape.
type Chapter struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	DistanceKm float64 `json:"distanceKm"`
	Address    string  `json:"address"`
	WebsiteURL string  `json:"websiteUrl"`
	InFiction  bool    `json:"inFiction"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// ListUpcomingActions returns verified civic actions for the given coarse
// region code, soonest first. regionCode is a small user-chosen label (e.g.
// "GENERIC") set in Settings — it is never derived from GPS or IP geolocation.
func (r *Repository) ListUpcomingActions(ctx context.Context, regionCode string) ([]Action, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, title, organizer, start_time, location_summary, source_url, region_code,
		        in_fiction, COALESCE(recurs_every_days, 0)
		 FROM civic_actions
		 WHERE region_code = $1 AND (start_time >= NOW() OR recurs_every_days IS NOT NULL)`,
		regionCode,
	)
	if err != nil {
		return nil, fmt.Errorf("list civic actions: %w", err)
	}
	defer rows.Close()

	type row struct {
		a     Action
		start time.Time
	}
	now := time.Now()
	list := []row{}
	for rows.Next() {
		var a Action
		var startTime time.Time
		var every int
		if err := rows.Scan(&a.ID, &a.Title, &a.Organizer, &startTime, &a.LocationSummary, &a.SourceURL, &a.RegionCode, &a.InFiction, &every); err != nil {
			return nil, fmt.Errorf("scan civic action: %w", err)
		}
		next := nextOccurrence(startTime, now, every)
		a.StartTime = next.UTC().Format(time.RFC3339)
		list = append(list, row{a, next})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list civic actions: %w", err)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].start.Before(list[j].start) })
	actions := make([]Action, 0, len(list))
	for _, r := range list {
		actions = append(actions, r.a)
	}
	return actions, nil
}

// ListChapters returns mutual-aid chapters for the given coarse region code,
// nearest first, using each chapter's curated distance-from-district value —
// again, no live geolocation of the requester is ever performed.
func (r *Repository) ListChapters(ctx context.Context, regionCode string) ([]Chapter, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, type, distance_km, address, website_url, in_fiction
		 FROM local_chapters
		 WHERE region_code = $1
		 ORDER BY distance_km ASC`,
		regionCode,
	)
	if err != nil {
		return nil, fmt.Errorf("list local chapters: %w", err)
	}
	defer rows.Close()

	chapters := []Chapter{}
	for rows.Next() {
		var c Chapter
		if err := rows.Scan(&c.ID, &c.Name, &c.Type, &c.DistanceKm, &c.Address, &c.WebsiteURL, &c.InFiction); err != nil {
			return nil, fmt.Errorf("scan local chapter: %w", err)
		}
		chapters = append(chapters, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list local chapters: %w", err)
	}
	return chapters, nil
}
