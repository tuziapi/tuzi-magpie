package tuziaccount

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"slices"
	"strings"
)

// KeyModels reads the model API's own listing using only the selected model
// key. It is a read, never a probe/inference, and never returns the secret.
func (s *Service) KeyModels(ctx context.Context, g uint64, id string) (Envelope, *Error) {
	if !validID(id) {
		return Envelope{}, problem("invalid_request")
	}
	key, e := s.Request(ctx, Request{Method: "GET", Path: "/account/keys/" + id, Generation: g})
	if e != nil {
		return Envelope{}, e
	}
	detail := object(key.Data)
	if !keyUsable(detail) {
		return Envelope{}, problem("provider_selection_not_qualified")
	}
	secret, e := s.Request(ctx, Request{Method: "POST", Path: "/account/keys/" + id + "/reveal", Generation: g})
	if e != nil {
		return Envelope{}, e
	}
	ctx, done := s.requestContext(ctx, g)
	defer done()
	req, e0 := http.NewRequestWithContext(ctx, "GET", s.origin+"/v1/models", nil)
	if e0 != nil {
		return Envelope{}, problem("invalid_request")
	}
	req.Header.Set("Authorization", "Bearer "+str(object(secret.Data)["key"]))
	req.Header.Set("Accept", "application/json")
	res, e0 := s.http.Do(req)
	if e0 != nil {
		return Envelope{}, problem("model_list_unavailable")
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return Envelope{}, problem("model_list_unavailable")
	}
	dec := json.NewDecoder(io.LimitReader(res.Body, 8<<20))
	dec.UseNumber()
	var raw map[string]any
	if dec.Decode(&raw) != nil {
		return Envelope{}, problem("invalid_response")
	}
	items, ok := raw["data"].([]any)
	if !ok {
		return Envelope{}, problem("invalid_response")
	}
	allowed := strings.Split(str(detail["model_limits"]), ",")
	for i := range allowed {
		allowed[i] = strings.TrimSpace(allowed[i])
	}
	hasLimits := detail["model_limits_enabled"] == true && strings.TrimSpace(str(detail["model_limits"])) != ""
	out := []any{}
	for _, item := range items {
		m := object(item)
		name := str(m["id"])
		if name == "" || len(name) > 256 {
			return Envelope{}, problem("invalid_response")
		}
		if hasLimits && !slices.Contains(allowed, name) {
			continue
		}
		m["model_name"] = name
		projected, e := modelProjection(m, 0)
		if e != nil {
			return Envelope{}, e
		}
		out = append(out, pick(projected, "model_name supported_endpoint_types endpoints"))
	}
	if _, e = s.credentials(g); e != nil {
		return Envelope{}, e
	}
	return envelope(map[string]any{"items": out, "key": detail}), nil
}
