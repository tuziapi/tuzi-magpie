package tuziaccount

import (
	"encoding/json"
	"strconv"
	"strings"
)

func project(r Request, rt route, raw, status map[string]any) (any, *Error) {
	v := object(raw["data"])
	p := r.Path
	switch p {
	case "/account/account":
		d := pick(v, "username display_name group quota used_quota request_count")
		id, e := decimal(v["id"])
		if e != nil {
			return nil, e
		}
		d["user_id"] = id
		d["status"] = "enabled"
		if e := decimals(d, "quota used_quota request_count"); e != nil {
			return nil, e
		}
		st := object(status["data"])
		money := map[string]any{"base_currency": "USD", "display_type": st["quota_display_type"], "custom_currency_symbol": st["custom_currency_symbol"]}
		for _, k := range []string{"quota_per_unit", "usd_exchange_rate", "custom_currency_exchange_rate"} {
			n, ok := st[k].(json.Number)
			if !ok {
				return nil, problem("invalid_response")
			}
			money[k] = n.String()
		}
		d["money"] = money
		return d, nil
	case "/account/keys":
		if r.Method == "GET" {
			return pageProjection(v, keyProjection)
		}
		id, e := decimal(v["id"])
		if e != nil {
			return nil, e
		}
		k, e := fullKey(v["key"])
		if e != nil {
			return nil, e
		}
		return map[string]any{"id": id, "key": k}, nil
	case "/account/key-groups":
		a, ok := raw["data"].([]any)
		if !ok {
			return nil, problem("invalid_response")
		}
		out := []any{}
		for _, item := range a {
			g := object(item)
			out = append(out, map[string]any{"id": g["value"], "label": g["key"]})
		}
		return out, nil
	case "/account/logs":
		return pageProjection(v, logProjection)
	case "/account/logs/summary":
		return summaryProjection(v)
	case "/account/logs/statistics":
		summary, e := summaryProjection(object(v["summary"]))
		if e != nil {
			return nil, e
		}
		d := map[string]any{"summary": summary}
		for _, k := range []string{"trend", "by_model", "by_error"} {
			rows, ok := v[k].([]any)
			if !ok {
				return nil, problem("invalid_response")
			}
			out := []any{}
			for _, row := range rows {
				a := pick(object(row), "start_timestamp end_timestamp bucket_start bucket_end model_name error_code request_count record_count error_count quota prompt_tokens completion_tokens refund_quota")
				for _, f := range strings.Fields("request_count record_count error_count quota prompt_tokens completion_tokens refund_quota") {
					if a[f] != nil {
						n, e := decimal(a[f])
						if e != nil {
							return nil, e
						}
						a[f] = n
					}
				}
				out = append(out, a)
			}
			d[k] = out
		}
		return d, nil
	case "/account/usage/summary":
		if v["logs_available"] != true {
			return nil, problem("logs_unavailable")
		}
		d := usageMeta(r, rt)
		for _, k := range []string{"quota", "prompt_tokens", "completion_tokens", "refund_quota"} {
			n, e := decimal(v[k])
			if e != nil {
				return nil, e
			}
			d[k] = n
		}
		n, e := decimal(v["request_count"])
		if e != nil {
			return nil, e
		}
		d["call_count"] = n
		return d, nil
	case "/account/usage":
		d := usageMeta(r, rt)
		for _, k := range []string{"chart", "table"} {
			out := []any{}
			for _, row := range array(v[k]) {
				a := pick(object(row), "bucket_start bucket_end model_name call_count quota prompt_tokens completion_tokens")
				if e := decimals(a, "call_count quota prompt_tokens completion_tokens"); e != nil {
					return nil, e
				}
				out = append(out, a)
			}
			d[k] = out
		}
		return d, nil
	case "/account/models":
		items, ok := raw["data"].([]any)
		if !ok {
			return nil, problem("invalid_response")
		}
		out := []any{}
		for _, item := range items {
			m, e := modelProjection(object(item), 0)
			if e != nil {
				return nil, e
			}
			out = append(out, m)
		}
		pagination := pick(object(raw["pagination"]), "page page_size total has_more")
		if e := decimals(pagination, "total"); e != nil {
			return nil, e
		}
		d := pick(raw, "snapshot_id snapshot_refreshed api_version schema_version algorithm_version")
		d["items"] = out
		d["pagination"] = pagination
		d["pricing_meta"] = pricingMeta(object(raw["meta"]))
		return d, nil
	case "/account/model-performance":
		return performanceProjection(v), nil
	case "/account/model-performance/batch":
		a, ok := raw["data"].([]any)
		if !ok {
			return nil, problem("invalid_response")
		}
		out := []any{}
		for _, item := range a {
			out = append(out, performanceProjection(object(item)))
		}
		return out, nil
	}
	if strings.HasPrefix(p, "/account/keys/") {
		if r.Method == "DELETE" {
			return map[string]any{}, nil
		}
		if strings.HasSuffix(p, "/reveal") {
			key, e := fullKey(v["key"])
			return map[string]any{"key": key}, e
		}
		return keyProjection(v)
	}
	if strings.HasPrefix(p, "/account/logs/requests/") {
		a, ok := raw["data"].([]any)
		if !ok {
			return nil, problem("invalid_response")
		}
		out := []any{}
		for i, row := range a {
			if i == 100 {
				break
			}
			v, e := logProjection(object(row))
			if e != nil {
				return nil, e
			}
			out = append(out, v)
		}
		return map[string]any{"request_id": strings.TrimPrefix(p, "/account/logs/requests/"), "items": out, "has_more": len(a) > 100}, nil
	}
	return nil, problem("invalid_request")
}
func keyProjection(v map[string]any) (map[string]any, *Error) {
	d := pick(v, "id name status group created_time accessed_time expired_time remain_quota unlimited_quota used_quota model_limits_enabled model_limits allow_ips exclude_ips is_expired")
	if e := decimals(d, "id remain_quota used_quota"); e != nil {
		return nil, e
	}
	// Never trust a list/detail field to be masked. Only a suffix is projected.
	k := str(v["key"])
	if len(k) > 4 {
		k = k[len(k)-4:]
	}
	if k != "" {
		k = "••••" + k
	}
	d["masked_key"] = k
	return d, nil
}
func pageProjection(v map[string]any, mapper func(map[string]any) (map[string]any, *Error)) (map[string]any, *Error) {
	a, ok := v["items"].([]any)
	if !ok {
		return nil, problem("invalid_response")
	}
	d := pick(v, "page page_size total")
	if e := decimals(d, "total"); e != nil {
		return nil, e
	}
	page, pok := integer(v["page"])
	size, sok := integer(v["page_size"])
	total, tok := integer(v["total"])
	if !pok || !sok || !tok || page < 1 || size < 1 || size > 100 || total < 0 {
		return nil, problem("invalid_response")
	}
	d["has_more"] = page <= total/size && (page < total/size || total%size != 0)
	out := []any{}
	for _, row := range a {
		item, e := mapper(object(row))
		if e != nil {
			return nil, e
		}
		out = append(out, item)
	}
	d["items"] = out
	return d, nil
}
func logProjection(v map[string]any) (map[string]any, *Error) {
	d := pick(v, "id type created_at model_name token_name request_id quota prompt_tokens completion_tokens is_stream")
	if e := decimals(d, "id quota prompt_tokens completion_tokens"); e != nil {
		return nil, e
	}
	var other map[string]any
	dec := json.NewDecoder(strings.NewReader(str(v["other"])))
	dec.UseNumber()
	_ = dec.Decode(&other)
	d["group"] = v["token_group"]
	seconds, _ := integer(v["use_time"])
	if seconds < 0 || seconds > 9223372036854775 {
		return nil, problem("invalid_response")
	}
	d["duration_ms"] = seconds * 1000
	typ, _ := integer(v["type"])
	result := "unknown"
	switch str(other["call_status"]) {
	case "success":
		result = "success"
	case "error", "error_charged":
		result = "error"
	}
	if typ == 6 {
		result = "error"
	}
	d["result"] = result
	billing := "unknown"
	if typ == 7 || other["refunded"] == true {
		billing = "refunded"
	} else if hasWord("charged not_charged", str(other["billing_status"])) {
		billing = str(other["billing_status"])
	}
	d["billing_status"] = billing
	d["request_path"] = other["request_path"]
	d["upstream_request_id"] = v["upstream_request_id"]
	for _, k := range []string{"error_code", "public_error_code", "error_message", "status_code"} {
		d[k] = nil
	}
	if result == "error" {
		c := str(other["error_code"])
		d["public_error_code"] = c
		d["status_code"] = other["status_code"]
		if !hasWord("upstream_error rate_limited timeout validation_error policy_denied", c) {
			c = "unknown_error"
		}
		d["error_code"] = c
		d["error_message"] = safePublicError(str(v["content"]))
	}
	return d, nil
}

// Public errors are bounded and obvious credentials are removed even if an old
// server puts them into its ordinary-user message. Other/admin_info never leave.
func safePublicError(s string) string {
	if len(s) > 2048 {
		s = s[:2048]
	}
	for _, needle := range []string{"Bearer ", "sk-"} {
		for i := strings.Index(s, needle); i >= 0; i = strings.Index(s, needle) {
			end := i + len(needle)
			for end < len(s) && !strings.ContainsRune(" \t\r\n\"'", rune(s[end])) {
				end++
			}
			s = s[:i] + "[redacted]" + s[end:]
		}
	}
	return s
}
func summaryProjection(v map[string]any) (map[string]any, *Error) {
	if v["logs_available"] == false {
		return nil, problem("logs_unavailable")
	}
	d := pick(v, "record_count error_count quota prompt_tokens completion_tokens refund_quota start_timestamp end_timestamp coverage")
	if e := decimals(d, "record_count error_count quota prompt_tokens completion_tokens refund_quota"); e != nil {
		return nil, e
	}
	return d, nil
}
func usageMeta(r Request, rt route) map[string]any {
	find := func(k string) string {
		for _, p := range r.Query {
			if p[0] == k {
				return p[1]
			}
		}
		if k == "start_time" {
			return rt.query.Get("start_timestamp")
		}
		if k == "end_time" {
			return rt.query.Get("end_timestamp")
		}
		return rt.query.Get(k)
	}
	start, _ := strconv.ParseInt(find("start_time"), 10, 64)
	end, _ := strconv.ParseInt(find("end_time"), 10, 64)
	return map[string]any{"source": "usage", "timezone": find("timezone"), "start_time": start, "end_time": end, "data_as_of": nil, "estimated_delay_seconds": nil, "coverage": "recorded_logs_only"}
}
func fullKey(v any) (string, *Error) {
	s := str(v)
	if s == "" || len(s) > 4096 || strings.ContainsAny(s, " \r\n\t") {
		return "", problem("invalid_response")
	}
	if !strings.HasPrefix(s, "sk-") {
		s = "sk-" + s
	}
	return s, nil
}
func metricProjection(v map[string]any) map[string]any {
	d := pick(v, "group has_samples sample_level ttft_sample_level latest_sample_ts")
	has := v["has_samples"] == true
	for _, k := range []string{"avg_latency_ms", "avg_ttft_ms", "success_rate"} {
		d[k] = nil
		if has && (k != "avg_ttft_ms" || v["ttft_sample_level"] != "none" && v["has_ttft"] != false) {
			d[k] = v[k]
		}
	}
	if !has {
		d["latest_sample_ts"] = nil
	}
	history := map[string]any{}
	for _, k := range []string{"avg_latency_ms", "avg_ttft_ms", "success_rate"} {
		p := object(object(v["historical_values"])[k])
		if p == nil {
			history[k] = nil
		} else {
			history[k] = pick(p, "value ts")
		}
	}
	d["historical_values"] = history
	points := []any{}
	for _, item := range array(v["half_hour_series"]) {
		p := object(item)
		a := pick(p, "ts has_samples")
		for _, k := range []string{"avg_latency_ms", "avg_ttft_ms", "success_rate"} {
			a[k] = nil
			if p["has_samples"] == true && (k != "avg_ttft_ms" || p["has_ttft"] == true) {
				a[k] = p[k]
			}
		}
		points = append(points, a)
	}
	d["half_hour_series"] = points
	return d
}
func performanceProjection(v map[string]any) map[string]any {
	groups := []any{}
	for _, g := range array(v["groups"]) {
		groups = append(groups, metricProjection(object(g)))
	}
	return map[string]any{"model_name": v["model_name"], "series_schema": v["series_schema"], "aggregate": metricProjection(object(v["aggregate"])), "groups": groups}
}

const priceFields = "model_name aliases description description_i18n icon tags vendor_id quota_type model_ratio model_price pricing_unavailable owner_by completion_ratio cache_ratio create_cache_ratio create_cache_ratio_5m create_cache_ratio_1h web_search_price image_ratio video_ratio image_cache_ratio image_output_ratio audio_ratio audio_cache_ratio audio_completion_ratio enable_groups supported_endpoint_types billing_mode billing_expr pricing_version"

func modelProjection(v map[string]any, depth int) (map[string]any, *Error) {
	if str(v["model_name"]) == "" || depth > 4 {
		return nil, problem("invalid_response")
	}
	d := pick(v, priceFields)
	for _, k := range []string{"aliases", "enable_groups", "supported_endpoint_types"} {
		a := array(v[k])
		if a == nil {
			a = []any{}
		}
		d[k] = a
	}
	endpoints := map[string]any{}
	for k, val := range object(v["endpoints"]) {
		if m := object(val); m != nil {
			endpoints[k] = pick(m, "path method")
		} else if s, ok := val.(string); ok {
			endpoints[k] = s
		}
	}
	d["endpoints"] = endpoints
	related := []any{}
	for _, item := range array(v["related_pricing"]) {
		m, e := modelProjection(object(item), depth+1)
		if e != nil {
			return nil, e
		}
		related = append(related, m)
	}
	d["related_pricing"] = related
	// Task pricing is a public catalog schema, not an arbitrary object. Preserve
	// supported fields only; unsupported expression UI can link to the website.
	for _, k := range []string{"conditional_task_pricing", "conditional_task_pricing_details", "task_per_second_pricing", "per_call_variants"} {
		d[k] = priceDetail(v[k], 0)
	}
	return d, nil
}
func priceDetail(v any, depth int) any {
	if depth > 6 {
		return nil
	}
	switch x := v.(type) {
	case map[string]any:
		out := map[string]any{}
		for k, val := range x {
			if hasWord("no_video_price no_video_price_currency video_price video_price_currency has_video_input has_audio_input unit_price unit_price_currency estimate_mode rule_identifier reference_markdown price_variants variants resolution ratio width height fps has_floor floor_durations unit default_duration_sec max_duration_sec label tags price extra_ratio currency", k) {
				out[k] = priceDetail(val, depth+1)
			}
		}
		return out
	case []any:
		out := []any{}
		for _, val := range x {
			out = append(out, priceDetail(val, depth+1))
		}
		return out
	case string, json.Number, bool, nil:
		return x
	}
	return nil
}
func pricingMeta(v map[string]any) map[string]any {
	d := map[string]any{}
	if group, ok := v["default_effective_group"].(string); ok {
		d["default_effective_group"] = group
	}
	// These are server-projected public catalog structures, keyed by visible
	// group/model names. Personal discounts are deliberately not copied.
	for _, k := range []string{"usable_group", "base_group_ratio", "group_ratio"} {
		d[k] = scalarMap(v[k])
	}
	resolution := map[string]any{}
	for k, val := range object(v["default_resolution"]) {
		resolution[k] = pick(object(val), "effective_group")
	}
	d["default_resolution"] = resolution
	groups := map[string]any{}
	for k, val := range object(v["all_level_group_info"]) {
		groups[k] = pick(object(val), "DisplayName Description")
	}
	d["all_level_group_info"] = groups
	plans := map[string]any{}
	for g, val := range object(v["group_model_pricing"]) {
		plan := map[string]any{}
		for k, x := range object(val) {
			if hasWord("effective_group quota_type billing_expr model_price model_second_price model_ratio pricing_source pricing_semantics model_multiplier model_completion_ratio model_cache_ratio model_create_cache_ratio model_create_cache_ratio_5m model_create_cache_ratio_1h model_image_ratio model_image_cache_ratio model_image_output_ratio model_audio_ratio model_audio_cache_ratio model_audio_completion_ratio", k) {
				plan[k] = scalarMap(x)
			}
		}
		plans[g] = plan
	}
	d["group_model_pricing"] = plans
	d["filter_facets"] = facets(v["filter_facets"])
	d["result_facets"] = facets(v["result_facets"])
	vendors := []any{}
	for _, item := range array(v["vendors"]) {
		vendors = append(vendors, pick(object(item), "id name description icon"))
	}
	d["vendors"] = vendors
	return d
}

func scalarMap(v any) map[string]any {
	out := map[string]any{}
	for k, x := range object(v) {
		switch x.(type) {
		case string, json.Number, bool, nil:
			out[k] = x
		}
	}
	return out
}

func facets(v any) map[string]any {
	d := map[string]any{"total": object(v)["total"]}
	for _, k := range []string{"groups", "quota_types", "endpoint_types", "vendors", "tags"} {
		d[k] = scalarMap(object(v)[k])
	}
	return d
}
