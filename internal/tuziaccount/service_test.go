package tuziaccount

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/yetone/magpie/internal/backup"
	"github.com/yetone/magpie/internal/provider"
	"github.com/yetone/magpie/internal/testenv"
)

func TestMain(m *testing.M) { testenv.Main(m) }
func accountTestHome(t *testing.T) {
	d := t.TempDir()
	testenv.SetHome(t, d)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(d, "config"))
	t.Setenv("XDG_CACHE_HOME", filepath.Join(d, "cache"))
}
func reply(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "message": "", "data": data})
}
func syntheticUser(id int) map[string]any {
	return map[string]any{"id": id, "status": 1, "username": "fixture", "display_name": "Fixture", "quota": 9007199254740993, "used_quota": 20, "request_count": 7, "group": "default", "role": 100, "access_token": "must-not-project"}
}
func syntheticKey() map[string]any {
	return map[string]any{"id": 8, "name": "Fixture key", "status": 1, "group": "default", "key": "synthetic-model-secret-0123456789", "created_time": 1, "accessed_time": 2, "expired_time": -1, "remain_quota": 9007199254740993, "used_quota": 0, "unlimited_quota": false, "model_limits_enabled": true, "model_limits": "fixture-1,fixture-2,fixture-3,fixture-4", "allow_ips": "", "exclude_ips": "", "routing_preference": "private"}
}
func fixture(t *testing.T, handler http.HandlerFunc) (*Service, *httptest.Server) {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return newService(filepath.Join(t.TempDir(), "private", "account.json"), server.URL, server.Client()), server
}
func connected(t *testing.T, s *Service) State {
	t.Helper()
	st := s.Connect(context.Background(), "synthetic-system-token-only")
	if st.Status != "connected" {
		t.Fatalf("connect: %+v", st)
	}
	return st
}
func TestTuziConnectRestoreOfflineInvalidAndStorage(t *testing.T) {
	var mode atomic.Int32
	s, server := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/user/self/bootstrap" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		if r.Header.Get("Cookie") != "" {
			t.Error("cookie sent")
		}
		if mode.Load() == 1 {
			http.Error(w, "down", 503)
			return
		}
		if mode.Load() == 2 {
			_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error": map[string]any{"code": "invalid_token"}, "message": "Bearer secret"})
			return
		}
		reply(w, syntheticUser(7))
	})
	st := connected(t, s)
	b, _ := json.Marshal(st)
	if strings.Contains(string(b), "synthetic-system-token") {
		t.Fatal("token in state")
	}
	if runtime.GOOS != "windows" {
		f, _ := os.Stat(s.store.path)
		d, _ := os.Stat(filepath.Dir(s.store.path))
		if f.Mode().Perm() != 0600 || d.Mode().Perm() != 0700 {
			t.Fatal("not private")
		}
	}
	restored := newService(s.store.path, server.URL, server.Client())
	if restored.State().Status != "offline" {
		t.Fatal("restored without verifying")
	}
	if restored.Check(context.Background()).Status != "connected" {
		t.Fatal("restore failed")
	}
	mode.Store(1)
	if s.Check(context.Background()).Status != "offline" {
		t.Fatal("network not offline")
	}
	rec, e := s.store.read()
	if e != nil || rec.Token == "" {
		t.Fatal("network removed token")
	}
	mode.Store(2)
	if s.Check(context.Background()).Status != "invalid" {
		t.Fatal("business auth error not invalid")
	}
	if st = s.Disconnect(); st.Status != "disconnected" || !st.LocalCleared {
		t.Fatalf("disconnect %+v", st)
	}
	raw, _ := os.ReadFile(s.store.path)
	if strings.Contains(string(raw), "synthetic-system-token") {
		t.Fatal("disconnect retained token")
	}
}
func TestTuziSwitchDropsLateResponsesAndCancels(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	s, _ := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/user/self/bootstrap" {
			if strings.Contains(r.Header.Get("Authorization"), "second") {
				reply(w, syntheticUser(9))
			} else {
				reply(w, syntheticUser(7))
			}
			return
		}
		close(started)
		<-release
		reply(w, map[string]any{"page": 1, "page_size": 20, "total": 1, "items": []any{syntheticKey()}})
	})
	st := connected(t, s)
	result := make(chan *Error, 1)
	go func() {
		_, e := s.Request(context.Background(), Request{Method: "GET", Path: "/account/keys", Generation: st.Generation})
		result <- e
	}()
	<-started
	st = s.Connect(context.Background(), "synthetic-second-token")
	close(release)
	if st.Identity.UserID != "9" {
		t.Fatal("switch failed")
	}
	if e := <-result; e == nil || e.Code != "stale_generation" {
		t.Fatalf("late response accepted: %v", e)
	}
}
func TestTuziWritesPersistUnknownGateReadBackAndPreservePatch(t *testing.T) {
	var writes atomic.Int32
	var changed atomic.Bool
	s, server := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/user/self/bootstrap" {
			reply(w, syntheticUser(7))
			return
		}
		if r.Method == "PATCH" {
			writes.Add(1)
			b, _ := io.ReadAll(r.Body)
			if string(b) != "{\"status\":2}" {
				t.Errorf("patch overwrote unprovided fields: %s", b)
			}
			changed.Store(true)
			http.Error(w, "result lost", 502)
			return
		}
		key := syntheticKey()
		if changed.Load() {
			key["status"] = 2
		}
		reply(w, key)
	})
	st := connected(t, s)
	req := Request{Method: "PATCH", Path: "/account/keys/8/status", Generation: st.Generation, Body: json.RawMessage(`{"status":2}`)}
	_, e := s.Request(context.Background(), req)
	if e == nil || !e.OutcomeUnknown {
		t.Fatalf("not unknown: %v", e)
	}
	s = newService(s.store.path, server.URL, server.Client())
	s.Check(context.Background())
	if s.State().PendingWrite == nil {
		t.Fatal("restart lost gate")
	}
	if _, e = s.Request(context.Background(), req); e == nil || e.Code != "write_recovery_required" {
		t.Fatal("blind duplicate accepted")
	}
	if writes.Load() != 1 {
		t.Fatal("write replayed")
	}
	if _, e = s.Recover(context.Background(), st.Generation, true); e == nil || e.Code != "readback_required" {
		t.Fatal("ack before read")
	}
	out, e := s.Recover(context.Background(), st.Generation, false)
	if e != nil || object(object(out.Data)["data"])["status"] != json.Number("2") {
		t.Fatalf("readback: %v %#v", e, out)
	}
	if _, e = s.Recover(context.Background(), st.Generation, true); e != nil || s.State().PendingWrite != nil {
		t.Fatal("confirmed recovery failed")
	}
}
func TestTuziStoreCorruptionAndSaveFailureAreNotSuccess(t *testing.T) {
	s, _ := fixture(t, func(w http.ResponseWriter, r *http.Request) { reply(w, syntheticUser(7)) })
	st := connected(t, s)
	if e := os.Remove(s.store.path); e != nil {
		t.Fatal(e)
	}
	if e := os.Mkdir(s.store.path, 0700); e != nil {
		t.Fatal(e)
	}
	st = s.Disconnect()
	if st.Error == nil || st.LocalCleared || st.Status == "disconnected" {
		t.Fatalf("failed clearing reported success %+v", st)
	}
	dir := t.TempDir()
	_ = os.Chmod(dir, 0700)
	path := filepath.Join(dir, "account.json")
	_ = os.WriteFile(path, []byte(`{"token":`), 0600)
	store := fileStore{path}
	if _, e := store.read(); e == nil || e.Code != "storage_invalid" {
		t.Fatalf("corrupt treated empty %v", e)
	}
	if runtime.GOOS != "windows" {
		real := filepath.Join(t.TempDir(), "real")
		_ = os.WriteFile(real, []byte(`{}`), 0600)
		link := filepath.Join(t.TempDir(), "link")
		_ = os.Symlink(real, link)
		if _, e := (fileStore{link}).read(); e == nil {
			t.Fatal("symlink read")
		}
	}
}
func TestTuziProjectionDoesNotLeakAndKeepsIntegerPrecision(t *testing.T) {
	s, _ := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/user/self/bootstrap":
			reply(w, syntheticUser(7))
		case "/api/user/self":
			if r.Header.Get("New-Api-User") != "7" {
				t.Error("missing identity")
			}
			reply(w, syntheticUser(7))
		case "/api/status":
			if r.Header.Get("Authorization") != "" {
				t.Error("public status has credential")
			}
			reply(w, map[string]any{"quota_per_unit": 500000, "usd_exchange_rate": 7.2, "quota_display_type": "CNY", "custom_currency_symbol": "¤", "custom_currency_exchange_rate": 1})
		case "/api/token/":
			reply(w, map[string]any{"page": 1, "page_size": 20, "total": 1, "items": []any{syntheticKey()}})
		default:
			t.Error(r.URL.Path)
		}
	})
	st := connected(t, s)
	out, e := s.Request(context.Background(), Request{Method: "GET", Path: "/account/account", Generation: st.Generation})
	if e != nil {
		t.Fatal(e)
	}
	if object(out.Data)["quota"] != "9007199254740993" {
		t.Fatal("integer rounded")
	}
	raw, _ := json.Marshal(out)
	if strings.Contains(string(raw), "access_token") || strings.Contains(string(raw), "role") {
		t.Fatal("identity secret leaked")
	}
	out, e = s.Request(context.Background(), Request{Method: "GET", Path: "/account/keys", Generation: st.Generation})
	if e != nil {
		t.Fatal(e)
	}
	raw, _ = json.Marshal(out)
	if strings.Contains(string(raw), "synthetic-model-secret") || strings.Contains(string(raw), "routing_preference") {
		t.Fatal("key detail leaked")
	}
}
func TestTuziRouteRejectsIdentityOverridesAndKeepsGroupsSemantics(t *testing.T) {
	cases := []Request{{Method: "GET", Path: "https://evil.test"}, {Method: "GET", Path: "/account/profile"}, {Method: "GET", Path: "/account/keys", Query: [][2]string{{"user_id", "9"}}}, {Method: "GET", Path: "/account/keys", Query: [][2]string{{"token", "sk-secret"}}}, {Method: "PATCH", Path: "/account/keys/8", Body: json.RawMessage(`{"remain_quota":null}`)}, {Method: "PATCH", Path: "/account/keys/8", Body: json.RawMessage(`{"used_quota":0}`)}, {Method: "PATCH", Path: "/account/keys/8", Body: json.RawMessage(`{"status":true}`)}, {Method: "GET", Path: "/account/keys/../8"}, {Method: "GET", Path: "/account/models", Query: [][2]string{{"page_size", "101"}}}}
	for _, r := range cases {
		if _, e := routeFor(r); e == nil {
			t.Fatalf("accepted %+v", r)
		}
	}
	for _, body := range []string{`{"models":["a"],"hours":1,"resolution":"30m"}`, `{"models":["a"],"groups":[],"hours":6,"resolution":"30m"}`} {
		rt, e := routeFor(Request{Method: "POST", Path: "/account/model-performance/batch", Body: json.RawMessage(body)})
		if e != nil {
			t.Fatal(e)
		}
		m := object(rt.body)
		_, has := m["groups"]
		if has != strings.Contains(body, "groups") {
			t.Fatal("all groups changed to empty")
		}
		if m["resolution"] != "half_hourly" || rt.write {
			t.Fatal("batch triggered mutation")
		}
	}
}
func TestTuziSummaryAndPerformanceUnknownRemainUnknown(t *testing.T) {
	v := map[string]any{"logs_available": false, "quota": 0}
	if _, e := summaryProjection(v); e == nil || e.Code != "logs_unavailable" {
		t.Fatal("unavailable shown zero")
	}
	m := metricProjection(map[string]any{"has_samples": false, "avg_latency_ms": 20, "success_rate": 100})
	if m["success_rate"] != nil || m["avg_latency_ms"] != nil {
		t.Fatal("missing samples fabricated")
	}
	m = metricProjection(map[string]any{"has_samples": true, "ttft_sample_level": "none", "avg_ttft_ms": 20, "success_rate": json.Number("98.4")})
	if m["avg_ttft_ms"] != nil || m["success_rate"] != json.Number("98.4") {
		t.Fatal("ttft or percentage wrong")
	}
	rt, e := routeFor(Request{Method: "GET", Path: "/account/usage/summary", Query: [][2]string{{"start_time", "1762056000"}, {"end_time", "1762146000"}, {"timezone", "America/New_York"}}})
	if e != nil || rt.query.Get("end_timestamp") != "1762146000" {
		t.Fatal("DST range altered")
	}
}
func TestTuziRedirectNeverCarriesTokenElsewhere(t *testing.T) {
	var hits atomic.Int32
	dest := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { hits.Add(1) }))
	defer dest.Close()
	s, _ := fixture(t, func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, dest.URL, 302) })
	if st := s.Connect(context.Background(), "synthetic-system-token"); st.Status == "connected" || hits.Load() != 0 {
		t.Fatal("redirect followed")
	}
}
func TestTuziPrefillRequiresSingleRecentIntent(t *testing.T) {
	s := newService(filepath.Join(t.TempDir(), "private", "account.json"), Origin, nil)
	var reads int
	read := func() (string, bool) { reads++; return "SyntheticToken123456789012345678", true }
	if s.Prefill(read) != "" || reads != 0 {
		t.Fatal("cold clipboard read")
	}
	s.ArmPrefill()
	if s.Prefill(read) == "" || reads != 1 {
		t.Fatal("intent not read")
	}
	if s.Prefill(read) != "" || reads != 1 {
		t.Fatal("read twice")
	}
	s.ArmPrefill()
	s.prefillUntil = time.Now().Add(-time.Second)
	if s.Prefill(read) != "" || reads != 1 {
		t.Fatal("expired read")
	}
	s.ArmPrefill()
	s.Disconnect()
	if s.Prefill(read) != "" || reads != 1 {
		t.Fatal("generation ignored")
	}
}
func TestTuziAccountSecretExcludedFromBackup(t *testing.T) {
	accountTestHome(t)
	s := New()
	s.origin = "http://127.0.0.1:1"
	r := record{Version: 1, Origin: s.origin, Client: ClientID, Generation: 1, Token: "synthetic-system-token-private", Identity: &Identity{UserID: "7", ConnectionID: "fixture"}}
	if e := s.store.write(r); e != nil {
		t.Fatal(e)
	}
	bundle, e := backup.Collect(true, "fixture")
	if e != nil {
		t.Fatal(e)
	}
	b, _ := json.Marshal(bundle)
	if strings.Contains(string(b), r.Token) || strings.Contains(string(b), "account-private") {
		t.Fatal("account secret backed up")
	}
}
func TestTuziProviderRevalidatesEveryBatchAndDeduplicates(t *testing.T) {
	accountTestHome(t)
	var mu sync.Mutex
	var batches [][]string
	var changed atomic.Bool
	s, _ := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/user/self/bootstrap":
			reply(w, syntheticUser(7))
		case "/api/token/8":
			reply(w, syntheticKey())
		case "/api/token/8/key":
			reply(w, map[string]any{"key": "synthetic-model-key"})
		case "/v1/models":
			if r.Header.Get("Authorization") != "Bearer sk-synthetic-model-key" || r.Header.Get("New-Api-User") != "" {
				t.Error("model listing credential mixed")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"data": []any{map[string]any{"id": "fixture-1"}, map[string]any{"id": "fixture-2"}, map[string]any{"id": "fixture-3"}, map[string]any{"id": "fixture-4"}}})
		case "/api/pricing/models":
			names := r.URL.Query()["models"]
			mu.Lock()
			batches = append(batches, append([]string{}, names...))
			mu.Unlock()
			items := []any{}
			for _, n := range names {
				items = append(items, map[string]any{"model_name": n, "enable_groups": []string{"default"}, "supported_endpoint_types": []string{"openai-response"}})
			}
			snapshot := "s1"
			if changed.Load() && r.URL.Query().Get("snapshot_id") != "" {
				snapshot = "s2"
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "data": items, "snapshot_id": snapshot, "pagination": map[string]any{"page": 1, "page_size": 100, "total": len(items), "has_more": false}, "meta": map[string]any{}})
		default:
			t.Error(r.URL.Path)
		}
	})
	st := connected(t, s)
	in := ProviderRequest{Generation: st.Generation, TokenID: "8", Models: []string{"fixture-1", "fixture-2", "fixture-3", "fixture-4"}, Protocol: "responses"}
	changed.Store(true)
	if _, e := s.AddProvider(context.Background(), in); e == nil || e.Code != "snapshot_changed" {
		t.Fatal("changed snapshot allowed")
	}
	ps, _ := provider.Stored()
	if len(ps) != 0 {
		t.Fatal("partial saved")
	}
	changed.Store(false)
	out, e := s.AddProvider(context.Background(), in)
	if e != nil {
		t.Fatal(e)
	}
	ps, e2 := provider.Stored()
	if e2 != nil || len(ps) != 1 || ps[0].Key != "sk-synthetic-model-key" || ps[0].Responses != s.origin+"/v1" {
		t.Fatalf("bad provider %+v %v", ps, e2)
	}
	raw, _ := os.ReadFile(provider.Path())
	again, e := s.AddProvider(context.Background(), in)
	after, _ := os.ReadFile(provider.Path())
	if e != nil || !again.Existing || again.ProviderID != out.ProviderID || string(raw) != string(after) {
		t.Fatal("duplicate rewrote provider")
	}
	s.Disconnect()
	ps, _ = provider.Stored()
	if len(ps) != 1 {
		t.Fatal("disconnect removed provider")
	}
	mu.Lock()
	defer mu.Unlock()
	for _, batch := range batches {
		if len(batch) > 3 {
			t.Fatal("oversized model query")
		}
	}
}

func TestTuziStatisticsKeepRangesRefundsAndRemovePrivateFields(t *testing.T) {
	totals := map[string]any{"logs_available": true, "record_count": 3, "request_count": 1, "error_count": 1, "quota": 9007199254740993, "prompt_tokens": 10, "completion_tokens": 11, "refund_quota": 2, "start_timestamp": 100, "end_timestamp": 200, "coverage": "recorded_logs_only"}
	s, _ := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/user/self/bootstrap" {
			reply(w, syntheticUser(7))
			return
		}
		if r.URL.Query().Get("summary") != "true" || r.URL.Query().Get("statistics") != "true" || r.URL.Query().Get("end_timestamp") != "200" {
			t.Error("wrong summary query")
		}
		reply(w, map[string]any{"summary": totals, "trend": []any{totals}, "by_model": []any{map[string]any{"model_name": "fixture", "record_count": 3, "quota": 9007199254740993, "error_count": 1, "admin_info": "private"}}, "by_error": []any{map[string]any{"error_code": "timeout", "record_count": 1}}})
	})
	st := connected(t, s)
	out, e := s.Request(context.Background(), Request{Method: "GET", Path: "/account/logs/statistics", Generation: st.Generation, Query: [][2]string{{"start_timestamp", "100"}, {"end_timestamp", "200"}}})
	if e != nil {
		t.Fatal(e)
	}
	d := object(out.Data)
	summary := object(d["summary"])
	if summary["quota"] != "9007199254740993" || summary["refund_quota"] != "2" {
		t.Fatal("refund subtracted or integer lost")
	}
	trend := object(array(d["trend"])[0])
	if trend["start_timestamp"] != json.Number("100") || trend["end_timestamp"] != json.Number("200") {
		t.Fatal("trend lost boundaries")
	}
	b, _ := json.Marshal(out)
	if strings.Contains(string(b), "admin_info") {
		t.Fatal("private statistic field escaped")
	}
}
func TestTuziCatalogNormalizesArraysAndExcludesPersonalPrices(t *testing.T) {
	raw := map[string]any{"success": true, "data": []any{map[string]any{"model_name": "fixture", "model_price": nil, "enable_groups": nil, "aliases": nil, "related_pricing": nil, "admin_info": "private"}}, "pagination": map[string]any{"page": json.Number("1"), "page_size": json.Number("20"), "total": json.Number("1")}, "meta": map[string]any{"user_model_pricing": map[string]any{"secret": 7}, "usable_group": map[string]any{"default": "Default"}, "filter_facets": map[string]any{"groups": map[string]any{"default": json.Number("1")}, "total": json.Number("1")}, "group_model_pricing": map[string]any{"default": map[string]any{"model_price": map[string]any{"fixture": json.Number("0.01")}, "admin_info": "private"}}}}
	out, e := project(Request{Method: "GET", Path: "/account/models"}, route{}, raw, nil)
	if e != nil {
		t.Fatal(e)
	}
	d := object(out)
	m := object(array(d["items"])[0])
	if m["model_price"] != nil || len(array(m["aliases"])) != 0 || m["aliases"] == nil {
		t.Fatal("missing price/array changed")
	}
	b, _ := json.Marshal(d)
	if strings.Contains(string(b), "user_model_pricing") || strings.Contains(string(b), "admin_info") {
		t.Fatal("personal/private metadata leaked")
	}
}
func TestTuziExplicitReconnectPreservesCorruptFile(t *testing.T) {
	s, _ := fixture(t, func(w http.ResponseWriter, r *http.Request) { reply(w, syntheticUser(7)) })
	_ = os.MkdirAll(filepath.Dir(s.store.path), 0700)
	corrupt := []byte(`{"token":"synthetic-old-secret",`)
	_ = os.WriteFile(s.store.path, corrupt, 0600)
	if s.State().Error == nil {
		t.Fatal("corrupt state hidden")
	}
	if s.Connect(context.Background(), "synthetic-new-token").Status != "connected" {
		t.Fatal("explicit reconnect failed")
	}
	matches, _ := filepath.Glob(s.store.path + ".bad-*")
	if len(matches) != 1 {
		t.Fatal("corrupt original not preserved")
	}
	b, _ := os.ReadFile(matches[0])
	if string(b) != string(corrupt) {
		t.Fatal("corrupt original changed")
	}
}
