package gui

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/yetone/magpie/internal/testenv"
	"github.com/yetone/magpie/internal/tuziaccount"
)

func TestTuziAccountRequiresNativeTransportNotHeaders(t *testing.T) {
	testenv.SetHome(t, t.TempDir())
	tuziAccountOnce = sync.Once{}
	tuziAccount = nil
	t.Cleanup(func() { tuziAccountOnce = sync.Once{}; tuziAccount = nil })
	mux := http.NewServeMux()
	tuziAccountRoutes(mux, folderOnly{})
	cases := []struct {
		name                              string
		native                            bool
		host, origin, auth, referer, site string
		code                              int
	}{
		{"native", true, "localhost", "wails://localhost", "", "", "", 200},
		{"network forged window", false, "localhost", "wails://localhost", "", "", "", 403},
		{"gateway key", true, "localhost", "", "Bearer synthetic-gateway-key", "", "", 403},
		{"opaque plugin", true, "localhost", "null", "", "", "", 403},
		{"cross origin", true, "localhost", "https://evil.test", "", "", "", 403},
		{"rebound host", true, "evil.test", "", "", "", "", 403},
		{"plugin referer", true, "localhost", "", "", "wails://localhost/_magpie/plugin/fixture/index.html", "", 403},
		{"cross site", true, "localhost", "", "", "", "cross-site", 403},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := httptest.NewRequest("GET", "/api/tuzi/state", nil)
			r.Host = c.host
			r.Header.Set("Origin", c.origin)
			r.Header.Set("Authorization", c.auth)
			r.Header.Set("Referer", c.referer)
			r.Header.Set("Sec-Fetch-Site", c.site)
			r.Header.Set("X-Wails-Window-Id", "1")
			if c.native {
				r = r.WithContext(context.WithValue(r.Context(), windowSchemeKey{}, "wails"))
			}
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			if w.Code != c.code {
				t.Fatalf("code %d: %s", w.Code, w.Body)
			}
			if w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("cacheable")
			}
		})
	}
	web := http.NewServeMux()
	tuziAccountRoutes(web, webHost{})
	r := httptest.NewRequest("GET", "/api/tuzi/state", nil)
	w := httptest.NewRecorder()
	ownWindow(web).ServeHTTP(w, r)
	if w.Code != 404 {
		t.Fatal("Web registered account routes")
	}
}
func TestTuziAccountRejectsExtraFieldsBeforeOpening(t *testing.T) {
	mux := http.NewServeMux()
	tuziAccountRoutes(mux, folderOnly{})
	for _, body := range []string{`{"target":"token","url":"https://evil.test"}`, `{"target":"unknown"}`, `{"target":"token"} {}`} {
		r := httptest.NewRequest("POST", "/api/tuzi/open", strings.NewReader(body))
		r.Host = "localhost"
		r.Header.Set("Content-Type", "application/json")
		r = r.WithContext(context.WithValue(r.Context(), windowSchemeKey{}, "wails"))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != 400 {
			t.Fatalf("accepted invalid body: %d %s", w.Code, body)
		}
	}
}
func TestTuziWebTargetsHaveNoCredentialsOrCallerURL(t *testing.T) {
	for _, target := range []string{"token", "topup", "redemption", "personal", "coding", "gaccode"} {
		u, ok := tuziaccount.WebURL(target)
		if !ok || strings.Contains(u, "token=") || strings.Contains(u, "key=") {
			t.Fatalf("unsafe target %s", target)
		}
	}
	if _, ok := tuziaccount.WebURL("https://evil.test"); ok {
		t.Fatal("arbitrary target allowed")
	}
}
