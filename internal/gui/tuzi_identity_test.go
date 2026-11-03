package gui

import (
	"github.com/yetone/magpie/internal/gateway"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTuziNeverAutomaticallyQuitsOriginalMagpie(t *testing.T) {
	oldHost := handoverHost.Load()
	handoverHost.Store(true)
	oldCount := replacedOlder.Load()
	replacedOlder.Store(0)
	t.Cleanup(func() { handoverHost.Store(oldHost); replacedOlder.Store(oldCount) })
	other := gateway.Served{Running: true, Version: "0.1.1", Serves: "app", Pid: 12345}
	sk := &gatewaySkew{Older: true}
	if replaceable(other, sk) {
		t.Fatal("original Magpie would be quit automatically")
	}
	other.Distribution = "another-fork"
	if replaceable(other, sk) {
		t.Fatal("another distribution would be quit automatically")
	}
	other.Distribution = "tuzi-magpie"
	if !replaceable(other, sk) {
		t.Fatal("own older release cannot use existing safe handover")
	}
}

func TestTuziManualTakeoverLeavesOtherDistribution(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"name":"magpie","version":"0.1.1","models":1}`))
	}))
	defer server.Close()
	t.Setenv("MAGPIE_ADDR", strings.TrimPrefix(server.URL, "http://"))
	old := served.Swap(nil)
	defer served.Store(old)
	if out := takeOverGateway(); out.OK || out.Reason != "other" {
		t.Fatalf("other distribution was not left alone: %+v", out)
	}
}
