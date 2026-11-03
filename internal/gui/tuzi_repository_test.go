package gui

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/yetone/magpie/internal/product"
	"github.com/yetone/magpie/internal/testenv"
)

func TestRepositoryBuildSettingReachesBoot(t *testing.T) {
	testenv.SetHome(t, t.TempDir())
	previous := product.Repository
	t.Cleanup(func() { product.Repository = previous })
	for _, configured := range []string{"", "https://forge.example/team/tuzi-magpie"} {
		product.Repository = configured
		r := httptest.NewRecorder()
		Handler(nil, nil).ServeHTTP(r, httptest.NewRequest("GET", "/boot.js", nil))
		body := strings.TrimSuffix(strings.TrimPrefix(r.Body.String(), "window.bootPrefs = "), ";\n")
		var boot map[string]any
		if err := json.Unmarshal([]byte(body), &boot); err != nil {
			t.Fatal(err)
		}
		want := configured
		if want == "" {
			want = product.UpstreamRepository
		}
		if boot["repository"] != want {
			t.Fatalf("repository boot value = %v, want %s", boot["repository"], want)
		}
	}
}
