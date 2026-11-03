package netproxy

import (
	"net/url"
	"testing"

	"github.com/yetone/magpie/internal/settings"
)

// An environment bypass must not silently become a system-proxy request.
// All addresses are synthetic; For only selects a route and never dials it.
func TestNoProxyDoesNotFallBackToSystem(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	for _, key := range []string{"HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy"} {
		t.Setenv(key, "")
	}
	sysCache.at, sysCache.p = farFuture, Proxy{URL: "http://127.0.0.1:18191"}
	t.Cleanup(func() { sysCache.at, sysCache.p = zero, Proxy{} })
	t.Setenv("ALL_PROXY", "http://127.0.0.1:18192")
	t.Setenv("NO_PROXY", "internal.example")
	u, _ := url.Parse("https://api.internal.example/v1/models")
	if p, err := For(u); err != nil || p != nil {
		t.Fatalf("environment bypass fell back to system proxy: %v, %v", p, err)
	}
	t.Setenv("ALL_PROXY", "")
	if p, err := For(u); err != nil || p != nil {
		t.Fatalf("bypass without an environment proxy used the system: %v, %v", p, err)
	}
	other, _ := url.Parse("https://external.example/v1/models")
	if p, err := For(other); err != nil || p == nil || p.String() != "http://127.0.0.1:18191" {
		t.Fatalf("nonmatching host lost system fallback: %v, %v", p, err)
	}
	if err := settings.Save(settings.Settings{Proxy: "http://127.0.0.1:18193"}); err != nil {
		t.Fatal(err)
	}
	if p, err := For(u); err != nil || p == nil || p.String() != "http://127.0.0.1:18193" {
		t.Fatalf("explicit application proxy lost precedence: %v, %v", p, err)
	}
}
