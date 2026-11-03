package gui

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/yetone/magpie/internal/provider"
	"github.com/yetone/magpie/internal/testenv"
)

func TestTuziPresetEditorSaveRetainsAllProtocols(t *testing.T) {
	testenv.SetHome(t, t.TempDir())
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	t.Setenv("XDG_CACHE_HOME", t.TempDir())
	mux := http.NewServeMux()
	providerRoutes(mux, nil)
	// Cancel the optional post-save model discovery so this test cannot call
	// any real vendor. The local save still exercises the editor's HTTP path.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	req := httptest.NewRequest("POST", "/api/provider/save", strings.NewReader(`{"id":"tuzi","name":"Tuzi","preset":"tuzi","key":"synthetic-key","models":["synthetic-model"],"gemini":"","new":true}`)).WithContext(ctx)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("save status %d", w.Code)
	}
	p, err := provider.Find("tuzi")
	if err != nil || p.Chat != "https://api.tu-zi.com/v1" || p.Responses != p.Chat || p.Anthropic != "https://apius.tu-zi.com" || p.Gemini != "https://api.tu-zi.com/v1beta" {
		t.Fatalf("preset editor lost an endpoint: error=%v chat=%s responses=%s anthropic=%s gemini=%s", err, p.Chat, p.Responses, p.Anthropic, p.Gemini)
	}
	if tuziPresetLinks("anthropic") != nil || tuziPresetLinks("custom") != nil {
		t.Fatal("Tuzi controls leaked into another provider")
	}
	if links := tuziPresetLinks("tuzi-coding"); links == nil || links.QueryURL != "https://coding.tu-zi.com/reseller/" {
		t.Fatal("fixed current-contract query link missing")
	}
}
