// Package product owns the local distribution's identity. Upstream module
// paths, file formats and protocol adapters deliberately keep their names.
package product

import (
	"net/url"
	"strings"
)

const (
	Name           = "tuzi-magpie"
	BundleID       = "com.tuzi.magpie"
	Scheme         = "tuzimagpie"
	GatewayAddr    = "127.0.0.1:3435"
	PortableDir    = "tuzi-magpie-data"
	PortableMarker = ".tuzi-magpie-portable"
	Website        = "https://api.tu-zi.com"
	// An empty feed must never fall back to Magpie.
	UpdateFeed = ""
)

// Repository is a build-time setting (-ldflags -X). Empty keeps the original
// project's attribution links; it never enables upstream update releases.
var Repository string

const UpstreamRepository = "https://github.com/yetone/magpie"

// ConfiguredRepository rejects credentials and payloads in a build setting.
// A repository root is an HTTPS URL without a query or fragment.
func ConfiguredRepository() string {
	raw := strings.TrimRight(strings.TrimSpace(Repository), "/")
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || u.RawPath != "" || u.Path == "" {
		return ""
	}
	return raw
}

// RepositoryURL is used by About and release-note issue links. Unlike the
// release/update configuration, attribution may fall back to upstream.
func RepositoryURL() string {
	if repository := ConfiguredRepository(); repository != "" {
		return repository
	}
	return UpstreamRepository
}

// AccountNavigation accepts only the fixed, credential-free account route.
// Exact spelling also rejects escaped paths, ports and parameter payloads.
func AccountNavigation(raw string) bool { return raw == Scheme+"://account/connect" }

const GatewayPort = 3435
