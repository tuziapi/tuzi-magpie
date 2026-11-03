package settings

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/yetone/magpie/internal/appdir"
)

// Starting this distribution never imports the original applications' saved
// data, creates their missing cache folders, or changes their files.
func TestTuziMigrateLeavesOtherApplicationsAlone(t *testing.T) {
	for _, name := range []string{"dial", "magpie"} {
		t.Run(name, func(t *testing.T) {
			config, cache := t.TempDir(), t.TempDir()
			t.Setenv("XDG_CONFIG_HOME", config)
			t.Setenv("XDG_CACHE_HOME", cache)
			stamp := time.Unix(1234567890, 0)
			for _, base := range []string{config, cache} {
				file := filepath.Join(base, name, "providers.json")
				if err := os.MkdirAll(filepath.Dir(file), 0o700); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(file, []byte(`{"synthetic":"belongs to the other application"}`), 0o600); err != nil {
					t.Fatal(err)
				}
				if err := os.Chtimes(file, stamp, stamp); err != nil {
					t.Fatal(err)
				}
			}
			Migrate()
			for _, dir := range []string{appdir.Config(), appdir.Cache()} {
				if _, err := os.Stat(dir); !os.IsNotExist(err) {
					t.Errorf("startup adopted other application data in %s: %v", dir, err)
				}
			}
			for _, base := range []string{config, cache} {
				entries, err := os.ReadDir(base)
				if err != nil || len(entries) != 1 || entries[0].Name() != name {
					t.Fatalf("startup created another application's folder in %s: %v %v", base, entries, err)
				}
				file := filepath.Join(base, name, "providers.json")
				data, err := os.ReadFile(file)
				if err != nil || string(data) != `{"synthetic":"belongs to the other application"}` {
					t.Errorf("other application bytes changed: %q %v", data, err)
				}
				info, err := os.Stat(file)
				if err != nil || !info.ModTime().Equal(stamp) {
					t.Errorf("other application timestamp changed: %v %v", info, err)
				}
			}
		})
	}
}
