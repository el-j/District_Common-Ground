package civic

import (
	"testing"
	"time"
)

// 2026-09-29 launch audit §3.12 — seeded events had dates fixed at
// migration time and went stale soon after deploy.
func TestNextOccurrence(t *testing.T) {
	start := time.Date(2026, 1, 1, 18, 0, 0, 0, time.UTC)

	t.Run("future start is unchanged", func(t *testing.T) {
		now := start.Add(-48 * time.Hour)
		if got := nextOccurrence(start, now, 7); !got.Equal(start) {
			t.Fatalf("got %v, want %v", got, start)
		}
	})

	t.Run("past start rolls forward to the next repeat", func(t *testing.T) {
		now := start.Add(10 * 24 * time.Hour) // day 10 → next repeat is day 14
		want := start.Add(14 * 24 * time.Hour)
		if got := nextOccurrence(start, now, 7); !got.Equal(want) {
			t.Fatalf("got %v, want %v", got, want)
		}
	})

	t.Run("result is never in the past", func(t *testing.T) {
		for d := 0; d < 400; d++ {
			now := start.Add(time.Duration(d)*24*time.Hour + 3*time.Hour)
			if got := nextOccurrence(start, now, 14); got.Before(now) {
				t.Fatalf("day %d: %v is before %v", d, got, now)
			}
		}
	})

	t.Run("non-recurring past event is left as is", func(t *testing.T) {
		now := start.Add(72 * time.Hour)
		if got := nextOccurrence(start, now, 0); !got.Equal(start) {
			t.Fatalf("got %v, want %v", got, start)
		}
	})
}
