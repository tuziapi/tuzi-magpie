package gui

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/yetone/magpie/internal/tuziaccount"
)

var tuziAccountOnce sync.Once
var tuziAccount *tuziaccount.Service

// The fixture build can replace this factory before the desktop starts. The
// production build never reads a caller-selected account origin.
var newTuziAccount = tuziaccount.New

func accountService() *tuziaccount.Service {
	tuziAccountOnce.Do(func() { tuziAccount = newTuziAccount() })
	return tuziAccount
}

// tuziAccountRoutes is mounted only in the native Handler, and every route
// additionally requires ownWindow's unforgeable context. A Web run key,
// loopback address, Origin header or gateway key is never sufficient.
func tuziAccountRoutes(mux *http.ServeMux, w Windows) {
	if isWeb(w) {
		return
	}
	serve := func(pattern string, fn http.HandlerFunc) {
		mux.HandleFunc(pattern, func(rw http.ResponseWriter, r *http.Request) {
			rw.Header().Set("Cache-Control", "no-store")
			rw.Header().Set("Pragma", "no-cache")
			if !tuziDesktopRequest(r) {
				tuziError(rw, &tuziaccount.Error{Code: "desktop_only", Message: "desktop_only", Status: 403})
				return
			}
			if r.Method != "GET" && !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
				tuziError(rw, &tuziaccount.Error{Code: "invalid_request", Message: "invalid_request", Status: 400})
				return
			}
			fn(rw, r)
		})
	}
	serve("GET /api/tuzi/state", func(rw http.ResponseWriter, r *http.Request) { writeJSON(rw, accountService().State()) })
	serve("POST /api/tuzi/connect", func(rw http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"token"`
		}
		if !tuziDecode(rw, r, &in) {
			return
		}
		writeJSON(rw, accountService().Connect(r.Context(), in.Token))
	})
	serve("POST /api/tuzi/check", func(rw http.ResponseWriter, r *http.Request) {
		var in struct{}
		if !tuziDecode(rw, r, &in) {
			return
		}
		writeJSON(rw, accountService().Check(r.Context()))
	})
	serve("POST /api/tuzi/disconnect", func(rw http.ResponseWriter, r *http.Request) {
		var in struct{}
		if !tuziDecode(rw, r, &in) {
			return
		}
		writeJSON(rw, accountService().Disconnect())
	})
	serve("POST /api/tuzi/request", func(rw http.ResponseWriter, r *http.Request) {
		var in tuziaccount.Request
		if !tuziDecode(rw, r, &in) {
			return
		}
		out, e := accountService().Request(r.Context(), in)
		if e != nil {
			tuziError(rw, e)
			return
		}
		writeJSON(rw, out)
	})
	serve("POST /api/tuzi/provider", func(rw http.ResponseWriter, r *http.Request) {
		var in tuziaccount.ProviderRequest
		if !tuziDecode(rw, r, &in) {
			return
		}
		out, e := accountService().AddProvider(r.Context(), in)
		if e != nil {
			tuziError(rw, e)
			return
		}
		writeJSON(rw, out)
	})
	serve("POST /api/tuzi/recover", func(rw http.ResponseWriter, r *http.Request) {
		var in struct {
			Generation  uint64 `json:"generation"`
			Acknowledge bool   `json:"acknowledge"`
		}
		if !tuziDecode(rw, r, &in) {
			return
		}
		out, e := accountService().Recover(r.Context(), in.Generation, in.Acknowledge)
		if e != nil {
			tuziError(rw, e)
			return
		}
		writeJSON(rw, out)
	})
	serve("POST /api/tuzi/open", func(rw http.ResponseWriter, r *http.Request) {
		var in struct {
			Target string `json:"target"`
		}
		if !tuziDecode(rw, r, &in) {
			return
		}
		u, ok := tuziaccount.WebURL(in.Target)
		if !ok {
			tuziError(rw, &tuziaccount.Error{Code: "invalid_request", Message: "invalid_request", Status: 400})
			return
		}
		if e := w.OpenURL(u); e != nil {
			tuziError(rw, &tuziaccount.Error{Code: "browser_unavailable", Message: "browser_unavailable"})
			return
		}
		if in.Target == "token" {
			accountService().ArmPrefill()
		}
		writeJSON(rw, map[string]bool{"opened": true})
	})
	serve("POST /api/tuzi/prefill", func(rw http.ResponseWriter, r *http.Request) {
		var in struct{}
		if !tuziDecode(rw, r, &in) {
			return
		}
		var read func() (string, bool)
		if native, ok := w.(interface{ TuziClipboardText() (string, bool) }); ok {
			read = native.TuziClipboardText
		}
		writeJSON(rw, map[string]string{"token": accountService().Prefill(read)})
	})
}
func tuziDesktopRequest(r *http.Request) bool {
	scheme, _ := r.Context().Value(windowSchemeKey{}).(string)
	if scheme == "" || apiFramed(r) || r.Header.Get("Authorization") != "" || r.Header.Get("X-API-Key") != "" {
		return false
	}
	host := r.Host
	if host != "localhost" && host != "wails.localhost" {
		return false
	}
	if origin := r.Header.Get("Origin"); origin != "" {
		u, e := url.Parse(origin)
		if e != nil || u.Scheme != scheme || u.Host != host || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "" {
			return false
		}
	}
	if ref := r.Header.Get("Referer"); ref != "" {
		u, e := url.Parse(ref)
		if e != nil || u.Scheme != scheme || u.Host != host || strings.HasPrefix(u.Path, pluginPagePrefix) {
			return false
		}
	}
	return true
}
func tuziDecode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 128<<10)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if d.Decode(v) != nil || d.Decode(new(any)) != io.EOF {
		tuziError(w, &tuziaccount.Error{Code: "invalid_request", Message: "invalid_request", Status: 400})
		return false
	}
	return true
}
func tuziError(w http.ResponseWriter, e *tuziaccount.Error) {
	status := e.Status
	if status < 400 || status > 599 {
		status = 400
		switch e.Code {
		case "not_connected", "invalid_token":
			status = 401
		case "stale_generation", "write_recovery_required", "readback_required":
			status = 409
		case "network_uncertain", "server_error", "dependency_unavailable":
			status = 502
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error": e})
}
