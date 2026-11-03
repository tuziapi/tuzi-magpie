package provider

// These ids identify ordinary API-key presets, never account credentials.
const (
	TuziPreset       = "tuzi"
	TuziCodingPreset = "tuzi-coding"
	GACCodePreset    = "gaccode"
)

// TuziWebLinks are navigation-only destinations. No model key, account token
// or gateway key is ever added to one of these addresses.
type TuziWebLinks struct {
	PurchaseURL string `json:"purchaseUrl"`
	QueryURL    string `json:"queryUrl"`
}

// TuziLinks gives the fixed website destinations of a Tuzi-family preset.
// Unknown providers get none; a matching host alone proves no affiliation.
func TuziLinks(preset string) (TuziWebLinks, bool) {
	switch preset {
	case TuziPreset:
		return TuziWebLinks{"https://api.tu-zi.com/console/topup", "https://check.sydney-ai.com/"}, true
	case TuziCodingPreset:
		return TuziWebLinks{"https://store.tu-zi.com/cat/11", "https://coding.tu-zi.com/reseller/"}, true
	case GACCodePreset:
		return TuziWebLinks{"https://store.tu-zi.com/cat/1", "https://gaccode.com/subscriptions"}, true
	}
	return TuziWebLinks{}, false
}
