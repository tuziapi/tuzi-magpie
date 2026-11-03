package product

import "testing"

func TestRepositoryConfiguration(t *testing.T) {
	previous := Repository
	t.Cleanup(func() { Repository = previous })
	for _, raw := range []string{"", "http://forge.example/team/repo", "https://user:secret@forge.example/team/repo", "https://forge.example/team/repo?token=synthetic", "https://forge.example/team/repo#fragment", "https://forge.example"} {
		Repository = raw
		if ConfiguredRepository() != "" || RepositoryURL() != UpstreamRepository {
			t.Fatalf("unsafe/unconfigured repository accepted: %q", raw)
		}
	}
	Repository = "https://forge.example/team/tuzi-magpie/"
	if got := RepositoryURL(); got != "https://forge.example/team/tuzi-magpie" {
		t.Fatalf("configured repository = %q", got)
	}
}

func TestAccountNavigationHasNoPayload(t *testing.T) {
	if !AccountNavigation("tuzimagpie://account/connect") {
		t.Fatal("fixed navigation rejected")
	}
	for _, raw := range []string{"tuziswitch://account/connect", "magpie://account/connect", "tuzimagpie://account/connect?token=synthetic", "tuzimagpie://account/connect#secret", "tuzimagpie://user@account/connect", "tuzimagpie://account:80/connect", "tuzimagpie://account/%63onnect", "tuzimagpie://account/connect/"} {
		if AccountNavigation(raw) {
			t.Fatalf("accepted payload or alternate route %q", raw)
		}
	}
}
