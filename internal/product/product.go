// Package product owns the local distribution's identity. Upstream module
// paths, file formats and protocol adapters deliberately keep their names.
package product

const (
	Name           = "tuzi-magpie"
	BundleID       = "com.tuzi.magpie"
	Scheme         = "tuzimagpie"
	GatewayAddr    = "127.0.0.1:3435"
	PortableDir    = "tuzi-magpie-data"
	PortableMarker = ".tuzi-magpie-portable"
	Website        = "https://api.tu-zi.com"
	// Repository and UpdateFeed stay empty until a release owner configures
	// this distribution. An empty feed must never fall back to Magpie.
	Repository = ""
	UpdateFeed = ""
)

// AccountNavigation accepts only the fixed, credential-free account route.
// Exact spelling also rejects escaped paths, ports and parameter payloads.
func AccountNavigation(raw string) bool { return raw == Scheme+"://account/connect" }

const GatewayPort = 3435
