package civic

import "time"

// nextOccurrence returns the first repeat of an event at or after now.
// everyDays <= 0 means the event doesn't repeat, so start is returned as is.
func nextOccurrence(start, now time.Time, everyDays int) time.Time {
	if everyDays <= 0 || !start.Before(now) {
		return start
	}
	period := time.Duration(everyDays) * 24 * time.Hour
	steps := now.Sub(start) / period
	next := start.Add(steps * period)
	if next.Before(now) {
		next = next.Add(period)
	}
	return next
}
