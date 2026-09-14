package civic

import (
	"context"
	"fmt"
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
}

// Chapter mirrors the shared-types LocalChapter shape.
type Chapter struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	DistanceKm float64 `json:"distanceKm"`
	Address    string  `json:"address"`
	WebsiteURL string  `json:"websiteUrl"`
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
		`SELECT id, title, organizer, start_time, location_summary, source_url, region_code
		 FROM civic_actions
		 WHERE region_code = $1 AND start_time >= NOW()
		 ORDER BY start_time ASC`,
		regionCode,
	)
	if err != nil {
		return nil, fmt.Errorf("list civic actions: %w", err)
	}
	defer rows.Close()

	actions := []Action{}
	for rows.Next() {
		var a Action
		var startTime time.Time
		if err := rows.Scan(&a.ID, &a.Title, &a.Organizer, &startTime, &a.LocationSummary, &a.SourceURL, &a.RegionCode); err != nil {
			return nil, fmt.Errorf("scan civic action: %w", err)
		}
		a.StartTime = startTime.UTC().Format(time.RFC3339)
		actions = append(actions, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list civic actions: %w", err)
	}
	return actions, nil
}

// ListChapters returns mutual-aid chapters for the given coarse region code,
// nearest first, using each chapter's curated distance-from-district value —
// again, no live geolocation of the requester is ever performed.
func (r *Repository) ListChapters(ctx context.Context, regionCode string) ([]Chapter, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, type, distance_km, address, website_url
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
		if err := rows.Scan(&c.ID, &c.Name, &c.Type, &c.DistanceKm, &c.Address, &c.WebsiteURL); err != nil {
			return nil, fmt.Errorf("scan local chapter: %w", err)
		}
		chapters = append(chapters, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list local chapters: %w", err)
	}
	return chapters, nil
}
