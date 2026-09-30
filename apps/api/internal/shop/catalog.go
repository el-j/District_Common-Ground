package shop

// Item mirrors packages/shared-types/src/shop.ts's ShopItem.
type Item struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Category       string `json:"category"`
	PriceST        int64  `json:"priceST"`
	PriceCAB       int64  `json:"priceCAB"`
	UnlockCriteria string `json:"unlockCriteria,omitempty"`
	PreviewURL     string `json:"previewUrl,omitempty"`
}

// catalog is the starter Commons Bazaar lineup. Every item has a real
// in-game effect implemented in apps/web/src/core/shop/ShopEffects.ts —
// keep the two in sync (the web test pins the id list). Effects are
// cosmetic/flavour by design: tokens come from real-world deeds and must
// not buy an economic edge.
// Static for now — a future pass
// can move this to the DB if community-submitted items are ever supported.
var catalog = []Item{
	{
		ID:          "solar_facade_mural",
		Title:       "Solar Co-op Mural Facade",
		Description: "A hand-painted mural (🎨) shown at the Rooftop Solar Co-op build site. Cosmetic.",
		Category:    "facade",
		PriceST:     50,
	},
	{
		ID:          "kitchen_awning_deluxe",
		Title:       "Community Kitchen Deluxe Awning",
		Description: "A striped awning (⛱️) shown at the Community Kitchen build site. Cosmetic.",
		Category:    "facade",
		PriceST:     40,
	},
	{
		ID:          "garden_trellis_arch",
		Title:       "Urban Garden Trellis Arch",
		Description: "A climbing-vine archway (🌿) shown at the Community Land Trust site. Cosmetic.",
		Category:    "facade",
		PriceST:     35,
	},
	{
		ID:          "brass_doorbell_chime",
		Title:       "Brass Doorbell Chime",
		Description: "A warm chime plays whenever you start talking to a neighbour.",
		Category:    "cosmetic",
		PriceST:     15,
	},
	{
		ID:          "pip_courier_cap",
		Title:       "Courier's Newsboy Cap",
		Description: "A newsboy cap (🧢) your character wears in the world. Cosmetic.",
		Category:    "cosmetic",
		PriceST:     20,
	},
	{
		ID:          "neighborhood_blueprint_pack",
		Title:       "Neighborhood Organizing Blueprint Pack",
		Description: "Adds a dedication plaque to every finished commons build in your Goals panel.",
		Category:    "blueprint",
		PriceST:     75,
	},
}

// Catalog returns the full shop listing.
func Catalog() []Item {
	out := make([]Item, len(catalog))
	copy(out, catalog)
	return out
}

// Find returns the catalog item with the given id, or false if unknown.
func Find(itemID string) (Item, bool) {
	for _, item := range catalog {
		if item.ID == itemID {
			return item, true
		}
	}
	return Item{}, false
}
