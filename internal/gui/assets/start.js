// The window's start, loaded last: app.js, the plugins' pages and the
// scripts after app.js are all there, so the first page shown has its
// code (the Usage page's is a plugin's, run after app.js).
// the plugins' pages wired up (kernel.js), before the first is shown
magpie.start();
navHides(); // the pages built-in plugins switched off have, from boot.js
// Explicit links win, then the last page. A new native window starts on Tuzi;
// Web and the tray retain their own starting pages.
const OPEN_VIEWS = ["providers", "plugins", "settings", ...magpie.pages()];
function keptView() {
  const asked = params.get("view");
  if (asked === "agents" || OPEN_VIEWS.includes(asked)) return asked;
  let v = "";
  try { v = localStorage.getItem("magpie.lastView") || ""; } catch { /* none kept */ }
  if (v === "agents" || OPEN_VIEWS.includes(v)) return v;
  return !web && OPEN_VIEWS.includes("tuzi") ? "tuzi" : "";
}
const firstView = mode === "window" ? keptView() : "";
// from the tray panel's More in Plugins (q): Discover, once show() picked the tab (#3579)
if (OPEN_VIEWS.includes(firstView)) show(firstView).then(() => view === "plugins" && params.has("q") && window.pluginQuery?.(params.get("q")));
else if (mode === "window" && !gatewayMode && !sideNav()) slide($("#nav"), "nav");
// in gateway mode the first page is Providers, Agents' tab gone
if (gatewayMode) setGatewayMode(true);
load();
