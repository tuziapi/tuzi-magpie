// Runs only through the tuzi_fixture native-window hook, in an isolated app.
// These are real DOM actions and real native account/gateway HTTP requests.
(async () => {
  if (window.__tuziNativeAcceptance) return;
  window.__tuziNativeAcceptance = true;
  const checks = [], errors = [], nativeErrors = [];
 let initialStateRead = false;
 const actualFetch = window.fetch;
 window.fetch = async (...args) => {
  const response = await actualFetch(...args);
  if (String(args[0]).startsWith("/api/tuzi/")) {
   const body = await response.clone().json().catch(()=>({}));
   if (String(args[0]) === "/api/tuzi/state") initialStateRead = true;
   if (!response.ok || body.error || body.status === "invalid") nativeErrors.push({path:args[0],status:response.status,code:body.error?.code,state:body.status});
  }
  return response;
 };
  fetch("/__tuzi-fixture/started").catch(() => {});
  let stage = "startup", providerId = "";
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const visible = n => n && n.getClientRects().length && !n.disabled;
  const wait = async (fn, label, timeout = 20000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const result = fn(); if (result) return result; await delay(100); }
    throw new Error("Timed out: " + label);
  };
  const click = async (label, scope = document) => {
    const b = await wait(() => [...scope.querySelectorAll("button")].find(n => visible(n) && n.textContent.trim() === label), label);
    b.click();
  };
  const field = async (label, value) => {
    const input = await wait(() => [...document.querySelectorAll("input,textarea")].find(n => visible(n) && n.getAttribute("aria-label") === label), label);
    input.value = value; input.dispatchEvent(new Event("input", {bubbles:true})); return input;
  };
  const settle = async () => { await delay(300); await wait(() => document.querySelector("#view-tuzi")?.getAttribute("aria-busy") !== "true", "idle"); };
  const clean = () => {
    const bad = [...document.querySelectorAll("#view-tuzi .tuzi-error")].filter(n => visible(n) && n.textContent.trim());
    if (bad.length) throw new Error("Page reports: " + bad.map(n => n.textContent).join("; "));
  };
  try {
    await wait(() => typeof show === "function" && window.magpie?.page("tuzi") && document.querySelector("#tuziTabs button"), "real app and Tuzi page");
    await show("tuzi");
    await wait(() => initialStateRead, "initial native account state");
    await settle();
    stage = "connect";
    await field("Account system token", "synthetic-system-token");
    await click("Connect account");
    await wait(() => document.querySelector("#tuziConnection")?.textContent.includes("Synthetic local account"), "connected account");
    await wait(() => document.querySelectorAll(".tuzi-key .name").length > 0 && document.querySelector("#tuziPane")?.textContent.includes("Fixture key"), "account key list");
    await settle(); clean();
    const summaries = [...document.querySelectorAll("#tuziPane .tuzi-metrics > div")];
    if (summaries.length !== 4 || summaries.some(n => !n.querySelector("dd")?.textContent.trim() || n.querySelector("dd").textContent.includes("—"))) throw new Error("Four account summaries were not populated");
    checks.push("native connection and four populated summaries");
    stage = "create-key";
    await click("Create API key");
    await field("Name", "Native created key");
    const form = document.querySelector("#tuziSheet form");
    form.requestSubmit();
    await wait(() => document.querySelector("#tuziSheet")?.textContent.includes("Native created key") && document.querySelector("#tuziSheet")?.getAttribute("aria-label") === "Key details", "created key detail");
    await settle(); clean();
    await click("Reveal key", document.querySelector("#tuziSheet"));
    await wait(() => document.querySelector(".tuzi-secret")?.textContent.includes("sk-synthetic-model-key"), "revealed synthetic key");
    await settle();
    await click("Close", document.querySelector("#tuziSheet"));
    if (document.querySelector(".tuzi-secret")) throw new Error("Revealed key retained after closing");
    checks.push("create/reveal/close removes key DOM");
    stage = "provider";
    const keyRow = [...document.querySelectorAll("#tuziPane .tuzi-key")].find(n => n.textContent.includes("Fixture key"));
    await click("Add to Magpie", keyRow);
    await field("Provider name", "Native account provider");
    await field("Model IDs, separated by commas", "gpt-5.5");
    await settle(); await click("Add provider", document.querySelector("#tuziSheet"));
    await wait(() => document.querySelector("#tuziSheet")?.getAttribute("aria-label") === "Provider saved", "provider saved");
    await settle(); clean();
    await click("Close", document.querySelector("#tuziSheet"));
    checks.push("account key qualified and saved as Provider");
    for (const [label, ready] of [["Tuzi call details","Consumption statistics and trends"],["Model marketplace","Model details"],["Tuzi model status","Success rate"]]) {
      stage = label;
      await click(label, document.querySelector("#tuziTabs"));
      await wait(() => document.querySelector("#tuziPane")?.textContent.includes(ready), ready);
      await settle(); clean(); checks.push(label);
    }
    stage = "gateway";
    const providers = await (await fetch("/api/providers")).json();
    const provider = providers.providers.find(p => p.name === "Native account provider");
    if (!provider) throw new Error("Saved provider missing from Go providers API");
    providerId = provider.id;
    checks.push("saved Provider returned by real native Go API");
    await show("tuzi"); await settle(); clean();
  } catch (e) { errors.push({stage, message:String(e?.message || e), view: typeof view === "undefined" ? null : view, featuresOff: [...featuresOff], page: document.querySelector("#view-tuzi")?.textContent.slice(0,4000), fields: [...document.querySelectorAll("#view-tuzi input")].map(n=>({label:n.getAttribute("aria-label"),disabled:n.disabled,rects:n.getClientRects().length}))}); }
  window.fetch = actualFetch;
  const result = {providerId, nativeErrors, passed:errors.length === 0 && nativeErrors.length === 0, checks, errors, nativeOrigin:location.origin, at:new Date().toISOString()};
  window.__tuziNativeResult = result;
  await fetch("/__tuzi-fixture/report", {method:"POST", headers:{"Content-Type":"text/plain"}, body:JSON.stringify(result)});
})();
