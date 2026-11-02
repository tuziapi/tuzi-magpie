package tuziaccount

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

func (s *Service) fetch(ctx context.Context, method, path string, q url.Values, body any, token, user string, write bool) (map[string]any, *Error) {
	var b []byte
	var err error
	if body != nil {
		b, err = json.Marshal(body)
		if err != nil {
			return nil, problem("invalid_request")
		}
	}
	u := s.origin + path
	if len(q) > 0 {
		u += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, u, bytes.NewReader(b))
	if err != nil {
		return nil, problem("invalid_request")
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if user != "" {
		req.Header.Set("New-Api-User", user)
	}
	res, err := s.http.Do(req)
	if err != nil {
		e := problem("network_uncertain")
		e.OutcomeUnknown = write
		return nil, e
	}
	defer res.Body.Close()
	b, err = io.ReadAll(io.LimitReader(res.Body, (8<<20)+1))
	if err != nil || len(b) > 8<<20 {
		e := problem("invalid_response")
		e.OutcomeUnknown = write
		return nil, e
	}
	var raw map[string]any
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	parse := dec.Decode(&raw)
	if parse == nil && dec.Decode(new(any)) != io.EOF {
		parse = io.ErrUnexpectedEOF
	}
	if parse == nil && res.StatusCode >= 200 && res.StatusCode < 300 && raw["success"] == true {
		return raw, nil
	}
	code := "server_error"
	switch res.StatusCode {
	case 400:
		code = "invalid_request"
	case 401:
		code = "invalid_token"
	case 403:
		code = "insufficient_scope"
	case 404:
		code = "not_found"
	case 409:
		code = "conflict"
	case 429:
		code = "rate_limited"
	case 503:
		code = "dependency_unavailable"
	default:
		if res.StatusCode >= 200 && res.StatusCode < 300 {
			code = "business_error"
			if parse != nil {
				code = "invalid_response"
			}
		}
	}
	symbol := str(object(raw["error"])["code"])
	switch symbol {
	case "invalid_token", "account_disabled", "identity_mismatch", "invalid_request", "not_found", "conflict", "dependency_unavailable", "logs_unavailable", "snapshot_changed":
		code = symbol
	case "session_expired":
		code = "invalid_token"
	}
	e := problem(code)
	e.Status = res.StatusCode
	e.OutcomeUnknown = write && (res.StatusCode >= 500 || parse != nil)
	e.RetryAfter, _ = strconv.Atoi(res.Header.Get("Retry-After"))
	if e.RetryAfter < 0 {
		e.RetryAfter = 0
	}
	return nil, e
}
func object(v any) map[string]any { m, _ := v.(map[string]any); return m }
func array(v any) []any           { a, _ := v.([]any); return a }
func str(v any) string            { s, _ := v.(string); return s }
func integer(v any) (int64, bool) {
	switch x := v.(type) {
	case json.Number:
		n, e := x.Int64()
		return n, e == nil
	case int64:
		return x, true
	case int:
		return int64(x), true
	case string:
		n, e := strconv.ParseInt(x, 10, 64)
		return n, e == nil
	}
	return 0, false
}
func decimal(v any) (string, *Error) {
	var s string
	switch x := v.(type) {
	case json.Number:
		s = x.String()
	case string:
		s = x
	default:
		return "", problem("invalid_response")
	}
	if s == "" {
		return "", problem("invalid_response")
	}
	t := strings.TrimPrefix(s, "-")
	if t == "" || strings.IndexFunc(t, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
		return "", problem("invalid_response")
	}
	if _, e := strconv.ParseInt(s, 10, 64); e != nil {
		return "", problem("invalid_response")
	}
	return s, nil
}
func pick(v map[string]any, fields string) map[string]any {
	out := map[string]any{}
	for _, k := range strings.Fields(fields) {
		out[k] = v[k]
	}
	return out
}
func decimals(v map[string]any, fields string) *Error {
	for _, k := range strings.Fields(fields) {
		n, e := decimal(v[k])
		if e != nil {
			return e
		}
		v[k] = n
	}
	return nil
}
