package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/yetone/magpie/internal/catalog"
	"github.com/yetone/magpie/internal/provider"
)

// The synthetic vendor preserves the preset's paths while replacing only its
// origin. Every request goes through the real listener's Front guards.
func TestTuziPresetGatewayProtocols(t *testing.T) {
	for _, id := range []string{provider.TuziPreset, provider.TuziCodingPreset, provider.GACCodePreset} {
		for _, proto := range []provider.Protocol{provider.Chat, provider.Responses, provider.Anthropic, provider.Gemini} {
			preset, err := provider.FromPreset(id)
			if err != nil {
				t.Fatal(err)
			}
			if preset.Base(proto) == "" {
				continue
			}
			t.Run(id+"/"+string(proto), func(t *testing.T) {
				fresh(t)
				base, _ := url.Parse(preset.Base(proto))
				wantPath := strings.TrimSuffix(base.Path, "/") + map[provider.Protocol]string{provider.Chat: "/chat/completions", provider.Responses: "/responses", provider.Anthropic: "/v1/messages", provider.Gemini: "/models/fixture-model:streamGenerateContent"}[proto]
				var mu sync.Mutex
				var seen []string
				cancelled := make(chan struct{}, 1)
				entered := make(chan struct{}, 1)
				up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					body, _ := io.ReadAll(r.Body)
					mu.Lock()
					seen = append(seen, r.URL.Path)
					mu.Unlock()
					if r.URL.Path != wantPath {
						t.Errorf("asked %s, want %s", r.URL.Path, wantPath)
						http.NotFound(w, r)
						return
					}
					key := "synthetic-" + id
					if proto == provider.Gemini {
						if r.Header.Get("x-goog-api-key") != key || r.Header.Get("Authorization") != "" || r.URL.Query().Get("alt") != "sse" {
							t.Error("Gemini auth or stream query changed")
						}
					} else if r.Header.Get("Authorization") != "Bearer "+key {
						t.Error("model key was lost or mixed")
					}
					if r.Header.Get("New-Api-User") != "" {
						t.Error("account management identity leaked into model request")
					}
					if strings.Contains(string(body), "cancel-fixture") {
						w.Header().Set("Content-Type", "text/event-stream")
						io.WriteString(w, tuziPendingStream(proto))
						w.(http.Flusher).Flush()
						entered <- struct{}{}
						<-r.Context().Done()
						cancelled <- struct{}{}
						return
					}
					var input map[string]any
					_ = json.Unmarshal(body, &input)
					stream, _ := input["stream"].(bool)
					if stream || proto == provider.Gemini {
						w.Header().Set("Content-Type", "text/event-stream")
						io.WriteString(w, tuziStream(proto))
					} else {
						w.Header().Set("Content-Type", "application/json")
						io.WriteString(w, tuziWhole(proto))
					}
				}))
				defer up.Close()
				p := preset
				p.Key = "synthetic-" + id
				p.Models = []string{"fixture-model"}
				for _, field := range []*string{&p.Chat, &p.Responses, &p.Anthropic, &p.Gemini} {
					if *field != "" {
						u, _ := url.Parse(*field)
						*field = up.URL + u.Path
					}
				}
				if err := provider.Save(p); err != nil {
					t.Fatal(err)
				}
				if err := catalog.SaveLive(p.ID, p.Base(proto), []catalog.Model{{ID: "fixture-model", APIs: []string{string(proto)}}}); err != nil {
					t.Fatal(err)
				}
				s := New()
				front := httptest.NewServer(s.Front())
				defer front.Close()
				client := &http.Client{Timeout: 10 * time.Second}
				for _, stream := range []bool{false, true} {
					path, body := tuziRequest(proto, id+"/fixture-model", "fixture hello", stream)
					req, _ := http.NewRequest("POST", front.URL+path, bytes.NewReader(body))
					req.Header.Set("Content-Type", "application/json")
					res, err := client.Do(req)
					if err != nil {
						t.Fatal(err)
					}
					got, _ := io.ReadAll(res.Body)
					res.Body.Close()
					if res.StatusCode != 200 || !strings.Contains(string(got), "fixture_tool") {
						t.Fatalf("stream=%v: %d %s", stream, res.StatusCode, got)
					}
				}
				path, body := tuziRequest(proto, id+"/fixture-model", "cancel-fixture", true)
				ctx, cancel := context.WithCancel(context.Background())
				defer cancel()
				req, _ := http.NewRequestWithContext(ctx, "POST", front.URL+path, bytes.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
				done := make(chan error, 1)
				go func() {
					res, err := client.Do(req)
					if err == nil {
						_, err = io.Copy(io.Discard, res.Body)
						res.Body.Close()
					}
					done <- err
				}()
				select {
				case <-entered:
				case <-time.After(5 * time.Second):
					t.Fatal("cancel fixture did not reach upstream")
				}
				select {
				case <-done:
					t.Fatal("stream ended before cancellation")
				case <-cancelled:
					t.Fatal("upstream closed before cancellation")
				case <-time.After(25 * time.Millisecond):
				}
				cancel()
				select {
				case <-cancelled:
				case <-time.After(5 * time.Second):
					t.Fatal("cancellation did not reach upstream")
				}
				select {
				case <-done:
				case <-time.After(5 * time.Second):
					t.Fatal("cancelled client remained running")
				}
				mu.Lock()
				defer mu.Unlock()
				if len(seen) != 3 {
					t.Fatalf("unexpected retries: %v", seen)
				}
			})
		}
	}
}

func tuziRequest(proto provider.Protocol, model, prompt string, stream bool) (string, []byte) {
	var path string
	var body map[string]any
	switch proto {
	case provider.Chat:
		path = "/v1/chat/completions"
		body = map[string]any{"model": model, "stream": stream, "messages": []any{map[string]any{"role": "user", "content": prompt}}, "tools": []any{map[string]any{"type": "function", "function": map[string]any{"name": "fixture_tool", "parameters": map[string]any{"type": "object"}}}}}
	case provider.Responses:
		path = "/v1/responses"
		body = map[string]any{"model": model, "stream": stream, "input": prompt, "tools": []any{map[string]any{"type": "function", "name": "fixture_tool", "parameters": map[string]any{"type": "object"}}}}
	case provider.Anthropic:
		path = "/v1/messages"
		body = map[string]any{"model": model, "stream": stream, "max_tokens": 64, "messages": []any{map[string]any{"role": "user", "content": prompt}}, "tools": []any{map[string]any{"name": "fixture_tool", "input_schema": map[string]any{"type": "object"}}}}
	case provider.Gemini:
		path = "/v1beta/models/" + model + ":generateContent"
		if stream {
			path = "/v1beta/models/" + model + ":streamGenerateContent?alt=sse"
		}
		body = map[string]any{"contents": []any{map[string]any{"role": "user", "parts": []any{map[string]any{"text": prompt}}}}, "tools": []any{map[string]any{"functionDeclarations": []any{map[string]any{"name": "fixture_tool", "parameters": map[string]any{"type": "object"}}}}}}
	}
	b, _ := json.Marshal(body)
	return path, b
}

func tuziWhole(proto provider.Protocol) string {
	switch proto {
	case provider.Chat:
		return `{"id":"fixture","object":"chat.completion","model":"fixture-model","choices":[{"index":0,"message":{"role":"assistant","content":null,"tool_calls":[{"id":"call_fixture","type":"function","function":{"name":"fixture_tool","arguments":"{}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":1,"completion_tokens":1}}`
	case provider.Responses:
		return `{"id":"resp_fixture","object":"response","model":"fixture-model","status":"completed","output":[{"type":"function_call","id":"fc_fixture","call_id":"call_fixture","name":"fixture_tool","arguments":"{}","status":"completed"}],"usage":{"input_tokens":1,"output_tokens":1}}`
	case provider.Anthropic:
		return `{"id":"msg_fixture","type":"message","role":"assistant","model":"fixture-model","content":[{"type":"tool_use","id":"call_fixture","name":"fixture_tool","input":{}}],"stop_reason":"tool_use","usage":{"input_tokens":1,"output_tokens":1}}`
	}
	return ""
}

func tuziStream(proto provider.Protocol) string {
	switch proto {
	case provider.Chat:
		return "data: " + `{"id":"fixture","object":"chat.completion.chunk","model":"fixture-model","choices":[{"index":0,"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"call_fixture","type":"function","function":{"name":"fixture_tool","arguments":"{}"}}]},"finish_reason":"tool_calls"}]}` + "\n\ndata: [DONE]\n\n"
	case provider.Responses:
		return "event: response.output_item.added\ndata: " + `{"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","id":"fc_fixture","call_id":"call_fixture","name":"fixture_tool","arguments":""}}` + "\n\nevent: response.completed\ndata: " + fmt.Sprintf(`{"type":"response.completed","response":%s}`, tuziWhole(proto)) + "\n\n"
	case provider.Anthropic:
		return "event: message_start\ndata: " + `{"type":"message_start","message":{"id":"msg_fixture","type":"message","role":"assistant","model":"fixture-model","content":[],"usage":{"input_tokens":1,"output_tokens":0}}}` + "\n\nevent: content_block_start\ndata: " + `{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call_fixture","name":"fixture_tool","input":{}}}` + "\n\nevent: content_block_delta\ndata: " + `{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{}"}}` + "\n\nevent: content_block_stop\ndata: " + `{"type":"content_block_stop","index":0}` + "\n\nevent: message_delta\ndata: " + `{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":1}}` + "\n\nevent: message_stop\ndata: " + `{"type":"message_stop"}` + "\n\n"
	case provider.Gemini:
		return "data: " + `{"candidates":[{"content":{"role":"model","parts":[{"functionCall":{"name":"fixture_tool","args":{}}}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":1,"candidatesTokenCount":1}}` + "\n\n"
	}
	return ""
}

// Emit data without an end event, so only cancellation can finish this call.
func tuziPendingStream(proto provider.Protocol) string {
	switch proto {
	case provider.Chat:
		return "data: " + `{"id":"fixture","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"pending"},"finish_reason":null}]}` + "\n\n"
	case provider.Responses:
		return "event: response.output_text.delta\ndata: " + `{"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"pending"}` + "\n\n"
	case provider.Anthropic:
		return strings.Split(tuziStream(proto), "event: content_block_stop")[0]
	case provider.Gemini:
		return "data: " + `{"candidates":[{"content":{"role":"model","parts":[{"text":"pending"}]}}]}` + "\n\n"
	}
	return ""
}
