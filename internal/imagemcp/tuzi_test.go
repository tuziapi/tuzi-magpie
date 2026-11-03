package imagemcp

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/yetone/magpie/internal/gateway"
	"github.com/yetone/magpie/internal/provider"
	"github.com/yetone/magpie/internal/settings"
)

// The existing stdio generate_image tool talks to the actual guarded gateway,
// then to a synthetic Coding images API, and saves both generated and edited
// images in the caller's isolated project. No replacement tool is needed.
func TestTuziImageToolSavesThroughRealGateway(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	t.Setenv("XDG_CACHE_HOME", t.TempDir())
	const fixture = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="
	image, _ := base64.StdEncoding.DecodeString(fixture)
	var mu sync.Mutex
	var paths []string
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.Copy(io.Discard, r.Body)
		mu.Lock()
		paths = append(paths, r.URL.Path)
		mu.Unlock()
		if r.Header.Get("Authorization") != "Bearer synthetic-coding-image" {
			t.Error("wrong model key")
			w.WriteHeader(401)
			return
		}
		if r.URL.Path != "/coding/images/generations" && r.URL.Path != "/coding/images/edits" {
			t.Errorf("unexpected route %s", r.URL.Path)
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"created":1,"data":[{"b64_json":%q}]}`, fixture)
	}))
	defer up.Close()
	p, err := provider.FromPreset(provider.TuziCodingPreset)
	if err != nil {
		t.Fatal(err)
	}
	p.Responses = up.URL + "/coding"
	p.Key = "synthetic-coding-image"
	if err := provider.Save(p); err != nil {
		t.Fatal(err)
	}
	st := settings.Load()
	st.ImageGen = p.ID + "/gpt-image-2"
	if err := settings.Save(st); err != nil {
		t.Fatal(err)
	}
	project := t.TempDir()
	c := start(t, gateway.New().Front(), project)
	c.call("initialize", map[string]any{"protocolVersion": "2025-06-18", "capabilities": map[string]any{"roots": map[string]any{}}, "clientInfo": map[string]any{"name": "synthetic-cli", "version": "1"}})
	for _, edit := range []bool{false, true} {
		args := map[string]any{"prompt": "fixture image", "model": p.ID + "/gpt-image-2", "path": "result.png"}
		if edit {
			args["reference_images"] = []string{"result.png"}
			args["path"] = "edited.png"
		}
		r := c.call("tools/call", map[string]any{"name": "generate_image", "arguments": args})
		if r["isError"] == true || !strings.Contains(text(r), project) {
			t.Fatalf("tool result: %v", r)
		}
		b, err := os.ReadFile(filepath.Join(project, args["path"].(string)))
		if err != nil || !bytes.Equal(b, image) {
			t.Fatalf("saved image: %v", err)
		}
	}
	mu.Lock()
	defer mu.Unlock()
	if strings.Join(paths, ",") != "/coding/images/generations,/coding/images/edits" {
		t.Fatalf("upstream: %v", paths)
	}
}
