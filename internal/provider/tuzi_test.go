package provider

import (
	"context"
	"net/url"
	"reflect"
	"strings"
	"testing"
)

func TestTuziPresetsKeepThreeCredentialsApart(t *testing.T) {
	for _, tc := range []struct {
		id    string
		bases map[Protocol]string
	}{
		{TuziPreset, map[Protocol]string{Chat: "https://api.tu-zi.com/v1", Responses: "https://api.tu-zi.com/v1", Anthropic: "https://apius.tu-zi.com", Gemini: "https://api.tu-zi.com/v1beta"}},
		{TuziCodingPreset, map[Protocol]string{Responses: "https://api.tu-zi.com/coding"}},
		{GACCodePreset, map[Protocol]string{Responses: "https://gaccode.com/codex/v1", Anthropic: "https://gaccode.com/claudecode"}},
	} {
		t.Run(tc.id, func(t *testing.T) {
			p, err := FromPreset(tc.id)
			if err != nil {
				t.Fatal(err)
			}
			if p.Key != "" || p.BalanceToken != "" || p.Account != nil || len(p.Keys) != 0 {
				t.Fatal("preset carried credentials")
			}
			for _, protocol := range []Protocol{Chat, Responses, Anthropic, Gemini} {
				if got := p.Base(protocol); got != tc.bases[protocol] {
					t.Errorf("%s: %q, want %q", protocol, got, tc.bases[protocol])
				}
			}
			p.Key = "synthetic-" + tc.id
			for protocol := range tc.bases {
				h := AuthHeaders(p, protocol)
				if protocol == Gemini {
					if h["x-goog-api-key"] != p.Key || h["Authorization"] != "" {
						t.Fatal(h)
					}
				} else if h["Authorization"] != "Bearer "+p.Key {
					t.Fatal(h)
				}
			}
		})
	}
	// The new optional Gemini preset field changes none of the old presets.
	for _, id := range []string{"openai", "anthropic", "openrouter"} {
		p, err := FromPreset(id)
		if err != nil || p.Gemini != "" {
			t.Fatalf("%s changed: %v %v", id, p, err)
		}
	}
}

func TestTuziPlanListsNeedNeitherAccountNorUndocumentedEndpoint(t *testing.T) {
	for _, id := range []string{TuziCodingPreset, GACCodePreset} {
		p, err := FromPreset(id)
		if err != nil {
			t.Fatal(err)
		}
		// No network list is advertised for these plans: the locally sourced
		// starter ids remain editable through the existing provider editor.
		if p.ListAsks() {
			t.Fatalf("%s advertised a network list", id)
		}
		ms, err := p.List(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		var got []string
		for _, m := range ms {
			got = append(got, m.ID)
		}
		if !reflect.DeepEqual(got, Preset(id).Models) {
			t.Fatalf("%s starter models: %v", id, got)
		}
	}
}

func TestTuziWebsiteLinksAreFixedAndSeparate(t *testing.T) {
	want := map[string]TuziWebLinks{
		TuziPreset:       {"https://api.tu-zi.com/console/topup", "https://check.sydney-ai.com/"},
		TuziCodingPreset: {"https://store.tu-zi.com/cat/11", "https://coding.tu-zi.com/reseller/"},
		GACCodePreset:    {"https://store.tu-zi.com/cat/1", "https://gaccode.com/subscriptions"},
	}
	seen := map[string]bool{}
	for _, id := range []string{TuziPreset, TuziCodingPreset, GACCodePreset} {
		links, ok := TuziLinks(id)
		if !ok || seen[links.QueryURL] || links != want[id] {
			t.Fatalf("missing or mixed links: %s", id)
		}
		seen[links.QueryURL] = true
		for _, raw := range []string{links.PurchaseURL, links.QueryURL} {
			u, err := url.Parse(raw)
			if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || strings.Contains(raw, "synthetic") {
				t.Fatalf("unsafe navigation: %s", raw)
			}
		}
	}
	for _, unknown := range []string{"", "custom", "tuzi?key=synthetic", "https://api.tu-zi.com"} {
		if _, ok := TuziLinks(unknown); ok {
			t.Fatalf("guessed ownership: %s", unknown)
		}
	}
}

func TestTuziCodingImagePlanStaysOutOfAgentTextModels(t *testing.T) {
	p, err := FromPreset(TuziCodingPreset)
	if err != nil {
		t.Fatal(err)
	}
	drawers := p.PlanDrawers()
	if len(drawers) != 1 || drawers[0].ID != "gpt-image-2" || !drawers[0].Draws {
		t.Fatalf("missing Coding image plan: %+v", drawers)
	}
	models, err := p.List(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	for _, m := range models {
		if m.ID == "gpt-image-2" {
			t.Fatal("image model leaked into agent text list")
		}
	}
}
