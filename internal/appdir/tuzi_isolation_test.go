package appdir

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTuziDoesNotAdoptUpstreamData(t *testing.T) {
	r := root(t)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(r, "config"))
	t.Setenv("XDG_CACHE_HOME", filepath.Join(r, "cache"))
	t.Cleanup(func() { UseExecutable("") })
	exe := touch(t, filepath.Join(r, "bin", "tuzi-magpie"))
	touch(t, filepath.Join(r, "bin", ".portable"))
	touch(t, filepath.Join(r, "bin", "data", "providers.json"))
	touch(t, filepath.Join(r, "config", "magpie", "providers.json"))
	UseExecutable(exe)
	if Portable() != "" {
		t.Fatal("adopted original Magpie portable data")
	}
	if got := Config(); got != filepath.Join(r, "config", "tuzi-magpie") {
		t.Fatalf("config would share upstream: %s", got)
	}
	if got := Cache(); !strings.HasSuffix(got, "tuzi-magpie") {
		t.Fatalf("cache shared: %s", got)
	}
	if _, err := os.Stat(filepath.Join(r, "config", "magpie", "providers.json")); err != nil {
		t.Fatal("original state changed", err)
	}
	touch(t, filepath.Join(r, "bin", ".tuzi-magpie-portable"))
	UseExecutable(exe)
	if got := Config(); got != filepath.Join(r, "bin", "tuzi-magpie-data") {
		t.Fatalf("own portable marker ignored: %s", got)
	}
}
