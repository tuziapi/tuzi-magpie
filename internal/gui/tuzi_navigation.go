package gui

// Wails runtime readiness can precede start.js mounting the page plugins.
// A cold scheme launch uses the existing navigation/discard path only once
// the document has finished loading; warm launches run it immediately.
const tuziAccountNavigateJS = `(() => {
 const navigate = () => show("tuzi").then(ok => { if (ok) magpie.call("tuzi", "navigate"); });
 if (document.readyState === "loading") addEventListener("DOMContentLoaded", navigate, {once:true});
 else navigate();
})();`
