//go:build !nogui && tuzi_fixture

package gui

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// Synthetic acceptance builds can drive the real native DOM. This hook is
// absent from production builds and never reads a script unless the isolated
// loopback account fixture was explicitly selected.
func tuziFixtureWindow(w *application.WebviewWindow) {
	if os.Getenv("TUZI_MAGPIE_FIXTURE_ORIGIN") == "" {
		return
	}
	path := os.Getenv("TUZI_MAGPIE_FIXTURE_SCRIPT")
	if path == "" || !filepath.IsAbs(path) {
		return
	}
	script, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}
	log.Println("fixture: native window hook registered")
	w.OnWindowEvent(events.Mac.WebViewDidFinishNavigation, func(*application.WindowEvent) { log.Println("fixture: native navigation finished") })
	w.OnWindowEvent(events.Common.WindowRuntimeReady, func(*application.WindowEvent) {
		log.Println("fixture: native runtime ready")
		w.ExecJS(string(script))
	})
}

func tuziFixtureAssets(next http.Handler) http.Handler {
	if os.Getenv("TUZI_MAGPIE_FIXTURE_ORIGIN") == "" {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("fixture: native request %s %s", r.Method, r.URL.Path)
		if r.URL.Path == "/__tuzi-fixture/report" && r.Method == "POST" {
			body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
			report := os.Getenv("TUZI_MAGPIE_FIXTURE_REPORT")
			if err != nil || !json.Valid(body) || !filepath.IsAbs(report) {
				http.Error(w, "invalid fixture report", 400)
				return
			}
			if err := os.WriteFile(report, body, 0600); err != nil {
				http.Error(w, "report failed", 500)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
