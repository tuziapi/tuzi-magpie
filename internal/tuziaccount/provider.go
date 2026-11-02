package tuziaccount

import (
	"context"
	"slices"
	"strings"
	"time"

	"github.com/yetone/magpie/internal/provider"
)

type ProviderRequest struct {
	Generation uint64   `json:"generation"`
	TokenID    string   `json:"tokenId"`
	Name       string   `json:"name,omitempty"`
	Models     []string `json:"models"`
	Protocol   string   `json:"protocol"`
}
type ProviderResult struct {
	ProviderID string `json:"providerId"`
	Existing   bool   `json:"existing"`
}

func (s *Service) AddProvider(ctx context.Context, in ProviderRequest) (ProviderResult, *Error) {
	if !validID(in.TokenID) || len(in.Models) == 0 || len(in.Models) > 50 || !hasWord("chat responses anthropic gemini", in.Protocol) {
		return ProviderResult{}, problem("invalid_request")
	}
	seen := map[string]bool{}
	for _, m := range in.Models {
		if m == "" || len(m) > 256 || seen[m] {
			return ProviderResult{}, problem("invalid_request")
		}
		seen[m] = true
	}
	rec, e := s.credentials(in.Generation)
	if e != nil {
		return ProviderResult{}, e
	}
	// Verify a restored credential and current ownership before revealing a key.
	id, e := s.identity(ctx, rec.Token, rec.Identity.UserID)
	if e != nil {
		return ProviderResult{}, e
	}
	catalog, e := s.KeyModels(ctx, in.Generation, in.TokenID)
	if e != nil {
		return ProviderResult{}, e
	}
	key := object(object(catalog.Data)["key"])
	for _, name := range in.Models {
		found := false
		for _, item := range array(object(catalog.Data)["items"]) {
			if object(item)["model_name"] == name {
				found = true
			}
		}
		if !found {
			return ProviderResult{}, problem("provider_selection_not_qualified")
		}
	}
	snapshot := ""
	for offset := 0; offset < len(in.Models); offset += 3 {
		names := in.Models[offset:min(offset+3, len(in.Models))]
		query := [][2]string{{"page", "1"}, {"page_size", "100"}, {"group", str(key["group"])}}
		if str(key["group"]) == "auto" {
			query = query[:2]
		}
		for _, m := range names {
			query = append(query, [2]string{"models", m})
		}
		if snapshot != "" {
			query = append(query, [2]string{"snapshot_id", snapshot})
		}
		out, e := s.Request(ctx, Request{Method: "GET", Path: "/account/models", Generation: in.Generation, Query: query})
		if e != nil {
			return ProviderResult{}, e
		}
		d := object(out.Data)
		next := str(d["snapshot_id"])
		if next == "" || d["snapshot_refreshed"] == true || snapshot != "" && next != snapshot {
			return ProviderResult{}, problem("snapshot_changed")
		}
		snapshot = next
		for _, name := range names {
			valid := false
			for _, item := range array(d["items"]) {
				m := object(item)
				if m["model_name"] != name {
					continue
				}
				groups := array(m["enable_groups"])
				groupOK := str(key["group"]) == "auto" || slices.Contains(groups, any(str(key["group"]))) || slices.Contains(groups, any("all"))
				valid = groupOK && supportsProtocol(m, in.Protocol)
			}
			if !valid {
				return ProviderResult{}, problem("provider_selection_not_qualified")
			}
		}
	}
	out, e := s.Request(ctx, Request{Method: "POST", Path: "/account/keys/" + in.TokenID + "/reveal", Generation: in.Generation})
	if e != nil {
		return ProviderResult{}, e
	}
	modelKey := str(object(out.Data)["key"])
	// Serialize the final generation check and local write with disconnect/switch.
	// This is disk I/O only, never network work under the state mutex.
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.record.Generation != in.Generation || s.record.Token == "" || s.state.Status == "invalid" {
		return ProviderResult{}, problem("stale_generation")
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = str(key["name"])
	}
	if name == "" {
		name = "Tuzi API"
	}
	p := provider.Provider{Name: name, Key: modelKey, Models: slices.Clone(in.Models), BaseAPI: in.Protocol, TuziSource: &provider.TuziSource{Origin: s.origin, UserID: id.UserID, TokenID: in.TokenID}}
	switch in.Protocol {
	case "chat":
		p.Chat = s.origin + "/v1"
	case "responses":
		p.Responses = s.origin + "/v1"
	case "anthropic":
		p.Anthropic = s.origin
		if s.origin == Origin {
			p.Anthropic = "https://apius.tu-zi.com"
		}
		p.AuthHeader = "bearer"
	case "gemini":
		p.Gemini = s.origin + "/v1beta"
	}
	providerID, existing, err := provider.AddTuziSource(p)
	if err != nil {
		return ProviderResult{}, problem("provider_save_failed")
	}
	return ProviderResult{providerID, existing}, nil
}

type protocolRule struct {
	Aliases []string `json:"aliases"`
	Paths   []string `json:"paths"`
}

var protocolRules = map[string]protocolRule{
	"chat":      {[]string{"openai", "openai-chat", "chat", "openai_chat", "openai_completions"}, []string{"/v1/chat/completions"}},
	"responses": {[]string{"openai-response", "openai-responses", "responses", "codex_responses"}, []string{"/v1/responses"}},
	"anthropic": {[]string{"anthropic", "anthropic-messages", "anthropic_messages", "claude code"}, []string{"/v1/messages"}},
	"gemini":    {[]string{"gemini", "google", "gemini-native", "gemini_native", "google_generative_ai", "gemini generatecontent"}, []string{"/v1beta/models/{model}:generateContent", "/v1/models/{model}:generateContent"}},
}

func supportsProtocol(m map[string]any, protocol string) bool {
	rule, ok := protocolRules[protocol]
	if !ok {
		return false
	}
	for _, typ := range array(m["supported_endpoint_types"]) {
		name := str(typ)
		if !slices.Contains(rule.Aliases, strings.ToLower(strings.TrimSpace(name))) {
			continue
		}
		detail := object(m["endpoints"])[name]
		if detail == nil {
			return true
		}
		path := ""
		switch d := detail.(type) {
		case string:
			path = d
		case map[string]any:
			method := str(d["method"])
			if method != "" && !strings.EqualFold(method, "POST") {
				continue
			}
			path = str(d["path"])
		default:
			continue
		}
		if path == "" || slices.Contains(rule.Paths, strings.TrimRight(path, "/")) {
			return true
		}
	}
	return false
}

func keyUsable(key map[string]any) bool {
	status, _ := integer(key["status"])
	expiry, ok := integer(key["expired_time"])
	quota, qok := integer(key["remain_quota"])
	return status == 1 && ok && (expiry == -1 || expiry > time.Now().Unix()) && (key["unlimited_quota"] == true || qok && quota > 0)
}
