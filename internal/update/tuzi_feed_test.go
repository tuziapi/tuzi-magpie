package update

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yetone/magpie/internal/product"
)

func TestTuziConfiguredReleasePage(t *testing.T) {
	previous := product.Repository
	t.Cleanup(func() { product.Repository = previous })
	product.Repository = "https://forge.example/team/tuzi-magpie/"
	if got := ReleasePage("v1.2.3"); got != "https://forge.example/team/tuzi-magpie/releases/tag/v1.2.3" {
		t.Fatalf("configured release page = %q", got)
	}
	product.Repository = "https://user:secret@forge.example/team/repo"
	if got := ReleasePage("1.2.3"); got != "" {
		t.Fatalf("invalid repository produced release page: %q", got)
	}
}

func TestTuziNeverDefaultsToUpstreamUpdate(t *testing.T) {
	t.Setenv("TUZI_MAGPIE_UPDATE_FEED", "")
	t.Setenv("MAGPIE_UPDATE_FEED", "https://usemagpie.ai/api/latest")
	if Feed() != "" {
		t.Fatalf("unconfigured distribution has update feed %q", Feed())
	}
	if _, err := Latest(context.Background()); err == nil {
		t.Fatal("unconfigured update unexpectedly succeeded")
	}
	t.Setenv("TUZI_MAGPIE_UPDATE_FEED", "http://127.0.0.1:9/synthetic")
	if Feed() != "http://127.0.0.1:9/synthetic" {
		t.Fatal("explicit local test feed ignored")
	}
}

func TestTuziNotesAndArtifactsStayIndependent(t *testing.T) {
	t.Setenv("TUZI_MAGPIE_NOTES_FEED", "")
	t.Setenv("MAGPIE_NOTES_FEED", "https://usemagpie.ai/api/notes")
	if NotesFeed() != "" || ReleasePage("1.0") != "" {
		t.Fatal("unconfigured notes point outside distribution")
	}
	if _, err := NotesBetween(context.Background(), "1.0", "2.0", "en"); err == nil {
		t.Fatal("unconfigured notes accepted")
	}
	if !strings.HasPrefix(AppAsset(), "tuzi-magpie-") || !strings.HasPrefix(BinaryAsset(), "tuzi-magpie-") {
		t.Fatal("upstream asset name")
	}
	if filepath.Base(stageDir(t.TempDir())) != ".tuzi-magpie-update" {
		t.Fatal("shared update staging")
	}
}
