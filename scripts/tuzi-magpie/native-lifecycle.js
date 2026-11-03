// Reopen the actual native window on the preceding run's isolated account.
(async () => {
  const checks = [], errors = [];
  let providerId = "";
  const wait = async (fn, label) => { const until = Date.now()+20000; while(Date.now()<until) { const v=fn(); if(v) return v; await new Promise(r=>setTimeout(r,100)); } throw new Error(label); };
  const click = async (label, scope=document) => { const b=await wait(()=>[...scope.querySelectorAll("button")].find(n=>!n.disabled && n.getClientRects().length && n.textContent.trim()===label),label); b.click(); };
  try {
    await wait(()=>document.querySelector("#tuziTabs button"),"mounted page");
    await show("tuzi");
    await wait(()=>document.querySelector("#tuziConnection .tuzi-status")?.dataset.state === "connected", "saved account restored");
    await wait(()=>document.querySelector("#tuziPane")?.textContent.includes("Fixture key"),"restored account keys");
    checks.push("actual app restart restores and checks synthetic account");
    const before = await (await fetch("/api/providers")).json();
    providerId = before.providers.find(p=>p.name === "Native account provider")?.id;
    if (!providerId) throw new Error("desktop Provider missing after restart");
    await click("Disconnect account");
    await click("Confirm", document.querySelector("#tuziSheet"));
    await wait(()=>document.querySelector("#tuziConnection .tuzi-status")?.dataset.state === "disconnected", "account disconnected");
    const after = await (await fetch("/api/providers")).json();
    if (!after.providers.some(p=>p.id === providerId)) throw new Error("disconnect removed Provider");
    if (document.querySelector(".tuzi-secret")) throw new Error("disconnect kept revealed secret");
    checks.push("native disconnect clears account and preserves saved Provider");
  } catch(e) { errors.push({message:String(e.message || e), view, page:document.querySelector("#view-tuzi")?.textContent.slice(0,3000), buttons:[...document.querySelectorAll("#tuziConnection button")].map(b=>({text:b.textContent,disabled:b.disabled,rects:b.getClientRects().length}))}); }
  await fetch("/__tuzi-fixture/report",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({passed:!errors.length,checks,errors,providerId,nativeOrigin:location.origin,at:new Date().toISOString()})});
})();
