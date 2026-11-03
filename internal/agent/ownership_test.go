package agent

import (
	"context"
	"github.com/yetone/magpie/internal/filememo"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	satomic "sync/atomic"
	"testing"
	"time"

	"github.com/yetone/magpie/internal/provider"
)

func TestTuziStartupLeavesOriginalAgentsAlone(t *testing.T) {
	home := syncHome(t)
	// No tuzi account/provider/state is needed to protect original Magpie.
	if err := os.RemoveAll(filepath.Dir(provider.Path())); err != nil {
		t.Fatal(err)
	}
	files := map[string]string{
		".codex/config.toml":                                "model_provider = \"magpie\"\nmodel = \"relay/glm-4.6\"\nmodel_catalog_json = \"magpie-models.json\"\n[model_providers.magpie]\nbase_url = \"http://127.0.0.1:3425/v1\"\nwire_api = \"responses\"\n",
		".codex/magpie-models.json":                         "{\"models\":[{\"slug\":\"original-model\"}]}\n",
		".codex/sessions/2026/10/30/rollout-original.jsonl": `{"timestamp":"2026-10-30T07:05:40.551Z","type":"response_item","payload":{"type":"reasoning","id":"rs_18b3f2a9c1d2e3f40000002a","summary":[],"encrypted_content":null}}` + "\n",
		".codex/magpie-desktop-models.json":                 "{\"models\":[]}\n",
		".claude/settings.json":                             `{"model":"relay/glm-4.6","env":{"ANTHROPIC_BASE_URL":"http://127.0.0.1:3425","ANTHROPIC_AUTH_TOKEN":"magpie"}}`,
		".pi/agent/settings.json":                           `{"defaultProvider":"magpie","defaultModel":"relay/glm-4.6"}`,
		".pi/agent/models.json":                             `{"providers":{"magpie":{"baseUrl":"http://127.0.0.1:3425/v1","api":"openai-completions","models":[{"id":"relay/glm-4.6"}]}}}`,
		".config/opencode/opencode.json":                    `{"model":"dial/relay/glm-4.6","provider":{"dial":{"name":"Original","options":{"baseURL":"http://127.0.0.1:3425/v1"}}}}`,
	}
	for path, body := range files {
		writeFile(t, filepath.Join(home, path), body)
	}
	before := agentTree(t, home, files)
	RenameLegacy()
	MoveCursorEfforts()
	MoveAntigravityEfforts()
	MoveOffAccountIDs()
	SyncCatalog()
	for _, a := range All() {
		if a.Wired() {
			t.Errorf("unowned %s reported wired", a.ID)
		}
	}
	if _, err := EndCodexFailover(); err != nil {
		t.Fatal(err)
	}
	oldPIDs := codexPIDs
	codexPIDs = func(context.Context) []int { t.Error("unowned Codex processes inspected"); return nil }
	t.Cleanup(func() { codexPIDs = oldPIDs })
	if err := RelayOpenCodex(); err != nil {
		t.Fatal(err)
	}
	oldKeep := keepCodexDaemon
	keepCodexDaemon = func(context.Context, string, time.Time) provider.CodexDaemonCheck {
		t.Error("unowned Codex daemon inspected")
		return provider.CodexDaemonCheck{}
	}
	t.Cleanup(func() { keepCodexDaemon = oldKeep })
	codexDaemonCheck(filepath.Join(home, ".codex/config.toml"))
	PortCodexRollouts(time.Second)
	var rounds dshRounds
	rounds.once()
	if got := agentTree(t, home, files); !reflect.DeepEqual(before, got) {
		t.Errorf("startup changed original agent files\nbefore: %#v\nafter: %#v", before, got)
	}
}

func agentTree(t *testing.T, home string, files map[string]string) map[string]string {
	t.Helper()
	out := map[string]string{}
	roots := map[string]bool{}
	for path := range files {
		roots[filepath.Dir(filepath.Join(home, path))] = true
	}
	for dir := range roots {
		err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			b, err := os.ReadFile(path)
			out[path] = string(b)
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	return out
}

func TestTuziOwnershipRejectsMalformedRecords(t *testing.T) {
	syncHome(t)
	for _, tc := range []struct{ name, path, body string }{
		{"partial applied", appliedPath(), `{"codex":{"at":"2026-11-03T00:00:00Z","fields":{"model":"relay/glm-4.6"}},"broken":false}`},
		{"partial stash", stashPath(), `{"codex.connect.was":"{}","broken":false}`},
		{"unrelated bookkeeping", stashPath(), `{"codex.started":"previous-process"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			os.Remove(appliedPath())
			os.Remove(stashPath())
			writeFile(t, tc.path, tc.body)
			if managedAgent("codex") {
				t.Fatal("untrusted record claimed config")
			}
		})
	}
}

func TestTuziExplicitApplyPreservesOriginalCodex(t *testing.T) {
	home := syncHome(t)
	path := filepath.Join(home, ".codex/config.toml")
	original := "model_provider = \"magpie\"\nmodel = \"original-model\"\nmodel_catalog_json = \"magpie-models.json\"\n[model_providers.magpie]\nbase_url = \"http://127.0.0.1:3425/v1\"\nwire_api = \"responses\"\n"
	writeFile(t, path, original)
	catalog := filepath.Join(home, ".codex/magpie-models.json")
	writeFile(t, catalog, "original catalog bytes")
	a := codex(home)
	if err := a.Apply("model", "relay/glm-4.6"); err != nil {
		t.Fatal(err)
	}
	if !managedAgent("codex") || !a.Wired() {
		t.Fatal("explicit Apply did not claim agent")
	}
	SyncCatalog()
	if got := readFile(catalog); got != "original catalog bytes" {
		t.Fatal("original Magpie catalog overwritten")
	}
	backup := filepath.Join(filepath.Dir(provider.Path()), "agent-originals/codex.config")
	if got := readFile(backup); got != original {
		t.Fatalf("backup mismatch: %q", got)
	}
	if _, err := os.Stat(filepath.Join(home, ".codex/tuzi-magpie-models.json")); err != nil {
		t.Fatal(err)
	}
	if err := a.Disconnect(); err != nil {
		t.Fatal(err)
	}
	if got := readFile(backup); got != original {
		t.Fatal("Disconnect lost original backup")
	}
}

func TestTuziBackupFailurePreventsExplicitWrites(t *testing.T) {
	for _, operation := range []string{"apply", "connect"} {
		t.Run(operation, func(t *testing.T) {
			home := syncHome(t)
			path := filepath.Join(home, ".codex/config.toml")
			original := "model = \"original\"\n"
			writeFile(t, path, original)
			backupDir := filepath.Join(filepath.Dir(provider.Path()), "agent-originals")
			writeFile(t, backupDir, "not a directory")
			a := codex(home)
			var err error
			if operation == "apply" {
				err = a.Apply("model", "relay/glm-4.6")
			} else {
				_, err = a.ConnectHow()
			}
			if err == nil {
				t.Fatal("failed backup allowed operation")
			}
			if readFile(path) != original {
				t.Fatal("failed backup modified agent config")
			}
			if managedAgent(a.ID) {
				t.Fatal("failed backup claimed agent")
			}
		})
	}
}

func TestTuziDaemonLoopIgnoresUnownedCodex(t *testing.T) {
	home := syncHome(t)
	writeFile(t, filepath.Join(home, ".codex/config.toml"), "model_provider = \"magpie\"\n")
	was := daemonCheck
	var looks satomic.Int32
	daemonCheck = func(string) provider.CodexDaemonCheck { looks.Add(1); return provider.CodexDaemonCheck{} }
	defer func() { daemonCheck = was }()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { KeepCodexDaemonCurrent(ctx); close(done) }()
	// Several write notifications give the loop opportunities to observe the
	// unowned config; cancellation joins it before the spy is restored.
	for i := 0; i < 8; i++ {
		filememo.Forget()
		time.Sleep(10 * time.Millisecond)
	}
	cancel()
	<-done
	if looks.Load() != 0 {
		t.Fatal("unowned daemon was maintained")
	}
	// The same loop must become active after explicit connection evidence.
	setUpInMagpie("codex")
	ctx, cancel = context.WithCancel(context.Background())
	done = make(chan struct{})
	go func() { KeepCodexDaemonCurrent(ctx); close(done) }()
	defer func() { cancel(); <-done }()
	for end := time.Now().Add(5 * time.Second); looks.Load() == 0; time.Sleep(10 * time.Millisecond) {
		if time.Now().After(end) {
			t.Fatal("owned Codex was not maintained")
		}
		filememo.Forget()
	}
}

// managedCodexHome models a config installed by this distribution, as the
// existing maintenance tests require. Empty-state isolation uses syncHome.
func managedCodexHome(t *testing.T, auth, config string) (string, func() string) {
	t.Helper()
	home, read := codexHome(t, auth, config)
	setUpInMagpie("codex")
	return home, read
}

func managedDshRouteHome(t *testing.T) (string, string, string) {
	t.Helper()
	home, dir, web := dshRouteHome(t)
	setUpInMagpie("dsh")
	return home, dir, web
}

func TestTuziBackupIsPrivateAndDoesNotReplaceFirstOriginal(t *testing.T) {
	home := syncHome(t)
	path := filepath.Join(home, ".codex/config.toml")
	writeFile(t, path, "first original")
	a := codex(home)
	if err := a.keepOriginal(); err != nil {
		t.Fatal(err)
	}
	backup := filepath.Join(filepath.Dir(provider.Path()), "agent-originals/codex.config")
	fi, err := os.Stat(backup)
	if err != nil {
		t.Fatal(err)
	}
	if runtime.GOOS != "windows" && fi.Mode().Perm() != 0600 {
		t.Fatalf("backup permissions %v", fi.Mode())
	}
	writeFile(t, path, "second original")
	if err := a.keepOriginal(); err != nil {
		t.Fatal(err)
	}
	if readFile(backup) != "first original" {
		t.Fatal("first backup overwritten")
	}
	if runtime.GOOS != "windows" {
		if err := os.Chmod(backup, 0644); err != nil {
			t.Fatal(err)
		}
		if err := a.keepOriginal(); err == nil {
			t.Fatal("public backup accepted")
		}
	}
	files, err := filepath.Glob(filepath.Join(filepath.Dir(backup), ".original-*"))
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 0 {
		t.Fatalf("temporary backups left: %v", files)
	}
}

func TestTuziClaudeFollowLeavesOriginalConfigAlone(t *testing.T) {
	home := syncHome(t)
	a := claude(home)
	body := `{"model":"relay/glm-4.6","env":{"ANTHROPIC_BASE_URL":"http://127.0.0.1:3435","ANTHROPIC_AUTH_TOKEN":"magpie","ANTHROPIC_MODEL":"relay/glm-4.6"}}`
	writeFile(t, a.Path, body)
	if err := a.Follow(); err != nil {
		t.Fatal(err)
	}
	if readFile(a.Path) != body {
		t.Fatal("status polling modified unowned Claude config")
	}
}

func TestTuziUnownedRolloutsStayUntouched(t *testing.T) {
	home := syncHome(t)
	dir := filepath.Join(home, ".codex")
	if err := os.MkdirAll(filepath.Join(dir, "thread-writer-locks"), 0755); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "sessions", "2026", "10", "30", "rollout-2026-10-30T15-05-20-01a15820-ff81-7840-bb3f-e18771c53aa8.jsonl")
	line := `{"timestamp":"2026-10-30T07:05:40.551Z","type":"response_item","payload":{"type":"reasoning","id":"rs_18b3f2a9c1d2e3f40000002a","summary":[{"type":"summary_text","text":"synthetic original thread"}],"encrypted_content":null}}` + "\n"
	writeFile(t, path, line)
	old := time.Now().Add(-time.Hour)
	if err := os.Chtimes(path, old, old); err != nil {
		t.Fatal(err)
	}
	portCodexHome(dir, time.Second, true)
	if readFile(path) != line {
		t.Fatal("unowned Codex rollout was rewritten")
	}
	// The same eligible thread becomes portable after explicit ownership.
	setUpInMagpie("codex")
	portCodexHome(dir, time.Second, true)
	if !strings.Contains(readFile(path), `"type":"magpie_reasoning"`) {
		t.Fatal("owned rollout was not made portable")
	}
}
