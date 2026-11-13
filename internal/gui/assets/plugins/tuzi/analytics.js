// Tuzi product analytics. Only fixed names and enumerated values cross this boundary.
(() => {
  const boot = window.bootPrefs || {}, site = "b2aa6cf4-3b4e-4e7a-bfd7-b5e675a975e4";
  const pages = { agents: "智能体", providers: "服务商", plugins: "插件", settings: "设置", gateway: "网关", routing: "路由", usage: "用量", sessions: "会话", library: "资源库", tuzi: "兔子账户", "tuzi/keys": "兔子账户 / API 密钥", "tuzi/logs": "兔子账户 / 调用记录", "tuzi/models": "模型市场", "tuzi/performance": "模型状态" };
  const names = new Set(["获取系统令牌", "连接兔子账户", "断开兔子账户", "创建 API Key", "查看模型详情", "添加服务商", "接入智能体", "断开智能体"]);
  const enums = { 阶段: ["开始", "结果"], 结果: ["成功", "失败", "待确认"], 服务商: ["新增", "复用"], 智能体: ["codex", "claude", "gemini", "cursor", "opencode", "其他"], 入口: ["API 密钥", "模型市场"], 协议: ["responses", "chat", "anthropic", "gemini"] };
  const errors = new Set(["invalid_token", "unauthorized", "permission_denied", "network", "network_error", "timeout", "rate_limited", "outcome_unknown", "write_recovery_required", "network_uncertain", "provider_save_failed", "provider_selection_not_qualified", "all_hidden", "no_models", "config_blocked", "conflict"]);
  let off = boot.analytics?.off !== false, usageOff = !!boot.analytics?.usageOff, queue = [], script, current = "", last = "";
  const blocked = () => !boot.analytics || off || boot.analytics?.blocked || new URLSearchParams(location.search).get("mode") === "panel" || [navigator.doNotTrack, window.doNotTrack].some(x => x === "1" || x === "yes");
  function props(data) {
    const out = {};
    for (const [key, values] of Object.entries(enums)) if (values.includes(data[key])) out[key] = data[key];
    if (errors.has(data.错误码)) out.错误码 = data.错误码;
    return out;
  }
  function send(payload) {
    if (blocked()) return;
    if (!window.umami) { if (queue.length < 50) queue.push(payload); load(); return; }
    try { Promise.resolve(window.umami.track(payload)).catch(() => {}); } catch { /* analytics never owns an operation */ }
  }
  function load() {
    if (blocked() || script) return;
    script = document.createElement("script"); script.defer = true;
    script.src = "https://umami.tu-zi.com/script.js";
    script.referrerPolicy = "no-referrer";
    // Pin the reviewed SDK bytes; upstream changes require review before execution.
    script.integrity = "sha384-KovSIPpdrAZNHs+M91d7FOrLat5rqcpTtQUq/GLIzYwAt+eN0EQHlgdUgm/0U2j+";
    script.crossOrigin = "anonymous";
    script.setAttribute("data-website-id", site);
    script.setAttribute("data-auto-track", "false");
    script.setAttribute("data-before-send", "tuziAnalyticsBeforeSend");
    script.onload = () => { const pending = queue; queue = []; if (window.umami) pending.forEach(send); };
    script.onerror = () => { queue = []; };
    document.head.append(script);
  }
  // Defense in depth: SDK defaults must never add URL parameters, titles or identity.
  window.tuziAnalyticsBeforeSend = (type, p) => {
    if (blocked() || type !== "event" || !Object.hasOwn(pages, p.url?.slice(1)) || p.name && (usageOff || !names.has(p.name))) return false;
    return { website: site, hostname: "tuzi-magpie", url: p.url, title: pages[p.url.slice(1)], referrer: "", data: { ...props(p.data || {}), 版本: /^v?\d+(\.\d+){2}(?:-(?:alpha|beta|rc)\.\d+)?$/.test(boot.analytics?.version) ? boot.analytics.version : "dev", 系统: ["darwin", "windows", "linux"].includes(boot.analytics?.os) ? boot.analytics.os : "other", 模式: boot.web ? "浏览器" : "桌面", 语言: ["zh", "zh-TW", "en", "ja", "de"].includes(boot.lang) ? boot.lang : "system" }, ...(p.name ? { name: p.name } : {}) };
  };
  function event(name, data = {}) { if (!usageOff && names.has(name)) send({ website: site, url: "/" + (current || "agents"), name, data: props(data) }); }
  function page(id) {
    if (!Object.hasOwn(pages, id)) { current = ""; last = ""; return; }
    current = id;
    if (last === id || blocked()) return;
    last = id; send({ website: site, url: "/" + id });
  }
  async function operation(name, run, data = {}) {
    const disconnect = name.startsWith("断开");
    if (!disconnect) event(name, { ...data, 阶段: "开始" });
    try {
      const result = await run();
      event(name, { ...data, 阶段: "结果", 结果: "成功", ...(name === "添加服务商" ? { 服务商: result?.existing ? "复用" : "新增" } : {}) });
      return result;
    } catch (e) {
      if (!disconnect) event(name, { ...data, 阶段: "结果", 结果: e?.outcomeUnknown === true || ["outcome_unknown", "network_uncertain", "write_recovery_required"].includes(e?.code) || e?.name === "AbortError" || e instanceof TypeError ? "待确认" : "失败", 错误码: e?.code });
      throw e;
    }
  }
  window.tuziAnalytics = { page, event, operation, install() {
    const request = api;
    api = (path, body, ...rest) => body === undefined ? request(path, body, ...rest) : window.tuziAnalytics.agent(path, () => request(path, body, ...rest));
  }, settings(s = {}) { off = !!s.noStats; usageOff = !!s.noUsageStats; if (blocked()) queue = []; else if (usageOff) queue = queue.filter(p => !p.name); if (blocked()) last = ""; }, agent(path, run) {
    const match = /^agents\/(connect|disconnect|disconnect-offline)\/([^/?]+)$/.exec(path);
    if (!match) return run();
    const id = enums.智能体.includes(match[2]) ? match[2] : "其他";
    return operation(match[1] === "connect" ? "接入智能体" : "断开智能体", run, { 智能体: id });
  } };
})();
