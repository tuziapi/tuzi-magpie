//go:build tuzi_fixture

package tuzifixture_test

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yetone/magpie/internal/testenv"
	"github.com/yetone/magpie/internal/tuziaccount"
	"github.com/yetone/magpie/internal/tuzifixture"
)

func TestMain(m *testing.M) { testenv.Main(m) }

// Exercise the real account projection instead of assuming a fixture's JSON
// shape matches what the desktop can read, through the account service.
func TestDesktopAccountFixtureProjection(t *testing.T) {
	testenv.SetHome(t, t.TempDir())
	server := httptest.NewServer(tuzifixture.New())
	defer server.Close()
	service, err := tuziaccount.NewFixture(filepath.Join(t.TempDir(), "account.json"), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	state := service.Connect(context.Background(), tuzifixture.SystemToken)
	if state.Status != "connected" {
		t.Fatalf("connect: %+v", state)
	}
	for _, tc := range []struct{ method, path, body string }{
		{"GET", "/account/account", ""},
		{"GET", "/account/capabilities", ""},
		{"GET", "/account/key-groups", ""},
		{"GET", "/account/keys", ""},
		{"GET", "/account/keys/8", ""},
		{"GET", "/account/keys/8/models", ""},
		{"POST", "/account/keys/8/reveal", ""},
		{"GET", "/account/logs", ""},
		{"GET", "/account/logs/requests/fixture-request", ""},
		{"GET", "/account/logs/summary", ""},
		{"GET", "/account/logs/statistics", ""},
		{"GET", "/account/usage/summary", ""},
		{"GET", "/account/usage", ""},
		{"GET", "/account/models", ""},
		{"GET", "/account/model-performance", ""},
		{"POST", "/account/model-performance/batch", `{"models":["gpt-5.5"],"hours":1}`},
		{"POST", "/account/keys", `{"name":"Created fixture","group":"default"}`},
		{"PATCH", "/account/keys/9", `{"name":"Edited fixture","unlimited_quota":false,"remain_quota":0}`},
		{"PATCH", "/account/keys/9/status", `{"status":2}`},
		{"DELETE", "/account/keys/9", ""},
	} {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			query := [][2]string{}
			if strings.HasPrefix(tc.path, "/account/usage") {
				query = append(query, [2]string{"timezone", "Asia/Shanghai"})
			}
			if tc.path == "/account/model-performance" {
				query = [][2]string{{"model", tuzifixture.CodexModel}, {"hours", "1"}}
			}
			out, e := service.Request(context.Background(), tuziaccount.Request{Generation: state.Generation, Method: tc.method, Path: tc.path, Body: json.RawMessage(tc.body), Query: query})
			if e != nil {
				t.Fatalf("projection: %v", e)
			}
			if out.Data == nil {
				t.Fatal("empty projected fixture")
			}
		})
	}
}
