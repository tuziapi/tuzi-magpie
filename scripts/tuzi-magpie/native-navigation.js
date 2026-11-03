// The process is started with the actual fixed account URL argument.
// This script observes the native callback; it never opens the page itself.
(async () => {
 const checks = [], errors = [];
 const wait = async (fn,label) => { const until=Date.now()+20000; while(Date.now()<until) { if(fn()) return; await new Promise(r=>setTimeout(r,100)); } throw new Error(label); };
 try {
  await wait(()=>typeof view !== "undefined" && view === "tuzi" && document.querySelector("#tuziSystemToken") && document.querySelector("#view-tuzi")?.getAttribute("aria-busy") === "false", "native account navigation did not settle");
  const token=document.querySelector("#tuziSystemToken");
  if (token.value || document.querySelector("#tuziConnection .tuzi-status")?.dataset.state !== "disconnected") throw new Error("navigation connected or filled a credential without a grant");
  if (document.querySelectorAll("#tuziTabs button").length !== 4) throw new Error("four account tabs missing");
  checks.push("actual native fixed account link reaches the mounted four-tab workspace");
  checks.push("navigation does not read clipboard without an explicit grant or auto-connect");
 } catch(e) { errors.push(String(e.message || e)); }
 await fetch("/__tuzi-fixture/report",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({passed:!errors.length,checks,errors,nativeOrigin:location.origin,at:new Date().toISOString()})});
})();
