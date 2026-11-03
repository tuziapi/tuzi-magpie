//go:build tuzi_fixture && darwin

package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/yetone/magpie/internal/catalog"
	"github.com/yetone/magpie/internal/gateway"
	"github.com/yetone/magpie/internal/proc"
	"github.com/yetone/magpie/internal/provider"
	"github.com/yetone/magpie/internal/testenv"
	"github.com/yetone/magpie/internal/tuziaccount"
	"github.com/yetone/magpie/internal/tuzifixture"
)

// An opt-in acceptance of installed executables, not a fake CLI. The account,
// upstream, HOME, agent settings and every credential are synthetic. macOS's
// inherited sandbox denies off-loopback network and reads of the real home.
func TestTuziInstalledCLIs(t *testing.T) {
	codexPath, claudePath := os.Getenv("TUZI_ACCEPTANCE_CODEX"), os.Getenv("TUZI_ACCEPTANCE_CLAUDE")
	realHome := os.Getenv("TUZI_ACCEPTANCE_REAL_HOME")
	if codexPath == "" || claudePath == "" || realHome == "" {
		t.Skip("requires explicit installed CLI paths and real-home deny boundary")
	}
	if !filepath.IsAbs(realHome) || realHome == "/" {
		t.Fatal("invalid deny boundary")
	}
	for _, path := range []string{codexPath, claudePath} {
		if !filepath.IsAbs(path) {
			t.Fatal("absolute CLI path required")
		}
		if _, err := os.Stat(path); err != nil {
			t.Fatal(err)
		}
	}
	for _, id := range []string{"codex", "claude"} {
		t.Run(id, func(t *testing.T) {
			home := t.TempDir()
			testenv.SetHome(t, home)
			for name, value := range map[string]string{"XDG_CONFIG_HOME": home + "/.config", "XDG_CACHE_HOME": home + "/.cache", "CODEX_HOME": home + "/.codex", "CLAUDE_CONFIG_DIR": home + "/.claude"} {
				t.Setenv(name, value)
			}
			for _, dir := range []string{".codex", ".claude", "project"} {
				if err := os.MkdirAll(filepath.Join(home, dir), 0700); err != nil {
					t.Fatal(err)
				}
			}
			protocol, model := "responses", "gpt-5.5"
			if id == "claude" {
				protocol, model = "anthropic", "claude-sonnet-4-6"
			}
			fixture := tuzifixture.New()
			upstream := httptest.NewServer(fixture)
			defer upstream.Close()
			service, err := tuziaccount.NewFixture(filepath.Join(home, "account.json"), upstream.URL)
			if err != nil {
				t.Fatal(err)
			}
			state := service.Connect(context.Background(), "synthetic-system-token")
			if state.Status != "connected" {
				t.Fatalf("account connect %+v", state)
			}
			out, e := service.AddProvider(context.Background(), tuziaccount.ProviderRequest{Generation: state.Generation, TokenID: "8", Models: []string{model}, Protocol: protocol})
			if e != nil {
				paths, _ := fixture.Snapshot()
				t.Fatalf("AddProvider %v paths=%v", e, paths)
			}
			ps, err := provider.Stored()
			if err != nil || len(ps) != 1 || ps[0].TuziSource == nil {
				t.Fatalf("provider source not saved: %v", err)
			}
			if err := catalog.SaveLive(out.ProviderID, ps[0].Base(provider.Protocol(protocol)), []catalog.Model{{ID: model, APIs: []string{protocol}}}); err != nil {
				t.Fatal(err)
			}
			server := httptest.NewServer(gateway.New().Front())
			defer server.Close()
			t.Setenv("MAGPIE_ADDR", strings.TrimPrefix(server.URL, "http://"))
			a := codex(home)
			path := codexPath
			args := []string{"exec", "--skip-git-repo-check", "--json", "--sandbox", "read-only", "Return exactly TUZI_CLI_OK without using tools."}
			if id == "claude" {
				a = claude(home)
				path = claudePath
				args = []string{"-p", "Return exactly TUZI_CLI_OK without using tools.", "--output-format", "json", "--max-turns", "1", "--tools", ""}
			}
			if err := a.Field("model").Set(out.ProviderID + "/" + model); err != nil {
				t.Fatal(err)
			}
			if !a.Wired() {
				t.Fatal("native Agent wiring not active")
			}
			configPath := filepath.Join(home, ".codex", "config.toml")
			if id == "claude" {
				configPath = filepath.Join(home, ".claude", "settings.json")
			}
			config, err := os.ReadFile(configPath)
			if err != nil || !strings.Contains(string(config), server.URL) || strings.Contains(string(config), tuzifixture.ModelKey) || strings.Contains(string(config), tuzifixture.SystemToken) {
				t.Fatalf("native config does not exclusively target gateway: %v", err)
			}
			// The real user's home is unreadable except for the explicitly selected
			// program installations. No inherited agent or provider secret is passed.
			allowed := []string{filepath.Dir(filepath.Dir(codexPath)), filepath.Dir(claudePath)}
			profile := fmt.Sprintf(`(version 1) (allow default) (deny network*) (allow network* (local ip "localhost:*") (remote ip "localhost:*")) (deny file-read-data (subpath %q)) (deny mach-lookup (global-name "com.apple.securityd") (global-name "com.apple.securityd.xpc"))`, realHome)
			for _, dir := range allowed {
				profile += fmt.Sprintf(` (allow file-read-data (subpath %q))`, dir)
			}
			env := []string{"HOME=" + home, "USERPROFILE=" + home, "PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin", "TMPDIR=" + home, "CODEX_HOME=" + home + "/.codex", "CLAUDE_CONFIG_DIR=" + home + "/.claude", "XDG_CONFIG_HOME=" + home + "/.config", "XDG_CACHE_HOME=" + home + "/.cache", "DISABLE_AUTOUPDATER=1", "DISABLE_TELEMETRY=1", "DISABLE_ERROR_REPORTING=1", "DISABLE_INSTALLATION_CHECKS=1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1", "TERM=dumb"}
			run := func(args ...string) []byte {
				ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
				defer cancel()
				cmd := proc.CommandContext(ctx, "/usr/bin/sandbox-exec", append([]string{"-p", profile, path}, args...)...)
				cmd.Dir = filepath.Join(home, "project")
				cmd.Env = env
				cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
				cmd.Cancel = func() error { return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) }
				b, err := cmd.CombinedOutput()
				if cmd.Process != nil {
					_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
				}
				if err != nil {
					t.Fatalf("%s %v: %v\n%s", id, args, err, b)
				}
				return b
			}
			t.Logf("installed %s: %s", id, strings.TrimSpace(string(run("--version"))))
			result := run(args...)
			answered, completed := false, false
			for _, line := range strings.Split(string(result), "\n") {
				var event map[string]any
				if json.Unmarshal([]byte(line), &event) != nil {
					continue
				}
				if id == "claude" {
					answered = event["result"] == tuzifixture.Answer
					completed = event["is_error"] == false && event["subtype"] == "success"
					continue
				}
				if event["type"] == "item.completed" {
					item, _ := event["item"].(map[string]any)
					if item["type"] == "agent_message" && item["text"] == tuzifixture.Answer {
						answered = true
					}
				}
				if event["type"] == "turn.completed" {
					completed = true
				}
			}
			if !answered || !completed {
				t.Fatalf("no successful final CLI answer: %s", result)
			}
			paths, calls := fixture.Snapshot()
			if calls == 0 {
				t.Fatal("CLI never reached synthetic model through gateway")
			}
			t.Logf("%s account→Provider→native Agent config→installed CLI→gateway→synthetic model PASS; model calls=%d; paths=%v; output=%s", id, calls, paths, result)
		})
	}
}
