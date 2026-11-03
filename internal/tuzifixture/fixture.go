//go:build tuzi_fixture

// Package tuzifixture serves only in-memory synthetic account/model data for
// explicitly tagged local acceptance builds. It performs no outgoing I/O.
package tuzifixture

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const SystemToken = "synthetic-system-token"
const ModelKey = "sk-synthetic-model-key"
const CodexModel = "gpt-5.5"
const ClaudeModel = "claude-sonnet-4-6"
const Answer = "TUZI_CLI_OK"

var Models = []string{CodexModel, ClaudeModel, "gpt-image-2"}

type Fixture struct {
	mu    sync.Mutex
	keys  map[int]map[string]any
	next  int
	paths []string
	calls int
}

func New() *Fixture {
	return &Fixture{keys: map[int]map[string]any{8: newKey(8, "Fixture key")}, next: 9}
}
func newKey(id int, name string) map[string]any {
	return map[string]any{"id": id, "name": name, "key": strings.TrimPrefix(ModelKey, "sk-"), "status": 1, "group": "default", "created_time": time.Now().Unix(), "accessed_time": 0, "expired_time": -1, "remain_quota": 1000000, "used_quota": 0, "unlimited_quota": true, "model_limits_enabled": false, "model_limits": "", "allow_ips": "", "exclude_ips": ""}
}
func (f *Fixture) Snapshot() (paths []string, calls int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string{}, f.paths...), f.calls
}
func (f *Fixture) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	path := r.URL.Path
	f.paths = append(f.paths, r.Method+" "+path)
	w.Header().Set("Content-Type", "application/json")
	send := func(v any) { _ = json.NewEncoder(w).Encode(v) }
	reply := func(v any) { send(map[string]any{"success": true, "message": "", "data": v}) }
	fail := func(status int, code string) {
		w.WriteHeader(status)
		send(map[string]any{"success": false, "error": map[string]any{"code": code}, "message": code})
	}
	if strings.HasPrefix(path, "/api/") && path != "/api/status" && (r.Header.Get("Authorization") != "Bearer "+SystemToken || path != "/api/user/self/bootstrap" && r.Header.Get("New-Api-User") != "7") {
		fail(401, "invalid_token")
		return
	}
	if (strings.HasPrefix(path, "/v1/") || strings.HasPrefix(path, "/coding/")) && (r.Header.Get("Authorization") != "Bearer "+ModelKey || r.Header.Get("New-Api-User") != "") {
		fail(401, "invalid_model_key")
		return
	}
	var body map[string]any
	if r.Method != "GET" {
		_ = json.NewDecoder(io.LimitReader(r.Body, 4<<20)).Decode(&body)
	}
	switch path {
	case "/api/user/self/bootstrap", "/api/user/self":
		reply(map[string]any{"id": 7, "status": 1, "username": "synthetic", "display_name": "Synthetic local account", "group": "default", "role": 1, "quota": 50000000, "used_quota": 1250000, "request_count": 7, "email": "fixture@example.invalid", "settings": "{}"})
	case "/api/status":
		reply(map[string]any{"quota_per_unit": 500000, "usd_exchange_rate": 7.2, "quota_display_type": "CNY", "custom_currency_symbol": "¥", "custom_currency_exchange_rate": 7.2, "display_in_currency": true, "display_token_stat_enabled": true, "enable_drawing": true})
	case "/api/token/group":
		reply([]any{map[string]any{"key": "Default", "value": "default"}, map[string]any{"key": "Automatic", "value": "auto"}})
	case "/api/token/":
		if r.Method == "POST" {
			id := f.next
			f.next++
			k := newKey(id, fmt.Sprint(body["name"]))
			for name, v := range body {
				k[name] = v
			}
			f.keys[id] = k
			reply(map[string]any{"id": id, "key": k["key"]})
			return
		}
		items := []any{}
		keyword := strings.ToLower(r.URL.Query().Get("keyword"))
		for _, k := range f.keys {
			if keyword == "" || strings.Contains(strings.ToLower(fmt.Sprint(k["name"])), keyword) {
				items = append(items, k)
			}
		}
		page, _ := strconv.Atoi(r.URL.Query().Get("p"))
		if page < 1 {
			page = 1
		}
		size, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
		if size < 1 {
			size = 20
		}
		sort.Slice(items, func(i, j int) bool {
			return items[i].(map[string]any)["id"].(int) < items[j].(map[string]any)["id"].(int)
		})
		total := len(items)
		start := min((page-1)*size, total)
		items = items[start:min(start+size, total)]
		reply(map[string]any{"page": page, "page_size": size, "total": total, "items": items})
	case "/v1/models":
		items := []any{}
		for _, name := range Models {
			items = append(items, map[string]any{"id": name, "object": "model", "supported_endpoint_types": []string{"openai-response", "anthropic", "chat", "gemini"}})
		}
		send(map[string]any{"object": "list", "data": items})
	case "/api/pricing/models":
		names := r.URL.Query()["models"]
		if len(names) == 0 {
			names = Models
		}
		items := []any{}
		for _, name := range names {
			items = append(items, map[string]any{"model_name": name, "enable_groups": []string{"default"}, "supported_endpoint_types": []string{"openai-response", "anthropic", "chat", "gemini"}, "endpoints": map[string]any{"openai-response": map[string]any{"path": "/v1/responses", "method": "POST"}, "anthropic": map[string]any{"path": "/v1/messages", "method": "POST"}}, "quota_type": 0, "model_ratio": 1, "completion_ratio": 2, "model_price": 0, "vendor_id": 1})
		}
		send(map[string]any{"success": true, "data": items, "snapshot_id": "synthetic-snapshot", "snapshot_refreshed": false, "pagination": map[string]any{"page": 1, "page_size": 100, "total": len(items), "has_more": false}, "meta": map[string]any{"group_ratio": map[string]any{"default": 1}, "usable_group": map[string]any{"default": "Default"}}})
	case "/v1/responses", "/v1/messages":
		f.calls++
		protocol := "responses"
		if path == "/v1/messages" {
			protocol = "anthropic"
		}
		model := fmt.Sprint(body["model"])
		if body["stream"] == true {
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = io.WriteString(w, Stream(protocol, model))
			return
		}
		if protocol == "anthropic" {
			send(map[string]any{"id": "msg_fixture", "type": "message", "role": "assistant", "model": model, "content": []any{map[string]any{"type": "text", "text": Answer}}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 1, "output_tokens": 1}})
		} else {
			send(map[string]any{"id": "resp_fixture", "object": "response", "status": "completed", "output": []any{map[string]any{"id": "msg_fixture", "type": "message", "role": "assistant", "content": []any{map[string]any{"type": "output_text", "text": Answer}}}}})
		}
	case "/v1/images/generations", "/v1/images/edits", "/coding/images/generations", "/coding/images/edits":
		f.calls++
		send(map[string]any{"created": time.Now().Unix(), "data": []any{map[string]any{"b64_json": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="}}})
	case "/v1/messages/count_tokens":
		send(map[string]any{"input_tokens": 1})
	case "/api/log/self":
		reply(map[string]any{"page": 1, "page_size": 20, "total": 1, "items": []any{map[string]any{"id": 1, "type": 2, "created_at": time.Now().Unix(), "model_name": CodexModel, "token_name": "Fixture key", "request_id": "fixture-request", "quota": 100, "prompt_tokens": 1, "completion_tokens": 1, "is_stream": true, "other": "{}"}}})
	case "/api/log/self/stat":
		summary := map[string]any{"logs_available": true, "record_count": 1, "request_count": 1, "error_count": 0, "quota": 100, "prompt_tokens": 1, "completion_tokens": 1, "refund_quota": 0, "coverage": "recorded_logs_only"}
		if r.URL.Query().Get("summary") == "true" && r.URL.Query().Get("statistics") != "true" {
			reply(summary)
		} else {
			out := map[string]any{"summary": summary, "trend": []any{}, "by_model": []any{}, "by_error": []any{}}
			for k, v := range summary {
				out[k] = v
			}
			reply(out)
		}
	case "/api/data/consumption_stats":
		reply(map[string]any{"chart": []any{map[string]any{"bucket_start": time.Now().Add(-time.Hour).Unix(), "bucket_end": time.Now().Unix(), "model_name": CodexModel, "call_count": 1, "quota": 100, "prompt_tokens": 1, "completion_tokens": 1}}, "table": []any{map[string]any{"model_name": CodexModel, "call_count": 1, "quota": 100, "prompt_tokens": 1, "completion_tokens": 1}}})
	case "/api/perf-metrics", "/api/perf-metrics/batch":
		metric := map[string]any{"group": "default", "has_samples": true, "has_ttft": true, "sample_level": "sufficient", "ttft_sample_level": "sufficient", "avg_latency_ms": 120, "avg_ttft_ms": 30, "success_rate": 1, "avg_tps": 25, "latest_sample_ts": time.Now().Unix(), "historical_values": map[string]any{}, "half_hour_series": []any{}}
		if path == "/api/perf-metrics/batch" {
			items := []any{}
			for _, name := range Models {
				items = append(items, map[string]any{"model_name": name, "aggregate": metric, "series_schema": "half_hourly", "groups": []any{metric}})
			}
			reply(items)
		} else {
			reply(map[string]any{"model_name": r.URL.Query().Get("model"), "aggregate": metric, "series_schema": "half_hourly", "groups": []any{metric}})
		}
	default:
		if strings.HasPrefix(path, "/api/token/") {
			rest := strings.TrimPrefix(path, "/api/token/")
			parts := strings.Split(rest, "/")
			id, _ := strconv.Atoi(parts[0])
			k, ok := f.keys[id]
			if !ok {
				fail(404, "not_found")
				return
			}
			if len(parts) == 2 && parts[1] == "key" {
				reply(map[string]any{"key": k["key"]})
				return
			}
			switch r.Method {
			case "GET":
				reply(k)
			case "PATCH":
				for name, v := range body {
					k[name] = v
				}
				reply(k)
			case "DELETE":
				delete(f.keys, id)
				reply(map[string]any{})
			}
			return
		}
		if strings.HasPrefix(path, "/api/log/self/request/") {
			reply([]any{})
			return
		}
		fail(404, "fixture_route_missing")
	}
}
