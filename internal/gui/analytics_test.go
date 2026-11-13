package gui

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/yetone/magpie/internal/settings"
	"github.com/yetone/magpie/internal/testenv"
)

func TestAnalyticsBootHonorsPrivacy(t *testing.T) {
	testenv.SetHome(t, t.TempDir())
	for _, tc := range []struct {
		name             string
		noStats, noUsage bool
		env              string
	}{
		{"enabled", false, false, ""}, {"off", true, false, ""}, {"pages only", false, true, ""}, {"environment", false, false, "1"}, {"both", true, true, "1"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("DO_NOT_TRACK", tc.env)
			t.Setenv("MAGPIE_NO_STATS", "")
			s := settings.Load()
			s.NoStats = tc.noStats
			s.NoUsageStats = tc.noUsage
			if err := settings.Save(s); err != nil {
				t.Fatal(err)
			}
			w := httptest.NewRecorder()
			Handler(folderOnly{}, nil).ServeHTTP(w, httptest.NewRequest("GET", "/boot.js", nil))
			var boot struct {
				Analytics *struct {
					Off, Blocked, UsageOff bool
					Version, OS            string
				}
			}
			raw := strings.TrimSuffix(strings.TrimPrefix(w.Body.String(), "window.bootPrefs = "), ";\n")
			if err := json.Unmarshal([]byte(raw), &boot); err != nil {
				t.Fatal(err)
			}
			if boot.Analytics == nil {
				t.Fatal("missing analytics privacy configuration")
			}
			a := boot.Analytics
			if a.Off != (tc.noStats || tc.env != "") || a.Blocked != (tc.env != "") || a.UsageOff != tc.noUsage || a.Version == "" || a.OS == "" {
				t.Fatalf("wrong analytics configuration: %+v", a)
			}
		})
	}
}
