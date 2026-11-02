package provider

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yetone/magpie/internal/testenv"
)

func tuziTestHome(t *testing.T) {
	d := t.TempDir()
	testenv.SetHome(t, d)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(d, "config"))
	t.Setenv("XDG_CACHE_HOME", filepath.Join(d, "cache"))
}
func tuziFixtureProvider() Provider {
	return Provider{Name: "Fixture", Key: "sk-synthetic-only", Responses: "http://127.0.0.1:18342/v1", Models: []string{"fixture"}, TuziSource: &TuziSource{Origin: "https://api.tu-zi.com", UserID: "7", TokenID: "8"}}
}
func TestTuziSourcePreservesUnknownFieldsAndDuplicateEdits(t *testing.T) {
	tuziTestHome(t)
	_ = os.MkdirAll(filepath.Dir(Path()), 0700)
	original := []byte(`{"unknownFuture":{"preserve":true},"providers":[{"id":"external","name":"External","key":"sk-external-fixture","chat":"http://127.0.0.1:18342/v1","futureSetting":17}]}`)
	if e := os.WriteFile(Path(), original, 0600); e != nil {
		t.Fatal(e)
	}
	p := tuziFixtureProvider()
	id, existing, e := AddTuziSource(p)
	if e != nil || existing || id == "" {
		t.Fatalf("add %q %v %v", id, existing, e)
	}
	first, _ := os.ReadFile(Path())
	if !bytes.Contains(first, []byte(`"futureSetting": 17`)) || !bytes.Contains(first, []byte(`"unknownFuture"`)) {
		t.Fatal("unknown fields lost")
	}
	p.Key = "sk-user-changed"
	p.Name = "Changed"
	p.Models = []string{"new"}
	again, existing, e := AddTuziSource(p)
	after, _ := os.ReadFile(Path())
	if e != nil || !existing || again != id || !bytes.Equal(first, after) {
		t.Fatal("duplicate replaced existing provider")
	}
}
func TestTuziSourceExternalChangeAndCorruptionStopSave(t *testing.T) {
	tuziTestHome(t)
	_ = os.MkdirAll(filepath.Dir(Path()), 0700)
	initial := []byte(`{"providers":[]}`)
	changed := []byte(`{"providers":[],"external":true}`)
	_ = os.WriteFile(Path(), initial, 0600)
	_, _, e := addTuziSource(tuziFixtureProvider(), func() { _ = os.WriteFile(Path(), changed, 0600) })
	if !errors.Is(e, errTuziConflict) {
		t.Fatalf("external write not refused: %v", e)
	}
	b, _ := os.ReadFile(Path())
	if !bytes.Equal(b, changed) {
		t.Fatal("external edit lost")
	}
	corrupt := []byte(`{"providers":`)
	_ = os.WriteFile(Path(), corrupt, 0600)
	if _, _, e := AddTuziSource(tuziFixtureProvider()); !errors.Is(e, ErrUnreadable) {
		t.Fatalf("corrupt overwritten %v", e)
	}
	b, _ = os.ReadFile(Path())
	if !bytes.Equal(b, corrupt) {
		t.Fatal("corrupt changed")
	}
}
func TestTuziSourceGenericEditKeepsProvenance(t *testing.T) {
	tuziTestHome(t)
	id, _, e := AddTuziSource(tuziFixtureProvider())
	if e != nil {
		t.Fatal(e)
	}
	// Save's caller may not know this new optional field. Existing user edits
	// still keep it, so duplicate account adds don't create another provider.
	p := tuziFixtureProvider()
	p.ID = id
	p.Name = "Renamed by user"
	p.TuziSource = nil
	if e = Save(p); e != nil {
		t.Fatal(e)
	}
	stored, e := Stored()
	if e != nil || len(stored) != 1 || stored[0].TuziSource == nil {
		t.Fatal("ordinary edit dropped source")
	}
	b, _ := os.ReadFile(Path())
	if strings.Contains(string(b), "system-token") {
		t.Fatal("source has auth")
	}
}
