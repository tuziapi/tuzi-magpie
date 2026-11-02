package tuziaccount

import (
	"bytes"
	"encoding/json"
	"io"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type route struct {
	method, path string
	query        url.Values
	body         any
	write        bool
}

func routeFor(r Request) (route, *Error) {
	out := route{method: r.Method, query: url.Values{}}
	p := r.Path
	bad := func() (route, *Error) { return route{}, problem("invalid_request") }
	allowed := ""
	switch p {
	case "/account/account":
		if r.Method != "GET" {
			return bad()
		}
		out.path = "/api/user/self"
	case "/account/capabilities":
		if r.Method != "GET" {
			return bad()
		}
	case "/account/key-groups":
		if r.Method != "GET" {
			return bad()
		}
		out.path = "/api/token/group"
	case "/account/keys":
		if r.Method != "GET" && r.Method != "POST" {
			return bad()
		}
		out.path = "/api/token/"
		if r.Method == "GET" {
			allowed = "page page_size keyword token group status"
		}
	case "/account/logs":
		if r.Method != "GET" {
			return bad()
		}
		out.path = "/api/log/self"
		allowed = "page page_size start_timestamp end_timestamp type token_name model_name group request_id upstream_request_id request_path error_keyword"
	case "/account/logs/summary", "/account/logs/statistics":
		if r.Method != "GET" {
			return bad()
		}
		out.path = "/api/log/self/stat"
		allowed = "start_timestamp end_timestamp type token_name model_name group request_id upstream_request_id request_path error_keyword interval_seconds"
	case "/account/usage/summary", "/account/usage":
		if r.Method != "GET" {
			return bad()
		}
		out.path = "/api/log/self/stat"
		if p == "/account/usage" {
			out.path = "/api/data/consumption_stats"
		}
		allowed = "start_time end_time timezone interval_seconds model_name"
	case "/account/models":
		if r.Method != "GET" {
			return bad()
		}
		out.path = "/api/pricing/models"
		allowed = "page page_size snapshot_id search group quota_type endpoint_type vendor tag models"
	case "/account/model-performance":
		if r.Method != "GET" {
			return bad()
		}
		out.path = "/api/perf-metrics"
		allowed = "model hours resolution group groups"
	case "/account/model-performance/batch":
		if r.Method != "POST" {
			return bad()
		}
		out.path = "/api/perf-metrics/batch"
	default:
		if rest, ok := strings.CutPrefix(p, "/account/keys/"); ok {
			parts := strings.Split(rest, "/")
			if len(parts) > 2 || !validID(parts[0]) {
				return bad()
			}
			suffix := ""
			if len(parts) == 2 {
				suffix = parts[1]
			}
			if suffix == "" && (r.Method == "GET" || r.Method == "PATCH" || r.Method == "DELETE") {
				out.path = "/api/token/" + parts[0]
			} else if suffix == "status" && r.Method == "PATCH" {
				out.path = "/api/token/" + parts[0]
			} else if suffix == "reveal" && r.Method == "POST" {
				out.path = "/api/token/" + parts[0] + "/key"
			} else {
				return bad()
			}
		} else if id, ok := strings.CutPrefix(p, "/account/logs/requests/"); ok && r.Method == "GET" {
			if id == "" || len(id) > 768 || strings.ContainsAny(id, "/\\?#%\r\n") || id == "." || id == ".." {
				return bad()
			}
			out.path = "/api/log/self/request/" + url.PathEscape(id)
		} else {
			return bad()
		}
	}
	for _, q := range r.Query {
		k, v := q[0], q[1]
		if !hasWord(allowed, k) || len(v) > 2048 {
			return bad()
		}
		if _, ok := out.query[k]; ok && !hasWord("models groups quota_type endpoint_type vendor tag", k) {
			return bad()
		}
		if k == "page" || k == "page_size" {
			n, e := strconv.Atoi(v)
			if e != nil || n < 1 || (k == "page_size" && n > 100) {
				return bad()
			}
		}
		if k == "hours" && !hasWord("1 6 24", v) {
			return bad()
		}
		if k == "token" && v != "" {
			if len(v) != 4 || strings.IndexFunc(v, func(r rune) bool { return !(r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9') }) >= 0 {
				return bad()
			}
			v = "%" + v
		}
		out.query.Add(k, v)
	}
	if len(r.Body) > 0 {
		dec := json.NewDecoder(bytes.NewReader(r.Body))
		dec.UseNumber()
		var body map[string]any
		if dec.Decode(&body) != nil || dec.Decode(new(any)) != io.EOF || len(body) == 0 {
			return bad()
		}
		if p == "/account/model-performance/batch" {
			for k, v := range body {
				if !hasWord("models groups hours resolution", k) || v == nil {
					return bad()
				}
			}
			ms, ok := body["models"].([]any)
			if !ok || len(ms) == 0 || len(ms) > 6 {
				return bad()
			}
			for _, m := range ms {
				if str(m) == "" || len(str(m)) > 256 {
					return bad()
				}
			}
			if gs, ok := body["groups"]; ok {
				a, ok := gs.([]any)
				if !ok || len(a) > 100 {
					return bad()
				}
				for _, g := range a {
					if str(g) == "" {
						return bad()
					}
				}
			}
			n, ok := integer(body["hours"])
			if !ok || (n != 1 && n != 6 && n != 24) {
				return bad()
			}
			if body["resolution"] == "30m" {
				body["resolution"] = "half_hourly"
			}
		} else if (r.Method == "PATCH" || r.Method == "POST") && !strings.HasSuffix(p, "/reveal") && strings.HasPrefix(p, "/account/keys") {
			for k, v := range body {
				if !hasWord("name status expired_time remain_quota unlimited_quota model_limits_enabled model_limits allow_ips exclude_ips group", k) || v == nil {
					return bad()
				}
				switch k {
				case "status", "expired_time", "remain_quota":
					if k != "remain_quota" {
						if _, ok := v.(json.Number); !ok {
							return bad()
						}
					}
					n, ok := integer(v)
					if !ok || k == "status" && (n != 1 && n != 2) || k == "remain_quota" && n < 0 || k == "expired_time" && n < -1 {
						return bad()
					}
					body[k] = n
				case "unlimited_quota", "model_limits_enabled":
					if _, ok := v.(bool); !ok {
						return bad()
					}
				default:
					if _, ok := v.(string); !ok || len(str(v)) > 65536 {
						return bad()
					}
				}
			}
			if strings.HasSuffix(p, "/status") && (len(body) != 1 || body["status"] == nil) {
				return bad()
			}
		} else {
			return bad()
		}
		out.body = body
	} else if r.Method == "PATCH" || p == "/account/model-performance/batch" || r.Method == "POST" && p == "/account/keys" {
		return bad()
	}
	out.write = r.Method != "GET" && !strings.HasSuffix(p, "/reveal") && p != "/account/model-performance/batch"
	if p == "/account/keys" || p == "/account/logs" {
		if vs, ok := out.query["page"]; ok {
			out.query["p"] = vs
			delete(out.query, "page")
		}
	}
	if strings.HasPrefix(p, "/account/usage") || hasWord("/account/logs /account/logs/summary /account/logs/statistics", p) {
		a, z := "start_timestamp", "end_timestamp"
		usage := strings.HasPrefix(p, "/account/usage")
		if usage {
			a, z = "start_time", "end_time"
		}
		av, zv := out.query.Get(a), out.query.Get(z)
		if (av == "") != (zv == "") {
			return bad()
		}
		start, end := time.Now().Add(-7*24*time.Hour).Unix(), time.Now().Unix()
		if av != "" {
			var e error
			start, e = strconv.ParseInt(av, 10, 64)
			if e != nil {
				return bad()
			}
			end, e = strconv.ParseInt(zv, 10, 64)
			if e != nil {
				return bad()
			}
		}
		if start < 0 || end <= start || end-start > 90*86400 {
			return bad()
		}
		if usage {
			if _, e := time.LoadLocation(out.query.Get("timezone")); e != nil || out.query.Get("timezone") == "" {
				return bad()
			}
		}
		out.query.Set(a, strconv.FormatInt(start, 10))
		if p == "/account/logs" {
			end--
		}
		out.query.Set(z, strconv.FormatInt(end, 10))
		if usage {
			delete(out.query, "timezone")
			if p == "/account/usage/summary" {
				out.query["start_timestamp"] = out.query[a]
				out.query["end_timestamp"] = out.query[z]
				delete(out.query, a)
				delete(out.query, z)
				delete(out.query, "interval_seconds")
			} else {
				out.query.Set("self", "true")
				out.query.Set("source", "usage")
			}
		}
	}
	if out.path == "/api/log/self/stat" {
		out.query.Set("summary", "true")
		if p == "/account/logs/statistics" {
			out.query.Set("statistics", "true")
		}
	}
	if p == "/account/model-performance" {
		for _, k := range []string{"group", "groups"} {
			if a, ok := out.query[k]; ok {
				out.query["groups_v2"] = append(out.query["groups_v2"], a...)
				delete(out.query, k)
			}
		}
		if out.query.Get("resolution") == "30m" {
			out.query.Set("resolution", "half_hourly")
		}
	}
	return out, nil
}
func hasWord(words, value string) bool {
	for _, w := range strings.Fields(words) {
		if w == value {
			return true
		}
	}
	return false
}
func validID(s string) bool {
	n, e := strconv.ParseInt(s, 10, 64)
	return e == nil && n > 0 && strconv.FormatInt(n, 10) == s
}
