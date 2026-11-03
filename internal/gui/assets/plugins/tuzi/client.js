// The desktop account workspace keeps account data and revealed keys in memory.
// Its native facade owns authentication, authorization, projection and persistence.
(() => {
  if (window.bootPrefs?.web) return;
  magpie.plugin("tuzi", (ctx) => {
    const ui = ctx.ui;
    const tabs = [["keys", "API keys"], ["logs", "Tuzi call details"], ["models", "Model marketplace"], ["performance", "Tuzi model status"]];
    let root, header, pane, notice, sheet, tabbar, active = false, tab = "keys", serial = 0, lifecycle = 0;
    let state = { status: "disconnected", generation: 0, identity: null }, account = null, groups = [];
    let busy = false, controller = new AbortController(), timer = null, unknownWrite = false;
    let currency = "CNY", currentCatalog = null, currentKeys = null, sheetGeneration = 0;
    let dirtyForm = null, discardPrompt = null, searchTimer = null;
    let filters = freshFilters();
    try { if (localStorage.getItem("tuzi-magpie.currency") === "USD") currency = "USD"; } catch {}
    function freshFilters() {
      const now = new Date(), start = new Date(now); start.setHours(0, 0, 0, 0);
      return { keys: { page: 1, page_size: 20, keyword: "", token: "", group: "", status: "" }, logs: { page: 1, page_size: 10, start_timestamp: Math.floor(start / 1000), end_timestamp: Math.floor(now / 1000), type: "", token_name: "", model_name: "", group: "", request_id: "", upstream_request_id: "", request_path: "", error_keyword: "" }, models: { page: 1, page_size: 20, search: "" }, performance: { page: 1, page_size: 6, search: "", hours: 6 } };
    }
    const node = (tag, cls, text) => ui.el(tag, cls, text);
    const button = (label, fn, cls = "text") => ui.button(t(label), fn, cls);
    function text(label, cls = "tuzi-notice") { return node("p", cls, t(label)); }
    function empty(label) { return node("div", "list tuzi-empty", t(label)); }
    function row(...children) { const n = node("div", "tuzi-actions"); n.append(...children); return n; }
    function note(label, error = false) {
      notice.textContent = label; notice.classList.toggle("tuzi-error", error); notice.hidden = !label;
      if (sheet && !sheet.hidden) { let n = sheet.querySelector(".tuzi-dialog-note"); if (!n) { n = node("p", "tuzi-notice tuzi-dialog-note"); n.setAttribute("role", "alert"); sheet.prepend(n); } n.textContent = label; n.classList.toggle("tuzi-error", error); n.hidden = !label; }
    }
    function errorText(e) {
      const labels = { not_connected: "Connect your Tuzi account first.", invalid_token: "The system token is invalid. Connect again.", unauthorized: "The system token is invalid. Connect again.", identity_mismatch: "The system token is invalid. Connect again.", account_disabled: "This account is disabled.", permission_denied: "This account cannot perform that operation.", forbidden: "This account cannot perform that operation.", network: "The service is unreachable. Your saved connection is kept.", network_error: "The service is unreachable. Your saved connection is kept.", network_uncertain: "The service is unreachable. Your saved connection is kept.", secure_storage_unavailable: "The account file could not be saved. The operation did not complete.", snapshot_changed: "The account changed. Refresh and try again.", provider_selection_not_qualified: "The selected key, models and protocol do not match. Review the selection.", model_list_unavailable: "The key model list is unavailable. Try again before saving.", provider_save_failed: "The provider could not be saved. Existing providers were kept.", timeout: "The service did not answer in time.", rate_limited: "Too many requests. Try again later.", logs_unavailable: "Recorded consumption is unavailable; totals are unknown.", storage_invalid: "The account file is damaged. Reconnect to recover it.", secure_storage_failed: "The account file could not be saved. The operation did not complete.", storage_failed: "The account file could not be saved. The operation did not complete.", invalid_response: "The service returned an invalid response.", stale_generation: "The account changed. Refresh and try again.", outcome_unknown: "The write may have completed. Read it back before another write.", write_blocked: "The write may have completed. Read it back before another write.", write_recovery_required: "The write may have completed. Read it back before another write.", not_found: "This key no longer exists.", conflict: "The saved provider changed. Refresh before retrying." };
      const label = labels[e?.code];
      const message = label ? t(label) : t("The operation failed. Check the connection and try again.");
      return e?.retryAfter > 0 ? message + " " + t("Retry after {seconds} seconds.", { seconds: e.retryAfter }) : message;
    }
    async function http(path, body, signal = controller.signal) {
      const generation = state.generation, identity = state.identity, visit = lifecycle;
      const response = await fetch("/api/tuzi/" + path, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal, cache: "no-store" });
      let data; try { data = await response.json(); } catch { throw { code: "invalid_response" }; }
      if (!response.ok || data?.success === false) {
        const error = typeof data?.error === "object" ? data.error : { code: data?.code || "request_failed" };
        if (path !== "state" && ["invalid_token", "account_disabled", "identity_mismatch", "not_connected"].includes(error?.code) && active && lifecycle === visit && state.generation === generation && state.identity === identity) {
          // Native business errors can invalidate identity without changing the
          // account generation. Read its actual state instead of keeping a
          // Connected header or inferring invalidation from a network failure.
          try {
            const next = await http("state");
            if (active && lifecycle === visit && state.generation === generation && state.identity === identity) {
              acceptState(next); drawHeader();
              if (!isConnected()) { pane.replaceChildren(empty("Connect your account to manage keys, records and models. Existing Magpie features work without an account.")); pane.removeAttribute("aria-busy"); }
              note(errorText(error), true);
            }
          } catch {}
        }
        throw error;
      }
      return data;
    }
    async function request(method, path, query = {}, body) {
      const generation = state.generation;
      const data = await http("request", { method, path, query: Object.entries(query).filter(([,v]) => v !== "" && v !== undefined && v !== null).map(([k,v]) => [k, String(v)]), ...(body === undefined ? {} : { body }), generation });
      if (state.generation !== generation) throw { code: "stale_generation" };
      return data.data;
    }
    function isConnected() { return !!state.identity && ["connected", "refreshing"].includes(state.status); }
    function cancelRead() { clearTimeout(searchTimer); searchTimer = null; clearTimeout(timer); timer = null; serial++; controller.abort(); controller = new AbortController(); }
    function clearAccount() { cancelRead(); pane?.replaceChildren(empty("Loading…")); account = null; groups = []; currentCatalog = null; currentKeys = null; unknownWrite = false; root?.querySelector("#tuziRecover")?.remove(); filters = freshFilters(); closeSheet(true); }
    function acceptState(next) {
      if (next.generation !== state.generation || next.identity?.userId !== state.identity?.userId) clearAccount();
      state = next;
      unknownWrite = !!next.pendingWrite; if (unknownWrite) recoveryButton();
    }
    async function guarded(fn, write = false) {
      if (busy || (write && unknownWrite)) return;
      busy = true; markBusy(); note("");
      try { await fn(); } catch (e) {
        if (e?.name !== "AbortError") {
          if (e?.outcomeUnknown || ["write_blocked", "write_recovery_required"].includes(e?.code)) unknownWrite = true;
          note(errorText(e), true); if (unknownWrite) recoveryButton();
        }
      } finally { busy = false; markBusy(); }
    }
    function markBusy() {
      root?.querySelectorAll("button,input,textarea").forEach((b) => { if (busy && !b.disabled) { b.dataset.tuziBusy = ""; b.disabled = true; } else if (!busy && b.hasAttribute("data-tuzi-busy")) { delete b.dataset.tuziBusy; b.disabled = false; } });
      root?.querySelectorAll("[data-tuzi-mutate]").forEach((b) => { b.disabled = busy || unknownWrite; }); root?.setAttribute("aria-busy", String(busy)); }
    function mutation(label, fn) { const b = button(label, () => guarded(fn, true)); b.dataset.tuziMutate = ""; b.disabled = busy || unknownWrite; return b; }
    function recoveryButton() {
      if (root.querySelector("#tuziRecover")) return;
      const b = button("Read back uncertain write", () => guarded(async () => {
        const result = await http("recover", { generation: state.generation, acknowledge: false });
        const box = openSheet("Read back uncertain write");
        box.append(text("Compare the current server result before allowing another write. Creating again may duplicate a key."));
        const read = result.data ?? result, data = read.data;
        box.append(text(read.notFound ? "This key no longer exists." : "Current server result"));
        const keys = Array.isArray(data?.items) ? data.items : data?.id ? [data] : [];
        for (const k of keys) box.append(facts([["Key ID", k.id], ["Name", k.name], ["Key status", keyStatus(k)], ["Key group", k.group], ["Remaining key limit", k.unlimited_quota ? t("Unlimited") : money(k.remain_quota, 8)], ["Expiry", k.expired_time === -1 ? t("Never expires") : time(k.expired_time)], ["Allowed models", k.model_limits_enabled ? k.model_limits : t("All models")], ["Allowed IP addresses", k.allow_ips], ["Excluded IP addresses", k.exclude_ips]]));
        box.append(button("I checked the result", () => guarded(async () => {
          await http("recover", { generation: state.generation, acknowledge: true }); unknownWrite = false; b.remove(); closeSheet(true); await loadTab();
        })));
      }));
      b.id = "tuziRecover"; if (sheet && !sheet.hidden) sheet.prepend(b); else notice.after(b);
    }
    function field(label, value = "", type = "text", oninput, wide = false) {
      const wrap = node("label", "tuzi-field" + (wide ? " tuzi-wide" : "")); wrap.append(node("span", "", t(label)));
      const input = node(type === "textarea" ? "textarea" : "input"); if (type !== "textarea") input.type = type;
      input.value = value ?? ""; input.setAttribute("aria-label", t(label)); input.autocomplete = "off"; input.spellcheck = false;
      if (oninput) input.oninput = () => oninput(input.value, input); wrap.append(input); return { wrap, input };
    }
    function check(label, checked, changed) { const wrap = node("label", "tuzi-check"), input = node("input"); input.type = "checkbox"; input.checked = !!checked; input.onchange = () => changed(input.checked); wrap.append(input, node("span", "", t(label))); return wrap; }
    function menu(label, value, opts, change) { const b = ui.menu(opts.map(([v,name]) => ({ v, name: t(name) })), value, t(label), change); b.setAttribute("aria-label", t(label)); return b; }
    function picker(label, value, opts, change) { const n = node("label", "tuzi-field"); n.append(node("span", "", t(label)), menu(label, value, opts, change)); return n; }
    function facts(entries) { const dl = node("dl", "tuzi-facts"); for (const [label,value] of entries) dl.append(node("dt", "", t(label)), node("dd", "", value === undefined || value === null || value === "" ? "—" : String(value))); return dl; }
    function time(n) { return n > 0 ? new Date(n * 1000).toLocaleString() : "—"; }
    function money(q, places = 2) { try { return tuziMoney.formatMoney(String(q), { ...account.money, display_type: currency }, places); } catch { return "—"; } }
    function openSheet(title) { dirtyForm = null; discardPrompt = null; sheetGeneration++; sheet.replaceChildren(); sheet.hidden = false; root.querySelector("#tuziShade").hidden = false; sheet.setAttribute("aria-label", t(title)); const h = node("div", "tuzi-toolbar"); h.append(node("h3", "", t(title)), node("span", "grow"), button("Close", () => closeSheet())); sheet.append(h); queueMicrotask(() => { if (!sheet.hidden) sheet.querySelector("button")?.focus({preventScroll:true}); }); return sheet; }
    function closeSheet(force = false) {
      if (!sheet || (busy && !force)) return;
      if (!force && dirtyForm?.()) {
        if (!discardPrompt) { discardPrompt = node("div", "list tuzi-sheet-confirm"); discardPrompt.append(text("Discard unsaved key changes?"), row(button("Keep editing", () => { discardPrompt.remove(); discardPrompt = null; }), button("Discard", () => closeSheet(true)))); sheet.prepend(discardPrompt); }
        return;
      }
      dirtyForm = null; discardPrompt = null; sheetGeneration++; sheet.replaceChildren(); sheet.hidden = true; root?.querySelector("#tuziShade")?.setAttribute("hidden", ""); if (unknownWrite) recoveryButton();
    }
    function confirmAction(title, message, action) { const box = openSheet(title); box.append(text(message)); box.append(row(button("Cancel", () => closeSheet()), mutation("Confirm", action))); }
    function pageSummary(data, filter) {
      const p = data.pagination || data, total = Number(p.total), size = filter.page_size || 20;
      return t("Page {page} of {pages} · {total} records", { page: filter.page, pages: Number.isFinite(total) ? Math.max(1, Math.ceil(total / size)) : "—", total: p.total ?? "—" });
    }
    function paginate(data, filter, refresh = loadTab) {
      const b = row(), p = data.pagination || data, total = Number(p.total), size = filter.page_size || 20;
      const pages = Number.isFinite(total) ? Math.max(1, Math.ceil(total / size)) : filter.page + (p.has_more ? 1 : 0);
      b.classList.add("tuzi-toolbar", "tuzi-pagination");
      const move = (page) => { filter.page = Math.max(1, Math.min(pages, page)); refresh(); pane.scrollIntoView({block:"start"}); };
      const prev = button("Previous", () => move(filter.page - 1)), next = button("Next", () => move(filter.page + 1)); prev.disabled = filter.page <= 1; next.disabled = !p.has_more;
      const jump = field("Go to page", filter.page, "number"); jump.input.min = 1; jump.input.max = pages;
      jump.input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); if (jump.input.checkValidity() && Number.isInteger(Number(jump.input.value))) move(Number(jump.input.value)); } };
      b.append(node("span", "note", t("{first}–{last} of {total}", { first: total === 0 ? 0 : (filter.page - 1) * size + 1, last: Math.min(filter.page * size, total), total: p.total ?? "—" })), prev, node("span", "note", pageSummary(data, filter)), next, jump.wrap);
      return b;
    }
    async function openWeb(target) { await http("open", { target }); }
    function drawHeader() {
      header.replaceChildren(); const status = node("span", "tuzi-status", t(state.status === "connected" ? "Connected" : state.status === "offline" ? "Offline" : state.status === "invalid" ? "Invalid connection" : "Not connected")); status.dataset.state = state.status;
      const who = node("div", "who"); who.append(node("div", "name", state.identity?.displayName || state.identity?.username || t("Tuzi account")), status);
      header.append(who, node("span", "grow"));
      if (state.identity || state.status !== "disconnected") header.append(button("Check connection", () => guarded(async () => { acceptState(await http("check", {})); account = null; groups = []; drawHeader(); await loadTab(); })), button("Disconnect account", () => confirmAction("Disconnect account", "Disconnect only clears this app's account connection. Saved providers remain available.", async () => { acceptState(await http("disconnect", {})); drawHeader(); await loadTab(); })));
      if (!isConnected()) {
        const form = node("form", "tuzi-form tuzi-wide"); const token = field("Account system token", "", "password"); token.input.id = "tuziSystemToken"; token.input.required = true; token.input.autocomplete = "new-password";
        const connect = button("Connect account", () => {}); connect.type = "submit"; connect.dataset.tuziMutate = "";
        form.append(token.wrap, row(button("Get system token", () => guarded(async () => { await openWeb("token"); note(t("Copy the system token on the website, then return here. You can always paste it manually.")); })), connect));
        form.onsubmit = (e) => { e.preventDefault(); const secret = token.input.value.trim(); if (secret) guarded(async () => { acceptState(await http("connect", { token: secret })); token.input.value = ""; drawHeader(); await loadTab(); }); };
        header.append(form);
      }
      if (state.error) note(errorText(state.error), true);
    }
    function drawTabs() {
      tabbar.replaceChildren(); tabbar.setAttribute("role", "tablist");
      for (const [id, label] of tabs) { const b = button(label, async () => { if (busy) return; if (dirtyForm?.() && !(await confirmDiscard())) return; tab = id; closeSheet(true); drawTabs(); loadTab(); }, tab === id ? "opt on" : "opt"); b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(tab === id)); b.tabIndex = tab === id ? 0 : -1; b.onkeydown = (e) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) { e.preventDefault(); const at = tabs.findIndex(([x]) => x === tab), next = e.key === "Home" ? 0 : e.key === "End" ? 3 : (at + (e.key === "ArrowRight" ? 1 : 3)) % 4; const choices = tabbar.querySelectorAll("[role=tab]"); choices[next].click(); tabbar.querySelectorAll("[role=tab]")[next].focus({ preventScroll: true }); } }; tabbar.append(b); }
      queueMicrotask(() => slide(tabbar, "tuzi-tabs"));
    }
    async function refreshState() { const next = await http("state"); acceptState(next); drawHeader(); }
    async function loadTab() {
      cancelRead(); const turn = serial; if (!active) return;
      if (!isConnected()) { pane.replaceChildren(empty("Connect your account to manage keys, records and models. Existing Magpie features work without an account.")); return; }
      pane.setAttribute("aria-busy", "true");
      try {
        if (!account) account = await request("GET", "/account/account");
        if (!groups.length) groups = await request("GET", "/account/key-groups");
        if (turn !== serial) return;
        if (tab === "keys") await loadKeys(turn);
        else if (tab === "logs") await loadLogs(turn);
        else await loadModels(turn, tab === "performance");
      } catch (e) { if (turn === serial && e?.name !== "AbortError") { note(errorText(e), true); if (!pane.children.length) pane.append(empty("Unable to load this page.")); } }
      finally { if (turn === serial) pane.removeAttribute("aria-busy"); }
    }
    function reloadButton() { return button("Refresh", () => { note(""); account = null; groups = []; loadTab(); }); }
    function currencyMenu() { return menu("Display currency", currency, [["CNY", "CNY"], ["USD", "USD"]], (v) => { currency = v; try { localStorage.setItem("tuzi-magpie.currency", v); } catch {} loadTab(); }); }
    function groupOptions(all = true) { return [...(all ? [["", "All groups"]] : []), ...groups.map((g) => [g.id, g.label])]; }
    async function loadKeys(turn) {
      const now = new Date(), start = new Date(now); start.setHours(0, 0, 0, 0);
      const [keys, daily] = await Promise.allSettled([request("GET", "/account/keys", filters.keys), request("GET", "/account/usage/summary", { start_time: Math.floor(start / 1000), end_time: Math.floor(now / 1000), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })]);
      if (turn !== serial) return; if (keys.status === "rejected") throw keys.reason;
      currentKeys = keys.value; const d = daily.status === "fulfilled" ? daily.value : null;
      pane.replaceChildren(); const metrics = node("dl", "tuzi-metrics");
      for (const [label, value] of [["Account balance", money(account.quota)], ["Today's recorded consumption", d ? money(d.quota) : "—"], ["Today's consumption calls", d?.call_count ?? "—"], ["Today's input / output tokens", d ? `${d.prompt_tokens} / ${d.completion_tokens}` : "—"]]) { const card = node("div", "list"); card.append(node("dt", "", t(label)), node("dd", "", value)); if (label === "Account balance") card.append(row(button("Top up", () => guarded(() => openWeb("topup"))), button("Redeem", () => guarded(() => openWeb("redemption"))))); metrics.append(card); }
      pane.append(metrics, text("These are the account's recorded server logs, including other devices. Missing logs and reporting delay are unknown. Refunds are listed separately."));
      if (!d) pane.append(text(errorText(daily.reason), "tuzi-notice tuzi-error"));
      const f = filters.keys, toolbar = node("form", "tuzi-toolbar"), search = field("Search key names", f.keyword, "search"); search.wrap.classList.add("tuzi-search"); const fragment = field("Short key fragment", f.token, "text"); fragment.input.maxLength = 4; fragment.input.pattern = "[A-Za-z0-9]{4}"; fragment.input.title = t("Enter exactly four letters or digits.");
      toolbar.append(search.wrap, fragment.wrap, menu("Key group", f.group, groupOptions(), (v) => { f.group = v; f.page = 1; loadTab(); }), menu("Key status", f.status, [["", "All statuses"], ["1", "Enabled"], ["2", "Disabled"], ["3", "Expired"], ["4", "Exhausted"]], (v) => { f.status = v; f.page = 1; loadTab(); }), currencyMenu());
      const find = button("Search", () => {}); find.type = "submit"; toolbar.append(find, reloadButton(), mutation("Create API key", () => editKey(null)));
      toolbar.onsubmit = (e) => { e.preventDefault(); f.keyword = search.input.value; f.token = fragment.input.value; f.page = 1; loadTab(); }; pane.append(toolbar);
      const list = node("div", "list"); for (const key of keys.value.items || []) list.append(keyRow(key)); pane.append(list.childElementCount ? list : empty("No API keys match these filters."), paginate(keys.value, f));
    }
    function keyStatus(k) { return t(k.is_expired || k.status === 3 ? "Expired" : k.status === 1 ? "Enabled" : k.status === 4 ? "Exhausted" : "Disabled"); }
    function keyRow(key) {
      const r = node("div", "row tuzi-key"), who = node("div", "who"); who.append(node("div", "name", key.name), node("div", "sub", [key.masked_key || "••••", key.group, keyStatus(key)].join(" · ")));
      r.append(who, row(button("Key details", () => guarded(() => keyDetails(key.id))), button("Edit", () => guarded(async () => editKey(await request("GET", `/account/keys/${key.id}`)))), button("Add to Magpie", () => guarded(() => configure(key))))); return r;
    }
    async function keyDetails(id) {
      const k = await request("GET", `/account/keys/${id}`), box = openSheet("Key details");
      box.append(facts([["Name", k.name], ["Key status", keyStatus(k)], ["Key group", k.group], ["API key", k.masked_key], ["Remaining key limit", k.unlimited_quota ? t("Unlimited") : money(k.remain_quota, 8)], ["Used amount", money(k.used_quota, 8)], ["Expiry", k.expired_time === -1 ? t("Never expires") : time(k.expired_time)], ["Created", time(k.created_time)], ["Last used", time(k.accessed_time)], ["Allowed models", k.model_limits_enabled ? k.model_limits : t("All models")], ["Allowed IP addresses", k.allow_ips], ["Excluded IP addresses", k.exclude_ips]]));
      const secret = node("div", "tuzi-secret"); box.append(secret);
      const sheetAt = sheetGeneration;
      box.append(row(button("Reveal key", () => guarded(async () => { const v = await request("POST", `/account/keys/${id}/reveal`); if (sheetAt !== sheetGeneration) return; secret.replaceChildren(node("p", "", v.key), button("Copy key", () => guarded(async () => { await copy(v.key, t("API key")); }))); })), mutation(k.status === 1 ? "Disable key" : "Enable key", async () => { await request("PATCH", `/account/keys/${id}/status`, {}, { status: k.status === 1 ? 2 : 1 }); await keyDetails(id); await loadTab(); }), button("Edit", () => editKey(k)), button("Delete key", () => confirmAction("Delete key", "Deleting this key stops its model access. This cannot be undone.", async () => { await request("DELETE", `/account/keys/${id}`); closeSheet(true); await loadTab(); }))));
    }
    async function editKey(existing) {
      const box = openSheet(existing ? "Edit API key" : "Create API key"), original = existing ? structuredClone(existing) : null;
      const draft = existing ? structuredClone(existing) : { name: "", group: groups[0]?.id || "", expired_time: -1, remain_quota: "0", unlimited_quota: true, model_limits_enabled: false, model_limits: "", allow_ips: "", exclude_ips: "" };
      const initialDraft = JSON.stringify(draft); dirtyForm = () => JSON.stringify(draft) !== initialDraft;
      const form = node("form"), top = node("div", "tuzi-form"), name = field("Name", draft.name, "text", (v) => { draft.name = v; }); name.input.required = true; name.input.maxLength = 256; top.append(name.wrap);
      const groupBox = node("div", "tuzi-wide"); function drawGroups() { groupBox.replaceChildren(node("div", "tuzi-notice", t("The first group is primary; additional groups are fallbacks."))); const selected = draft.group.split(",").filter(Boolean); const add = menu("Add key group", "", [["", "Add key group"], ...groupOptions(false).filter(([v]) => !selected.includes(v))], (v) => { if (v && !selected.includes(v)) { draft.group = [...selected, v].join(","); drawGroups(); } }); groupBox.append(add); for (const g of selected) groupBox.append(button(g + " ×", () => { draft.group = selected.filter((x) => x !== g).join(","); drawGroups(); })); } drawGroups(); top.append(groupBox); form.append(top);
      const advanced = node("details"), summary = node("summary", "", t("Advanced key limits")), fields = node("div", "tuzi-form"); advanced.append(summary, fields); form.append(advanced);
      const amount = field("Key monetary limit", "", "text", (v, input) => { try { draft.remain_quota = tuziMoney.amountToQuota(v, account.money, currency); if (BigInt(draft.remain_quota) <= 0n) throw Error(); input.setCustomValidity(""); } catch { input.setCustomValidity(t("Enter a positive amount with at most eight decimal places.")); } }); amount.input.inputMode = "decimal"; amount.input.value = money(draft.remain_quota, 8).replace(/^[A-Z]+ /, ""); amount.wrap.hidden = draft.unlimited_quota; amount.input.required = !draft.unlimited_quota;
      fields.append(check("Unlimited key quota", draft.unlimited_quota, (v) => { draft.unlimited_quota = v; amount.wrap.hidden = v; amount.input.required = !v; amount.input.setCustomValidity(v || BigInt(draft.remain_quota || "0") > 0n ? "" : t("Enter a positive amount with at most eight decimal places.")); }), amount.wrap);
      const date = field("Expiry date", draft.expired_time === -1 ? "" : localDate(draft.expired_time), "datetime-local", (v) => { draft.expired_time = Math.floor(Date.parse(v) / 1000); }); date.wrap.hidden = draft.expired_time === -1; date.input.required = draft.expired_time !== -1;
      fields.append(picker("Expiry", draft.expired_time === -1 ? "never" : "date", [["never", "Never expires"], ["date", "Choose expiry date"]], (v) => { date.wrap.hidden = v === "never"; date.input.required = v !== "never"; draft.expired_time = v === "never" ? -1 : Math.floor(Date.now() / 1000) + 30 * 86400; date.input.value = v === "never" ? "" : localDate(draft.expired_time); }), date.wrap);
      const models = field("Allowed model IDs, separated by commas", draft.model_limits, "textarea", (v) => { draft.model_limits = v; }, true); models.wrap.hidden = !draft.model_limits_enabled; models.input.required = draft.model_limits_enabled;
      fields.append(check("Restrict available models", draft.model_limits_enabled, (v) => { draft.model_limits_enabled = v; models.wrap.hidden = !v; models.input.required = v; }), models.wrap, field("Allowed IP addresses", draft.allow_ips, "textarea", (v) => { draft.allow_ips = v; }).wrap, field("Excluded IP addresses", draft.exclude_ips, "textarea", (v) => { draft.exclude_ips = v; }).wrap);
      form.append(text("A key limit does not add account balance. Leave IP fields empty for no restriction."));
      const save = button("Save", () => {}); save.type = "submit"; save.dataset.tuziMutate = ""; form.append(row(button("Cancel", () => closeSheet()), save));
      form.onsubmit = (e) => { e.preventDefault(); if (!draft.group.trim()) { note(t("Choose at least one key group."), true); return; } guarded(async () => { const body = {}; for (const k of ["name", "group", "expired_time", "remain_quota", "unlimited_quota", "model_limits_enabled", "model_limits", "allow_ips", "exclude_ips"]) if (!original || (original[k] ?? "") !== (draft[k] ?? "")) body[k] = draft[k] ?? ""; if (!Object.keys(body).length) { closeSheet(true); return; } const result = await request(original ? "PATCH" : "POST", original ? `/account/keys/${original.id}` : "/account/keys", {}, body); closeSheet(true); await loadTab(); if (!original && result.id) await keyDetails(result.id); }, true); }; box.append(form);
    }
    function localDate(seconds) { const d = new Date(seconds * 1000); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    async function configure(key, modelName = "") {
      const box = openSheet("Add account key to Magpie"), at = sheetGeneration;
      box.append(text("One account key becomes one provider. Agent model selection follows Magpie's existing workflow; saving does not run a model."));
      const current = await request("GET", `/account/keys/${key.id}`); if (at !== sheetGeneration) return;
      if (current.status !== 1 || current.is_expired) { box.append(text("Only an enabled, unexpired key can be added.", "tuzi-notice tuzi-error")); return; }
      const name = field("Provider name", current.name), ids = field("Model IDs, separated by commas", modelName, "textarea", undefined, true);
      let protocol = "responses";
      const form = node("form", "tuzi-form"); ids.input.required = true; form.append(name.wrap, picker("Protocol", protocol, [["responses", "Responses"], ["chat", "Chat Completions"], ["anthropic", "Anthropic Messages"], ["gemini", "Gemini"]], (v) => { protocol = v; }), ids.wrap);
      const modelList = node("div", "tuzi-wide"); form.append(modelList);
      const candidates = await request("GET", `/account/keys/${key.id}/models`); if (at !== sheetGeneration) return;
      const items = Array.isArray(candidates) ? candidates : candidates?.items || candidates?.models || [];
      if (items.length) {
        const allowed = current.model_limits_enabled ? current.model_limits.split(",").map((m) => m.trim()) : null;
        const opts = items.map((m) => typeof m === "string" ? m : m.id || m.model_name).filter((m) => m && (!allowed || allowed.includes(m)));
        modelList.append(menu("Choose a model", "", [["", "Choose a model"], ...opts.map((m) => [m,m])], (v) => { const selected = ids.input.value.split(",").map((s) => s.trim()).filter(Boolean); if (v && !selected.includes(v)) ids.input.value = [...selected, v].join(","); }));
      }
      form.append(text("Model and protocol eligibility is checked again before saving. Catalog visibility alone does not grant access."));
      const save = button("Add provider", () => {}); save.type = "submit"; save.dataset.tuziMutate = ""; form.append(row(button("Cancel", () => closeSheet()), save));
      form.onsubmit = (e) => { e.preventDefault(); const models = [...new Set(ids.input.value.split(",").map((s) => s.trim()).filter(Boolean))]; if (!models.length || models.length > 50) { note(t("Choose between one and fifty models."), true); return; } guarded(async () => {
        const result = await http("provider", { generation: state.generation, tokenId: String(key.id), name: name.input.value, models, protocol });
        const success = openSheet(result.existing ? "This key already has a provider" : "Provider saved"); success.append(text("The provider is saved. Choose its models from Agents using Magpie's existing connection controls."));
        success.append(row(button("Open provider", async () => { closeSheet(true); await show("providers"); await loadProviders(); await openProvider(result.providerId); }), button("Open Agents", () => { closeSheet(true); show("agents"); })));
      }, true); }; box.append(form);
    }
    async function chooseKeyForModel(model) {
      const box = openSheet("Choose an account key"), at = sheetGeneration; let page = 1;
      const list = node("div"); box.append(list);
      async function read() { const data = await request("GET", "/account/keys", { page, page_size: 20, status: 1 }); if (at !== sheetGeneration) return; list.replaceChildren(); for (const key of data.items || []) { const b = button(key.name, () => guarded(() => configure(key, model.model_name))); b.disabled = key.is_expired || (key.model_limits_enabled && !key.model_limits.split(",").map((s) => s.trim()).includes(model.model_name)); list.append(row(b, node("span", "note", key.group))); } if (!data.items?.length) list.append(empty("No eligible keys on this page.")); const f = { page }; list.append(paginate(data, f, () => { page = f.page; guarded(read); })); }
      await read();
    }
    function table(headers, rows) { const wrap = node("div", "tuzi-table-wrap"), table = node("table"), head = node("tr"), body = node("tbody"); for (const h of headers) head.append(node("th", "", t(h))); const thead = node("thead"); thead.append(head); for (const cells of rows) { const r = node("tr"); for (const c of cells) { const td = node("td"); if (c instanceof Node) td.append(c); else td.textContent = c === null || c === undefined ? "—" : String(c); r.append(td); } body.append(r); } table.append(thead, body); wrap.append(table); return wrap; }
    async function loadLogs(turn) {
      const f = filters.logs, applied = { ...f }, data = await request("GET", "/account/logs", applied); if (turn !== serial) return;
      pane.replaceChildren(); const form = node("form", "tuzi-toolbar"), from = field("From", localDate(f.start_timestamp), "datetime-local"), to = field("Until", localDate(f.end_timestamp), "datetime-local"); from.input.required = to.input.required = true;
      const model = field("Model name", f.model_name, "search"), token = field("Key name", f.token_name, "search"), id = field("Request ID", f.request_id), error = field("Public error filter", f.error_keyword), upstream = field("Upstream request ID", f.upstream_request_id), requestPath = field("Request path", f.request_path);
      let group = f.group, kind = f.type;
      const advanced = node("details"), sum = node("summary", "", t("More log filters")), fields = node("div", "tuzi-form"); advanced.append(sum, fields); fields.append(token.wrap, id.wrap, upstream.wrap, requestPath.wrap, error.wrap, picker("Log group", group, groupOptions(), (v) => { group = v; }), picker("Log kind", kind, [["", "All log kinds"], ["2", "Consumption"], ["6", "Errors"], ["7", "Refunds"]], (v) => { kind = v; }));
      form.append(from.wrap, to.wrap, model.wrap, currencyMenu()); const apply = button("Apply filters", () => {}); apply.type = "submit"; form.append(apply, reloadButton());
      form.onsubmit = (e) => { e.preventDefault(); const start = Math.floor(Date.parse(from.input.value) / 1000), end = Math.floor(Date.parse(to.input.value) / 1000); if (!(end > start) || end - start > 90 * 86400) { note(t("Choose a valid time range of at most 90 days."), true); return; } Object.assign(f, { start_timestamp: start, end_timestamp: end, model_name: model.input.value, token_name: token.input.value, request_id: id.input.value, upstream_request_id: upstream.input.value, request_path: requestPath.input.value, error_keyword: error.input.value, group, type: kind, page: 1 }); loadTab(); };
      pane.append(form, advanced, node("p", "tuzi-notice", pageSummary(data, f)));
      const rows = (data.items || []).map((l) => {
        const model = node("span", "tuzi-model-name", l.model_name); model.title = l.model_name;
        const duration = node("div", "tuzi-log-duration"); duration.append(node("div", "", l.duration_ms == null ? "—" : `${l.duration_ms} ms`), node("div", "note", t(l.is_stream ? "Streaming" : "Non-streaming")));
        const result = node("span", "", t(l.result === "success" ? "Successful" : l.result === "error" ? "Failed" : "Unknown result")); result.title = l.error_message || "";
        return [button("Recorded call details", () => logDetails(l)), time(l.created_at), model, l.token_name, result, money(l.quota), `${l.prompt_tokens} / ${l.completion_tokens}`, l.group, duration];
      });
      const list = rows.length ? table(["Log operation", "Time", "Model", "Key name", "Call result", "Recorded charge", "Input / output tokens", "Log group", "Duration"], rows) : empty("No recorded calls in this range."); list.classList.add("tuzi-logs");
      pane.append(list, paginate(data, f));
      const statistics = node("section", "list tuzi-sheet"), stats = node("div"); statistics.append(node("h3", "", t("Consumption statistics and trends")), text("Tuzi server records include calls outside this device. Consumption records do not imply success, and refunds are not subtracted into a net balance."), stats); pane.append(statistics);
      stats.append(text("Loading…"));
      try { const {page, page_size, ...statisticsFilters} = applied; const result = await request("GET", "/account/logs/statistics", { ...statisticsFilters, interval_seconds: 3600 }); if (turn !== serial) return; stats.replaceChildren(); drawStatistics(stats, result); } catch (e) { if (turn === serial) stats.replaceChildren(text(errorText(e), "tuzi-notice tuzi-error")); }
    }
    function logDetails(l) {
      const box = openSheet("Recorded call details"); box.append(facts([["Log ID", l.id], ["Time", time(l.created_at)], ["Model", l.model_name], ["Key name", l.token_name], ["Log group", l.group], ["Call result", t(l.result === "success" ? "Successful" : l.result === "error" ? "Failed" : "Unknown result")], ["Recorded charge", money(l.quota, 8)], ["Billing status", t(({charged:"Charged",not_charged:"Not charged",refunded:"Refunded"})[l.billing_status] || "Unknown billing status")], ["Input / output tokens", `${l.prompt_tokens} / ${l.completion_tokens}`], ["Duration", l.duration_ms == null ? "—" : `${l.duration_ms} ms`], ["Streaming", l.is_stream ? t("Yes") : t("No")], ["Request ID", l.request_id], ["Request path", l.request_path], ["Upstream request ID", l.upstream_request_id], ["HTTP status", l.status_code], ["Public error code", l.public_error_code || l.error_code], ["Public error", l.error_message]]));
      if (l.request_id) box.append(button("Related request records", () => guarded(async () => { const at = sheetGeneration, result = await request("GET", "/account/logs/requests/" + encodeURIComponent(l.request_id)); if (at !== sheetGeneration) return; const others = (result.items || []).filter((x) => String(x.id) !== String(l.id)); box.append(table(["Time", "Model", "Recorded charge", "Call result"], others.map((x) => [time(x.created_at), x.model_name, money(x.quota), x.result]))); if (result.has_more) box.append(text("More related records are available on the website.")); })));
    }
    function drawStatistics(box, data) {
      const s = data.summary || {};
      box.append(facts([["Consumption records", s.record_count], ["Recorded charge", money(s.quota)], ["Input / output tokens", s.prompt_tokens == null ? "—" : `${s.prompt_tokens} / ${s.completion_tokens}`]]));
      const trend = Array.isArray(data.trend) ? data.trend : [], chart = node("div", "tuzi-trend");
      const values = trend.map((x) => { try { return BigInt(x.quota); } catch { return 0n; } }), max = values.reduce((a,b) => a > b ? a : b, 0n);
      trend.forEach((x,i) => { const bar = node("i"); bar.style.height = `${max > 0n ? Number(values[i] * 10000n / max) / 100 : 0}%`; bar.tabIndex = 0; bar.title = `${time(x.start_timestamp)} – ${time(x.end_timestamp)} · ${money(x.quota)}`; bar.setAttribute("aria-label", bar.title); chart.append(bar); });
      box.append(node("h3", "", t("Recorded consumption trend")), chart);
      const models = [...(data.by_model || [])].sort((a,b) => { try { const d = BigInt(b.quota) - BigInt(a.quota); return d > 0n ? 1 : d < 0n ? -1 : 0; } catch { return 0; } });
      const rankings = (items) => table(["Model", "Recorded charge", "Consumption share", "Consumption records"], items.map((x) => {
        let share = "—"; try { if (BigInt(s.quota) > 0n) share = (Number(BigInt(x.quota) * 10000n / BigInt(s.quota)) / 100).toFixed(2) + "%"; } catch {}
        const name = row(catalogIcon(x.model_name), node("span", "", x.model_name)); return [name, money(x.quota), share, x.record_count];
      }));
      box.append(node("h3", "", t("By model")), rankings(models.slice(0, 5)), button("All model rankings", () => { const full = openSheet("All model rankings"); full.append(rankings(models)); }));
      box.append(node("h3", "", t("By public error")), facts([["Error records", s.error_count]]), table(["Public error code", "Error records"], (data.by_error || []).map((x) => [x.error_code || x.public_error_code || "—", x.record_count])));
      box.append(node("h3", "", t("Refunds")), facts([["Refund amount", money(s.refund_quota)]]));
    }
    function catalogIcon(name) {
      const id = /^(gpt|o[1-9]|chatgpt)/i.test(name) ? "openai" : /claude/i.test(name) ? "anthropic" : /gemini/i.test(name) ? "gemini" : /deepseek/i.test(name) ? "deepseek" : "generic";
      return icon(id);
    }
    function modelCatalog(data) {
      if (!Array.isArray(data?.items) || !data.pagination || !Number.isFinite(Number(data.pagination.total))) throw { code: "invalid_response" };
      for (const m of data.items) { if (!m || typeof m.model_name !== "string") throw { code: "invalid_response" }; for (const key of ["aliases", "enable_groups", "supported_endpoint_types", "related_pricing"]) { if (m[key] == null) m[key] = []; if (!Array.isArray(m[key])) throw { code: "invalid_response" }; } }
      data.pricing_meta ||= {}; return data;
    }
    const billing = (value) => t(({0:"Per request",1:"Per token",2:"Per second"})[value] || "Unknown billing mode");
    async function loadModels(turn, performance) {
      const f = performance ? filters.performance : filters.models, { hours, ...query } = f;
      const data = modelCatalog(await request("GET", "/account/models", query)); if (turn !== serial) return;
      if (data.snapshot_refreshed && f.page > 1) { f.page = 1; delete f.snapshot_id; return loadTab(); } f.snapshot_id = data.snapshot_id; currentCatalog = data;
      let metrics = []; if (performance && data.items.length) { const body = { models: data.items.map((m) => m.model_name), hours: Number(hours), resolution: "30m" }; if (f.group) body.groups = f.group.split(","); metrics = await request("POST", "/account/model-performance/batch", {}, body); if (!Array.isArray(metrics)) throw { code: "invalid_response" }; if (turn !== serial) return; }
      const focused = pane.querySelector("[data-tuzi-search]") === document.activeElement, selection = focused ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
      pane.replaceChildren(); const toolbar = node("form", "tuzi-toolbar"), search = field("Search model catalog", f.search, "search"); search.input.dataset.tuziSearch = ""; search.wrap.classList.add("tuzi-search"); const submit = button("Search", () => {}); submit.type = "submit"; toolbar.append(search.wrap, submit, reloadButton());
      let composing = false;
      const searchNow = () => { f.search = search.input.value; f.page = 1; delete f.snapshot_id; loadTab(); };
      const queueSearch = () => { cancelRead(); if (!composing) searchTimer = setTimeout(searchNow, 400); };
      search.input.oninput = queueSearch;
      search.input.oncompositionstart = () => { composing = true; cancelRead(); };
      search.input.oncompositionend = () => { composing = false; queueSearch(); };
      toolbar.onsubmit = (e) => { e.preventDefault(); if (!composing) searchNow(); };
      if (performance) toolbar.append(menu("Status time window", hours, [[1,"1 hour"],[6,"6 hours"],[24,"24 hours"]], (v) => { f.hours = v; loadTab(); }));
      pane.append(toolbar);
      const facets = data.pricing_meta.filter_facets || {}, options = node("div", "tuzi-toolbar");
      for (const [key, facet, label] of [["vendor","vendors","Model vendor"],["quota_type","quota_types","Billing mode"],["endpoint_type","endpoint_types","Endpoint type"],["group","groups","Visible model group"],["tag","tags","Model tag"]]) {
        if (performance && !["endpoint_type","group"].includes(key)) continue;
        const keys = key === "quota_type" ? ["0","1","2"] : Object.keys(facets[facet] || {});
        const multi = key === "tag", selected = multi ? (f[key] || "").split(",").filter(Boolean) : f[key] || "";
        const pick = button(label, () => openProtoMenu(pick, [{v:"",name:t("All"),literalName:true,note:""}, ...keys.map((v) => ({v,name:key === "quota_type" ? billing(v) : v,literalName:true,note:""}))], selected, (v) => { f[key] = Array.isArray(v) ? v.join(",") : v; f.page = 1; delete f.snapshot_id; loadTab(); }, label, "", "right", false, "Search choices"));
        pick.setAttribute("aria-label", t(label)); pick.title = f[key] || t("All"); pick.textContent = t(label) + ": " + (f[key] || t("All")); options.append(pick);
      }
      pane.append(options, text(performance ? "Historical service samples only. No test inference is sent. Unknown samples are shown as unknown." : "Visible catalog prices are reference group prices, excluding personal discounts. Key permissions are checked separately."));
      const list = node("div", "tuzi-models");
      for (const m of data.items) {
        const card = node("section", "list tuzi-model"); card.append(row(catalogIcon(m.model_name), node("div", "name", m.model_name)), node("p", "sub", m.supported_endpoint_types.join(" · ")));
        if (performance) drawPerformance(card, metrics.find((x) => x.model_name === m.model_name));
        else { card.append(node("p", "tuzi-notice", [billing(m.quota_type), m.tags || ""].filter(Boolean).join(" · "))); card.append(row(button("Model details", () => modelDetails(m, data.pricing_meta)), button("Configure with a key", () => guarded(() => chooseKeyForModel(m))))); }
        list.append(card);
      }
      pane.append(list.childElementCount ? list : empty("No models match these filters."), paginate(data, f));
      if (focused) { search.input.focus({preventScroll:true}); search.input.setSelectionRange(...selection); }
      if (performance && active && document.visibilityState !== "hidden") timer = setTimeout(loadTab, 60000);
    }
    function drawPerformance(card, item) {
      const metric = item?.aggregate || {}, has = metric.has_samples === true;
      const fixed = (value, suffix) => value != null && Number.isFinite(Number(value)) ? Number(value).toFixed(2) + suffix : "—";
      card.append(facts([["Success rate", has ? fixed(metric.success_rate, "%") : "—"], ["Average latency", has ? fixed(metric.avg_latency_ms, " ms") : "—"], ["First token latency", has ? fixed(metric.avg_ttft_ms, " ms") : "—"]]));
      card.append(node("p", "tuzi-notice", t("Success rate over {hours} hours · each block is 30 minutes", { hours: filters.performance.hours })));
      const series = node("div", "tuzi-series"), detail = node("p", "tuzi-notice"); detail.hidden = true; detail.setAttribute("aria-live", "polite"); series.setAttribute("aria-label", t("Historical success rate"));
      for (const p of metric.half_hour_series?.length ? metric.half_hour_series : [{ts:null, has_samples:false}]) { const swatch = node("i"); const valid = p.has_samples && p.success_rate != null && Number.isFinite(Number(p.success_rate)); swatch.tabIndex = 0; swatch.dataset.level = valid ? p.success_rate >= 95 ? "good" : p.success_rate >= 80 ? "fair" : "bad" : "unknown"; swatch.title = `${time(p.ts)} · ${valid ? fixed(p.success_rate, "%") : t("No samples")}`; swatch.setAttribute("aria-label", swatch.title); swatch.onfocus = () => { detail.textContent = swatch.title; detail.hidden = false; }; swatch.onblur = () => { detail.hidden = true; detail.textContent = ""; }; series.append(swatch); }
      card.append(series, detail); if (!has) card.append(text("No samples in this window."));
    }
    function modelDetails(m, meta) {
      const box = openSheet("Model details"); box.append(facts([["Model", m.model_name], ["Description", m.description || m.description_i18n], ["Aliases", m.aliases.join(", ")], ["Endpoint type", m.supported_endpoint_types.join(", ")], ["Visible model group", m.enable_groups.join(", ")], ["Billing mode", billing(m.quota_type)], ["Model tag", m.tags]]), text("USD group catalog prices, excluding personal discounts. Final charges are determined by the service."));
      for (const group of tuziMoney.groupPrices(m, meta)) {
        const section = node("section", "list tuzi-sheet tuzi-group-prices"); section.append(node("h3", "", group.label)); const prices = node("div"); let at = 0;
        const draw = () => { const data = group.tiers[at]?.prices || []; prices.replaceChildren(data.length ? table(["Billing item", "Catalog price", "Catalog unit"], data.map((p) => [t(p.label), `$${p.amount.toLocaleString("en-US", { maximumFractionDigits: 12 })}`, t(p.unit)])) : text("No reliable price is available. See the website for full pricing.")); };
        if (group.tiers.length > 1) section.append(menu("Price tier", 0, group.tiers.map((g,i) => [i,g.label]), (v) => { at = v; draw(); })); draw(); section.append(prices); box.append(section);
      }
      if (!tuziMoney.groupPrices(m, meta).length) box.append(text("No reliable price is available. See the website for full pricing."));
      const actions = row(button("Full pricing on website", () => guarded(() => api("open", {url:"https://api.tu-zi.com/pricing"}))), button("Configure with a key", () => guarded(() => chooseKeyForModel(m)))); actions.classList.add("tuzi-detail-actions"); box.append(actions);
    }
    async function open() {
      if (window.bootPrefs?.web) return;
      active = true; lifecycle++; tab = "keys"; account = null; groups = []; drawTabs(); cancelRead();
      try { await refreshState(); if (state.status === "offline" && state.identity) { acceptState(await http("check", {})); drawHeader(); } await loadTab(); } catch (e) { if (e?.name !== "AbortError") note(errorText(e), true); }
    }
    function leave() { active = false; lifecycle++; cancelRead(); closeSheet(true); const token = root.querySelector("#tuziSystemToken"); if (token) token.value = ""; }
    async function navigate() {
      const visit = active ? lifecycle : lifecycle + 1;
      if (!active) await open();
      if (!active || lifecycle !== visit) return;
      const generation = state.generation, input = root.querySelector("#tuziSystemToken");
      if (isConnected() || !input || input.value) return;
      try { const value = await http("prefill", {}); if (!active || lifecycle !== visit || state.generation !== generation) return; const current = root.querySelector("#tuziSystemToken"); if (current === input && !current.value && typeof value.token === "string") current.value = value.token; } catch {}
    }
    ctx.onDispose(leave);
    ctx.slots.add("page", { key:"tuzi", title:"Tuzi account", html:'<section id="tuziConnection" class="list row tuzi-key"></section><div id="tuziTabs" class="segs tuzi-tabs"></div><p id="tuziNotice" class="tuzi-notice" role="status" hidden></p><div id="tuziShade" class="tuzi-shade" hidden></div><section id="tuziSheet" class="list tuzi-sheet tuzi-dialog" role="dialog" aria-modal="true" hidden></section><section id="tuziPane"></section>',
      mount(main) { root = main; header = main.querySelector("#tuziConnection"); tabbar = main.querySelector("#tuziTabs"); notice = main.querySelector("#tuziNotice"); pane = main.querySelector("#tuziPane"); sheet = main.querySelector("#tuziSheet"); drawHeader(); drawTabs(); main.querySelector("#tuziShade").onclick = () => closeSheet(); main.addEventListener("keydown", (e) => { if (e.key === "Tab" && !sheet.hidden) { const focusable = [...sheet.querySelectorAll("button:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary")].filter((x) => x.getClientRects().length); const first = focusable[0], last = focusable.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus({preventScroll:true}); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus({preventScroll:true}); } } if(e.key === "Escape" && !sheet.hidden) { e.preventDefault(); e.stopPropagation(); closeSheet(); } }); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") cancelRead(); else if (active && !busy) { account = null; groups = []; loadTab(); } }); },
      open, navigate, leave, busy() { return busy; }, dirty() { return busy || !!dirtyForm?.(); }, discard() { closeSheet(true); }, refresh() { if (active && !busy) return loadTab(); }, reload() { if (active && !busy) return loadTab(); }, relang() { drawHeader(); drawTabs(); if (active) return loadTab(); }
    });
  });
})();
