package tuziaccount

import (
	"context"
	"net/url"
	"strings"
	"time"
)

func (s *Service) Request(ctx context.Context, r Request) (Envelope, *Error) {
	if r.Method == "GET" && strings.HasPrefix(r.Path, "/account/keys/") && strings.HasSuffix(r.Path, "/models") {
		if len(r.Query) > 0 || len(r.Body) > 0 {
			return Envelope{}, problem("invalid_request")
		}
		return s.KeyModels(ctx, r.Generation, strings.TrimSuffix(strings.TrimPrefix(r.Path, "/account/keys/"), "/models"))
	}
	rt, e := routeFor(r)
	if e != nil {
		return Envelope{}, e
	}
	if rt.write {
		s.writeMu.Lock()
		defer s.writeMu.Unlock()
	}
	rec, e := s.credentials(r.Generation)
	if e != nil {
		return Envelope{}, e
	}
	if r.Path == "/account/capabilities" {
		return envelope(map[string]any{"scope_version": "system-token-v1", "required_scopes": []string{}, "native": map[string]bool{"account": true, "keys": true, "logs": true, "usage": true, "models": true, "performance": true, "profile_read": false, "profile_write": false}, "web": map[string]bool{"topup": true, "redemption": true, "personal": true}}), nil
	}
	if rt.write {
		s.mu.Lock()
		if s.record.Generation != r.Generation {
			s.mu.Unlock()
			return Envelope{}, problem("stale_generation")
		}
		if s.record.Pending != nil {
			s.mu.Unlock()
			return Envelope{}, problem("write_recovery_required")
		}
		pending := &PendingWrite{Method: r.Method, Path: r.Path, StartedAt: time.Now().Unix()}
		next := s.record
		next.Pending = pending
		if e := s.store.write(next); e != nil {
			s.mu.Unlock()
			return Envelope{}, e
		}
		s.record = next
		s.state.PendingWrite = pending
		s.mu.Unlock()
	}
	ctx, done := s.requestContext(ctx, r.Generation)
	defer done()
	raw, e := s.fetch(ctx, rt.method, rt.path, rt.query, rt.body, rec.Token, rec.Identity.UserID, rt.write)
	if e != nil {
		return s.finishRequest(r, rt, Envelope{}, e)
	}
	var status map[string]any
	if r.Path == "/account/account" {
		status, e = s.fetch(ctx, "GET", "/api/status", nil, nil, "", "", false)
		if e != nil {
			return s.finishRequest(r, rt, Envelope{}, e)
		}
	}
	if r.Path == "/account/usage" {
		q := url.Values{"summary": {"true"}, "start_timestamp": rt.query["start_time"], "end_timestamp": rt.query["end_time"]}
		coverage, ce := s.fetch(ctx, "GET", "/api/log/self/stat", q, nil, rec.Token, rec.Identity.UserID, false)
		if ce != nil {
			return Envelope{}, ce
		}
		if object(coverage["data"])["logs_available"] != true {
			return Envelope{}, problem("logs_unavailable")
		}
	}
	data, e := project(r, rt, raw, status)
	if e == nil && strings.HasSuffix(r.Path, "/reveal") {
		k := str(object(data)["key"])
		if k == rec.Token || k == "sk-"+rec.Token {
			e = problem("invalid_response")
		}
	}
	if e == nil && !strings.HasSuffix(r.Path, "/reveal") && !(r.Method == "POST" && r.Path == "/account/keys") {
		data = redactAccountToken(data, rec.Token)
	}

	if e != nil && rt.write {
		e.OutcomeUnknown = true
	}
	return s.finishRequest(r, rt, envelope(data), e)
}
func (s *Service) finishRequest(r Request, rt route, out Envelope, e *Error) (Envelope, *Error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.record.Generation != r.Generation {
		return Envelope{}, problem("stale_generation")
	}
	if rt.write && (e == nil || !e.OutcomeUnknown) {
		next := s.record
		next.Pending = nil
		if se := s.store.write(next); se != nil {
			se.OutcomeUnknown = true
			return Envelope{}, se
		}
		s.record = next
		s.state.PendingWrite = nil
	}
	if e != nil && (e.Code == "invalid_token" || e.Code == "account_disabled" || e.Code == "identity_mismatch") {
		s.state.Status = "invalid"
		s.state.Identity = nil
		s.state.Error = e
		s.state.Revision++
	}
	return out, e
}

// Recover reads the affected key/list, then requires a separate acknowledgment.
// A missing key is proof only for the exact not_found symbol, not error text.
func (s *Service) Recover(ctx context.Context, g uint64, ack bool) (Envelope, *Error) {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	rec, e := s.credentials(g)
	if e != nil {
		return Envelope{}, e
	}
	if rec.Pending == nil {
		return envelope(map[string]any{"pending": nil}), nil
	}
	if ack {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.record.Generation != g {
			return Envelope{}, problem("stale_generation")
		}
		if s.record.Pending == nil || !s.record.Pending.ReadBack {
			return Envelope{}, problem("readback_required")
		}
		next := s.record
		next.Pending = nil
		if e := s.store.write(next); e != nil {
			return Envelope{}, e
		}
		s.record = next
		s.state.PendingWrite = nil
		return envelope(map[string]any{"pending": nil}), nil
	}
	path := rec.Pending.Path
	if strings.HasSuffix(path, "/status") {
		path = strings.TrimSuffix(path, "/status")
	}
	read := Request{Method: "GET", Path: path, Generation: g}
	if path == "/account/keys" {
		read.Query = [][2]string{{"page", "1"}, {"page_size", "100"}}
	}
	out, e := s.Request(ctx, read)
	missing := e != nil && e.Code == "not_found" && rec.Pending.Method == "DELETE"
	if e != nil && !missing {
		return Envelope{}, e
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.record.Generation != g {
		return Envelope{}, problem("stale_generation")
	}
	next := s.record
	p := *rec.Pending
	p.ReadBack = true
	next.Pending = &p
	if e := s.store.write(next); e != nil {
		return Envelope{}, e
	}
	s.record = next
	s.state.PendingWrite = &p
	return envelope(map[string]any{"pending": p, "data": out.Data, "notFound": missing, "requiresConfirmation": true}), nil
}

// A server's ordinary error text can accidentally quote the bearer. Remove the
// active system token even from otherwise permitted public string fields.
func redactAccountToken(v any, token string) any {
	switch x := v.(type) {
	case string:
		if token != "" {
			return strings.ReplaceAll(x, token, "[redacted]")
		}
		return x
	case map[string]any:
		for k, val := range x {
			x[k] = redactAccountToken(val, token)
		}
	case []any:
		for i, val := range x {
			x[i] = redactAccountToken(val, token)
		}
	}
	return v
}
