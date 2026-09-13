package pulse

type EconomicMultipliers struct {
	Food    float64 `json:"food"`
	Energy  float64 `json:"energy"`
	Wage    float64 `json:"wage"`
	Transit float64 `json:"transit"`
	Heat    float64 `json:"heat"`
	Migrant float64 `json:"migrant"`
}

type DistrictPulseState struct {
	Multipliers EconomicMultipliers `json:"multipliers"`
	FetchedAt   string              `json:"fetchedAt"`
	Source      string              `json:"source"` // "live" | "seasonal-fallback"
}
