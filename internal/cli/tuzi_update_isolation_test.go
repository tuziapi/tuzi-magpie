package cli

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/yetone/magpie/internal/gateway"
	"github.com/yetone/magpie/internal/product"
)

// An update may target a gateway port shared with another installation.
// Discovery must establish this distribution before any mutating request.
func TestTuziUpdateRestartsOnlyItsOwnDistribution(t *testing.T) {
	const own = `{"name":"magpie","distribution":"tuzi-magpie"}`
	for _, tc := range []struct {
		name, body string
		status     int
		want       int32
	}{
		{"this distribution", own, 200, 1},
		{"original Magpie", `{"name":"magpie","version":"0.1.9999"}`, 200, 0},
		{"another distribution", `{"name":"magpie","distribution":"other"}`, 200, 0},
		{"another service", `{"name":"other","distribution":"tuzi-magpie"}`, 200, 0},
		{"missing identity", `{}`, 200, 0},
		{"malformed identity", own + `broken`, 200, 0},
		{"another JSON value", own + `{}`, 200, 0},
		{"oversized identity", own + strings.Repeat(" ", 64<<10), 200, 0},
		{"failed discovery", own, 503, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var posts atomic.Int32
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method == http.MethodGet && r.URL.Path == "/" {
					w.WriteHeader(tc.status)
					io.WriteString(w, tc.body)
					return
				}
				if r.Method == http.MethodPost && r.URL.Path == gateway.RestartPath {
					posts.Add(1)
					io.WriteString(w, `{"state":"restarting","version":"0.1.1"}`)
					return
				}
				http.NotFound(w, r)
			}))
			defer srv.Close()
			got := restartRunning(srv.URL, "0.1.2")
			if posts.Load() != tc.want {
				t.Fatalf("restart POSTs = %d, want %d; result %q", posts.Load(), tc.want, got)
			}
			if tc.want == 0 && !strings.Contains(got, "no restart was requested") {
				t.Fatalf("unverified gateway was not reported: %q", got)
			}
		})
	}
}

func TestTuziUpdateDoesNotFollowIdentityOrRestartRedirects(t *testing.T) {
	var reached atomic.Int32
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reached.Add(1)
		io.WriteString(w, `{"name":"magpie","distribution":"tuzi-magpie"}`)
	}))
	defer target.Close()
	for _, route := range []string{"/", gateway.RestartPath} {
		t.Run(route, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == route {
					http.Redirect(w, r, target.URL, http.StatusTemporaryRedirect)
					return
				}
				io.WriteString(w, `{"name":"magpie","distribution":"tuzi-magpie"}`)
			}))
			defer srv.Close()
			restartRunning(srv.URL, "0.1.2")
			if reached.Load() != 0 {
				t.Fatalf("followed %s redirect to another service", route)
			}
		})
	}
}

// Execute only the suggested ln command, against temporary files: its
// target must be the delivered executable, including quoted bundle paths.
func TestTuziStaleCLIAdviceLinksTheActualBundleExecutable(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("the copied macOS CLI advice uses a POSIX shell")
	}
	dir := t.TempDir()
	app := filepath.Join(dir, "Tuzi's app $safe", product.Name+".app")
	binary := filepath.Join(app, "Contents", "MacOS", product.Name)
	if err := os.MkdirAll(filepath.Dir(binary), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(binary, []byte("synthetic executable"), 0o700); err != nil {
		t.Fatal(err)
	}
	stale := filepath.Join(dir, "old CLI's $safe")
	if err := os.WriteFile(stale, []byte("old copy"), 0o700); err != nil {
		t.Fatal(err)
	}
	advice := staleCLIAdvice(app, stale)
	_, command, ok := strings.Cut(advice, "or link it: ")
	if !ok || !strings.HasPrefix(command, "ln -sf ") {
		t.Fatalf("no link command: %q", advice)
	}
	if out, err := exec.Command("/bin/sh", "-c", command).CombinedOutput(); err != nil {
		t.Fatalf("link command: %v\n%s", err, out)
	}
	if linked, err := os.Readlink(stale); err != nil || linked != binary {
		t.Fatalf("linked %q (%v), want actual bundle executable %q", linked, err, binary)
	}
	if got, err := os.ReadFile(stale); err != nil || string(got) != "synthetic executable" {
		t.Fatalf("linked executable: %q (%v)", got, err)
	}
}
