package product

import "testing"

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
