package gateway

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/yetone/magpie/internal/catalog"
	"github.com/yetone/magpie/internal/provider"
	"github.com/yetone/magpie/internal/settings"
)

func TestTuziImagesUseExistingGatewayAndMCP(t *testing.T) {
	fresh(t)
	// A fixed one-pixel PNG, never produced by a paid model.
	const fixturePNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="
	image, _ := base64.StdEncoding.DecodeString(fixturePNG)
	for _, id := range []string{provider.TuziPreset, provider.TuziCodingPreset} {
		t.Run(id, func(t *testing.T) {
			fresh(t)
			var mu sync.Mutex
			var paths []string
			hold := make(chan struct{})
			var release sync.Once
			base := "/v1"
			if id == provider.TuziCodingPreset {
				base = "/coding"
			}
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				b, _ := io.ReadAll(r.Body)
				mu.Lock()
				paths = append(paths, r.URL.Path)
				mu.Unlock()
				if r.Header.Get("Authorization") != "Bearer synthetic-image-key" {
					t.Error("wrong image credential")
					w.WriteHeader(401)
					return
				}
				if r.URL.Path != base+"/images/generations" && r.URL.Path != base+"/images/edits" {
					t.Errorf("wrong image path %s", r.URL.Path)
					http.NotFound(w, r)
					return
				}
				if r.URL.Path == base+"/images/edits" {
					r.Body = io.NopCloser(bytes.NewReader(b))
					if err := r.ParseMultipartForm(1 << 20); err != nil {
						t.Error(err)
						w.WriteHeader(400)
						return
					}
					defer r.MultipartForm.RemoveAll()
					if r.FormValue("model") != "gpt-image-2" || len(r.MultipartForm.File["image"]) != 1 {
						t.Error("edit model or reference image lost")
					}
				}
				if strings.Contains(string(b), "slow-fixture") {
					select {
					case <-hold:
					case <-r.Context().Done():
						return
					}
				}
				w.Header().Set("Content-Type", "application/json")
				if strings.Contains(string(b), "refused-fixture") {
					w.WriteHeader(400)
					io.WriteString(w, `{"error":{"message":"synthetic image refusal","type":"invalid_request_error"}}`)
					return
				}
				fmt.Fprintf(w, `{"created":1,"data":[{"b64_json":%q}]}`, fixturePNG)
			}))
			defer up.Close()
			p, err := provider.FromPreset(id)
			if err != nil {
				t.Fatal(err)
			}
			p.Key = "synthetic-image-key"
			p.Chat = ""
			p.Anthropic = ""
			p.Gemini = ""
			p.Responses = up.URL + base
			if err := provider.Save(p); err != nil {
				t.Fatal(err)
			}
			if id == provider.TuziPreset {
				if err := catalog.SaveLive(p.ID, p.Responses, []catalog.Model{{ID: "gpt-image-2", Draws: true}, {ID: "fixture-text"}}); err != nil {
					t.Fatal(err)
				}
			}
			st := settings.Load()
			st.ImageGen = id + "/gpt-image-2"
			if err := settings.Save(st); err != nil {
				t.Fatal(err)
			}
			s := New()
			defer func() {
				release.Do(func() { close(hold) })
				s.imageStore.running.Wait()
			}()
			front := httptest.NewServer(s.Front())
			defer func() {
				release.Do(func() { close(hold) })
				front.Close()
			}()
			client := &http.Client{Timeout: 5 * time.Second}
			call := func(name string, args map[string]any) imageReply {
				t.Helper()
				res, err := client.Post(front.URL+ImageMCPPath, "application/json", strings.NewReader(imageToolCall(name, args)))
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				b, _ := io.ReadAll(res.Body)
				var result imageReply
				if err = json.Unmarshal(b, &result); err != nil || res.StatusCode != 200 {
					t.Fatalf("MCP: %d %s %v", res.StatusCode, b, err)
				}
				return result
			}
			check := func(result imageReply) {
				t.Helper()
				if result.Result.IsError || result.Error != nil || len(result.Result.Content) < 2 {
					t.Fatalf("image MCP: %+v", result)
				}
				if result.Result.Content[1].Data != fixturePNG {
					t.Fatal("image bytes changed")
				}
				urls := urlsIn(result.Result.Content[0].Text)
				if len(urls) != 1 {
					t.Fatalf("no result URL: %+v", result)
				}
				res, err := client.Get(urls[0])
				if err != nil {
					t.Fatal(err)
				}
				got, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 || !bytes.Equal(got, image) {
					t.Fatal("saved gateway image cannot be retrieved")
				}
			}
			check(call(GenerateImageTool, map[string]any{"prompt": "fixture drawing"}))
			check(call(GenerateImageTool, map[string]any{"prompt": "fixture edit", "reference_images": []string{"data:image/png;base64," + fixturePNG}}))
			failed := call(GenerateImageTool, map[string]any{"prompt": "refused-fixture"})
			if !failed.Result.IsError || !strings.Contains(failed.Result.Content[0].Text, "synthetic image refusal") {
				t.Fatalf("failure concealed: %+v", failed)
			}
			previous := imageMCPWithin
			imageMCPWithin = 5 * time.Millisecond
			defer func() { imageMCPWithin = previous }()
			pending := call(GenerateImageTool, map[string]any{"prompt": "slow-fixture"})
			var job string
			if json.Unmarshal(pending.Result.Meta[PendingMeta], &job) != nil || job == "" {
				t.Fatalf("missing pending job: %+v", pending)
			}
			release.Do(func() { close(hold) })
			imageMCPWithin = 2 * time.Second
			check(call(GenerationResultTool, map[string]any{"id": job}))
			mu.Lock()
			defer mu.Unlock()
			if len(paths) != 4 || paths[0] != base+"/images/generations" || paths[1] != base+"/images/edits" {
				t.Fatalf("unexpected image calls: %v", paths)
			}
		})
	}
}
