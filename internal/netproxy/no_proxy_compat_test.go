package netproxy

import (
	"context"
	"net/url"
	"os"
	"os/exec"
	"testing"
	"time"
)

// HTTP(S)_PROXY uses Go's host-and-port matcher before the ALL_PROXY
// fallback. A bypass added for system fallback must not replace it with
// ALL_PROXY's broader host-only matching. Each child sets its own proxy
// environment before net/http caches that environment for the first time.
func TestNoProxyPreservesHTTPEnvironmentMatching(t *testing.T) {
	const child = "TUZI_TEST_PROXY_MATCH_CASE"
	cases := []struct {
		name, proxyKey, noProxy, target string
		wantProxy                       bool
	}{
		{"http port mismatch", "HTTP_PROXY", "api.example.com:80", "http://api.example.com:8080", true},
		{"http port match", "HTTP_PROXY", "api.example.com:80", "http://api.example.com", false},
		{"https port mismatch", "HTTPS_PROXY", "api.example.com:443", "https://api.example.com:8443", true},
		{"https port match", "HTTPS_PROXY", "api.example.com:443", "https://api.example.com", false},
		{"http domain root", "HTTP_PROXY", ".example.com", "http://example.com", true},
		{"http subdomain", "HTTP_PROXY", ".example.com", "http://api.example.com", false},
		{"https domain root", "HTTPS_PROXY", ".example.com", "https://example.com", true},
		{"https subdomain", "HTTPS_PROXY", ".example.com", "https://api.example.com", false},
		{"http IPv4 CIDR", "HTTP_PROXY", "192.0.2.0/24", "http://192.0.2.7", false},
		{"https IPv4 CIDR", "HTTPS_PROXY", "192.0.2.0/24", "https://192.0.2.7", false},
		{"https IPv6 CIDR", "HTTPS_PROXY", "2001:db8::/32", "https://[2001:db8::7]", false},
		{"IPv4 CIDR without environment proxy", "", "192.0.2.0/24", "https://192.0.2.7", false},
		{"IPv4 CIDR outside range", "HTTPS_PROXY", "192.0.2.0/24", "https://198.51.100.7", true},
		{"IPv6 CIDR outside range", "HTTPS_PROXY", "2001:db8::/32", "https://[2001:db9::7]", true},
	}
	selected := os.Getenv(child)
	for _, tc := range cases {
		if selected != "" && selected != tc.name {
			continue
		}
		t.Run(tc.name, func(t *testing.T) {
			if selected == "" {
				self, err := os.Executable()
				if err != nil {
					t.Fatal(err)
				}
				ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
				defer cancel()
				cmd := exec.CommandContext(ctx, self, "-test.run=^TestNoProxyPreservesHTTPEnvironmentMatching$", "-test.count=1", "-test.v")
				cmd.Env = append(os.Environ(), child+"="+tc.name)
				if out, err := cmd.CombinedOutput(); err != nil {
					t.Fatalf("isolated proxy matching: %v\n%s", err, out)
				}
				return
			}
			t.Setenv("XDG_CONFIG_HOME", t.TempDir())
			for _, key := range []string{"HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy", "REQUEST_METHOD"} {
				t.Setenv(key, "")
			}
			const proxy = "http://127.0.0.1:18192"
			if tc.proxyKey != "" {
				t.Setenv(tc.proxyKey, proxy)
			}
			t.Setenv("NO_PROXY", tc.noProxy)
			sysCache.at, sysCache.p = farFuture, Proxy{URL: "http://127.0.0.1:18191"}
			t.Cleanup(func() { sysCache.at, sysCache.p = zero, Proxy{} })
			u, err := url.Parse(tc.target)
			if err != nil {
				t.Fatal(err)
			}
			got, err := For(u)
			if err != nil {
				t.Fatal(err)
			}
			if tc.wantProxy {
				if got == nil || got.String() != proxy {
					t.Fatalf("%s with NO_PROXY=%s selected %v, want environment proxy %s", tc.target, tc.noProxy, got, proxy)
				}
			} else if got != nil {
				t.Fatalf("%s matching NO_PROXY=%s selected %s, want direct", tc.target, tc.noProxy, got)
			}
		})
	}
}
