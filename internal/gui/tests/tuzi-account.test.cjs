// Synthetic UI contract tests. Native service / gateway E2E is tested separately.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {test} = require('node:test');
const {chromium, webkit} = require('playwright');
const {reach} = require('./reader.cjs');
const assets = process.env.TUZI_UI_ASSETS || path.resolve(__dirname, '../assets');
const key = () => ({id:'8',name:'Synthetic key',masked_key:'sk-••••test',status:1,group:'default',created_time:1700000000,accessed_time:0,expired_time:-1,remain_quota:'500000',unlimited_quota:true,used_quota:'200',model_limits_enabled:false,model_limits:'',allow_ips:null,exclude_ips:null,is_expired:false});
const model = () => ({model_name:'fixture-model',aliases:null,description:'Synthetic catalog model',tags:'text',quota_type:1,model_ratio:1,completion_ratio:2,enable_groups:['default'],supported_endpoint_types:['responses'],related_pricing:null});
function fixture(lang='en',theme='light',web=false) {
  let state={status:'disconnected',generation:1,identity:null,error:null};
  let keys=[key()], next=9, uncertain=false, prefillGate=null, stateGate=null, checkGate=null, nextFailure=null, requestGate=null;
  const calls=[], modelRequests=[], heldRequests=new Set();
  const pageData = (items, page=1) => ({items,page,page_size:20,total:String(items.length),has_more:false});
  const account={user_id:'7',username:'fixture',display_name:'Synthetic account',group:'default',quota:'500000',used_quota:'200',request_count:'1',money:{quota_per_unit:'500000',display_type:'CNY',base_currency:'USD',usd_exchange_rate:'7',custom_currency_symbol:'',custom_currency_exchange_rate:'1'}};
  const summary={record_count:'2',error_count:'1',quota:'1000',refund_quota:'300',prompt_tokens:'10',completion_tokens:'20'};
  const handler=async(route)=>{
    const u=new URL(route.request().url()), req=route.request(), body=req.postDataJSON();
    const json=(data,status=200)=>route.fulfill({json:data,status});
    if(u.pathname==='/boot.js')return route.fulfill({contentType:'text/javascript',body:`window.bootPrefs=${JSON.stringify({lang,theme,web})};`});
    if(u.pathname==='/wails/runtime.js')return route.fulfill({contentType:'text/javascript',body:'export const Window={};'});
    if(u.pathname==='/api/state')return json({agents:[],profiles:[],settings:{lang,theme}});
    if(u.pathname==='/api/providers')return json({providers:[],presets:[],gateway:{running:false,url:'http://127.0.0.1:18343',calls:[],groups:[]}});
    if(u.pathname.startsWith('/api/tuzi/')) {
      calls.push([u.pathname,body]);
      if(requestGate?.match(u.pathname,body)){const held=requestGate;requestGate=null;held.enter();await held.wait;}
      if(u.pathname.endsWith('/state')){const snapshot=structuredClone(state);if(stateGate)await stateGate;return json(snapshot);}
      if(u.pathname.endsWith('/connect')){state={status:'connected',generation:state.generation+1,identity:{userId:'7',username:'fixture',displayName:'Synthetic account',connectionId:'synthetic'},error:null};return json(state);}
      if(u.pathname.endsWith('/check')){if(checkGate)await checkGate;if(state.status==='offline')state={...state,status:'connected'};return json(state);}
      if(u.pathname.endsWith('/disconnect')){state={status:'disconnected',generation:state.generation+1,identity:null,error:null};return json(state);}
      if(u.pathname.endsWith('/prefill')){if(prefillGate)await prefillGate;return json({token:'SyntheticPrefillToken12345678901'});}
      if(u.pathname.endsWith('/open'))return json({});
      if(u.pathname.endsWith('/provider'))return json({providerId:'tuzi-8',existing:false});
      if(u.pathname.endsWith('/recover'))return json({success:true,data:body.acknowledge?{pending:null}:{pending:{method:'PATCH',path:'/account/keys/8',readBack:true},data:keys[0],requiresConfirmation:true}});
      const p=body.path, method=body.method, query=Object.fromEntries(body.query || []), ok=data=>json({success:true,data});
      if(body.generation!==state.generation)return json({success:false,error:{code:'stale_generation'}},409);
      if(nextFailure?.path===p){const code=nextFailure.code;nextFailure=null;if(['invalid_token','account_disabled','identity_mismatch'].includes(code))state={...state,status:'invalid',identity:null,error:{code}};return json({success:false,error:{code}},code==='network'?503:401);}
      if(p==='/account/account')return ok(account);
      if(p==='/account/key-groups')return ok([{id:'default',label:'default'},{id:'other',label:'other'}]);
      if(p==='/account/usage/summary')return ok({...summary,call_count:'2'});
      if(p==='/account/keys'&&method==='GET')return ok(pageData(keys.filter(k=>!query.keyword||k.name.includes(query.keyword))));
      if(p==='/account/keys'&&method==='POST'){const k={...key(),...body.body,id:String(next++)};keys.push(k);return ok({id:k.id,key:'sk-synthetic-created'});}
      if(p.startsWith('/account/keys/')){const id=p.split('/')[3], k=keys.find(x=>x.id===id);if(!k)return json({success:false,error:{code:'not_found'}},404);if(p.endsWith('/reveal'))return ok({key:'sk-synthetic-revealed'});if(p.endsWith('/models'))return ok({items:[model()],key:k});if(method==='PATCH'){if(uncertain){uncertain=false;return json({success:false,error:{code:'outcome_unknown',outcomeUnknown:true}},504);}Object.assign(k,body.body);}if(method==='DELETE'){keys=keys.filter(x=>x.id!==id);return ok({});}return ok(k);}
      if(p==='/account/models'){modelRequests.push(query);return ok({items:query.search==='11'?[]:Number(query.page_size)===6?Array.from({length:6},(_,i)=>({...model(),model_name:i?'fixture-model-'+i:'fixture-model'})):[model()],pagination:{page:Number(query.page||1),page_size:Number(query.page_size||20),total:Number(query.page_size)===6?'6':'1',has_more:false},snapshot_id:'fixture-snapshot',snapshot_refreshed:false,pricing_meta:{filter_facets:{groups:{default:1},endpoint_types:{responses:1},vendors:{fixture:1},tags:{text:1,vision:1}},usable_group:{default:'Default'},base_group_ratio:{default:1}}});}
      if(p==='/account/model-performance/batch')return ok([{model_name:'fixture-model',aggregate:{has_samples:true,success_rate:99.1234,avg_latency_ms:123.456,avg_ttft_ms:12.345,latest_sample_ts:1700000000,half_hour_series:[{ts:1700000000,has_samples:false,success_rate:null},{ts:1700001800,has_samples:true,success_rate:97.6543}]},groups:[{group:'MUST-NOT-DISPLAY',has_samples:true,success_rate:99}]}]);
      if(p==='/account/logs'){const page=Number(query.page||1), size=Number(query.page_size);assert.equal(size,10);const items=Array.from({length:11},(_,i)=>({id:String(i+1),type:2,created_at:1700000000+i,model_name:'fixture-model-with-a-long-name',token_name:'Synthetic key',group:'default',request_id:'request-fixture',result:i%2?'error':'success',error_message:i%2?'Synthetic public error':'',billing_status:'charged',quota:'1000',prompt_tokens:'10',completion_tokens:'20',duration_ms:100,is_stream:true}));return ok({items:items.slice((page-1)*size,page*size),page,page_size:size,total:'11',has_more:page===1});}
      if(p==='/account/logs/statistics'){assert.ok(!('page' in query)&&!('page_size' in query),'statistics rejects pagination fields');return ok({summary,trend:[{...summary,start_timestamp:1700000000,end_timestamp:1700003600}],by_model:Array.from({length:7},(_,i)=>({...summary,model_name:'fixture-model-'+i})),by_error:[{record_count:'1',error_code:'fixture_error'}]});}
      if(p.startsWith('/account/logs/requests/'))return ok({items:[{id:'1',model_name:'CURRENT-RECORD',quota:'1000'},{id:'2',model_name:'OTHER-RECORD',quota:'1000'}],has_more:false});
      return json({success:false,error:{code:'unexpected_fixture_request'}},400);
    }
    if(u.pathname.startsWith('/api/'))return json({});
    if(u.host!=='magpie.test')return route.fulfill({status:404,body:''});
    const name=u.pathname==='/'?'index.html':u.pathname.slice(1), file=path.join(assets,name);let source;try{source=await fs.readFile(file);}catch{return route.fulfill({status:404,body:''});}
    if(name==='index.html'){
      source=source.toString();
      // Before root integrates the three script registrations, exercise them
      // against the unchanged real shell. The integrated tree already has them.
      if(!source.includes('plugins/tuzi/client.js'))source=source.replace('<script src="app.js', '<script src="plugins/tuzi/money.js"></script><script src="plugins/tuzi/i18n.js"></script><script src="plugins/tuzi/client.js"></script><script src="app.js').replace('</head>','<link rel="stylesheet" href="plugins/tuzi/tuzi.css"></head>');
      if(!source.includes('data-view="tuzi"'))source=source.replace('</nav>','<button data-view="tuzi" data-feature="tuzi"><span data-t>Tuzi account</span></button></nav>');
    }
    return route.fulfill({body:source,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[path.extname(file)]});
  };
  return {handler,calls,modelRequests,releaseHolds:()=>{for(const release of heldRequests)release();heldRequests.clear();},holdRequest:(match)=>{let release,enter;const wait=new Promise(r=>{release=r;}),entered=new Promise(r=>{enter=r;});requestGate={match,wait,enter};heldRequests.add(release);return {release,entered};},setUncertain:()=>{uncertain=true;},failNext:(code,path)=>{nextFailure={code,path};},getState:()=>state,holdState:()=>{let release;stateGate=new Promise(r=>{release=r;});return release;},holdCheck:()=>{let release;checkGate=new Promise(r=>{release=r;});return release;},holdPrefill:()=>{let release;prefillGate=new Promise(r=>{release=r;});return release;},setState:(v)=>{state=v;}};
}
async function click(page, locator){
  try {
    await locator.waitFor({state:'visible'});
    const inSheet=await locator.evaluate(e=>!!e.closest('.tuzi-dialog'));
    if(inSheet){
      for(let i=0;i<30;i++){
        const b=await locator.boundingBox(), d=await page.locator('#tuziSheet').boundingBox();
        const visible=b.y>=d.y+20 && b.y+b.height<=d.y+d.height-10;
        if(visible)break;
        await page.mouse.move(d.x+d.width/2,d.y+d.height/2);
        await page.mouse.wheel(0,b.y<d.y+20?-120:120);
        await page.waitForTimeout(50);
      }
    } else await reach(page,locator);
    await locator.click();
  }catch(e){
    if(process.env.ARTIFACT_DIR){await fs.mkdir(process.env.ARTIFACT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ARTIFACT_DIR,'failure.png')});}
    throw e;
  }
}
async function translated(page,key){return page.evaluate(k=>t(k),key);}
async function btn(page,key,scope=page){return scope.getByRole('button',{name:await translated(page,key),exact:true});}
for(const engine of (process.env.BROWSER?[process.env.BROWSER]:['chromium','webkit']))test(`${engine}: Tuzi account manages keys, records, catalog and status with isolated credentials`,async(t)=>{
  const browser=await(engine==='webkit'?webkit.launch():chromium.launch(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chromium'}));t.after(()=>browser.close());
  for(const lang of (process.env.TUZI_TEST_LANG?[process.env.TUZI_TEST_LANG]:['en','zh','zh-TW','ja','de']))for(const width of [1100,420]){
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(60000);
    const f=fixture(lang,width===420?'dark':'light'), errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',f.handler);await page.goto('http://magpie.test/?view=tuzi');
    const root=page.locator('#view-tuzi');await root.waitFor();
    assert.equal(await root.locator('[role=tab]').count(),4);assert.equal(f.calls.filter(x=>x[0].endsWith('/request')).length,0,'disconnected page does not fetch business data');
    await page.getByLabel(await translated(page,'Account system token')).fill('synthetic-account-token');await click(page,await btn(page,'Connect account',root));await root.locator('.tuzi-metrics').waitFor();
    assert.equal(await root.locator('.tuzi-metrics>div').count(),4);assert.equal(await root.locator('.tuzi-metrics dd').first().textContent(),'CNY 7.00');
    await click(page,await btn(page,'Key details',root));await click(page,await btn(page,'Reveal key',root));await root.getByText('sk-synthetic-revealed',{exact:true}).waitFor();
    assert.ok(f.calls.some(([,b])=>b?.path==='/account/keys/8/reveal'&&b.method==='POST'));
    await click(page,await btn(page,'Close',root));assert.equal(await root.getByText('sk-synthetic-revealed',{exact:true}).count(),0);
    await click(page,await btn(page,'Edit',root));await page.getByLabel(await translated(page,'Name'),{exact:true}).fill('Edited key');await click(page,await btn(page,'Save',root));await root.getByText('Edited key',{exact:true}).waitFor();
    const patch=f.calls.find(([,b])=>b?.path==='/account/keys/8'&&b.method==='PATCH')[1];assert.deepEqual(patch.body,{name:'Edited key'},'PATCH preserves untouched limits');
    await click(page,await btn(page,'Create API key',root));await page.getByLabel(await translated(page,'Name'),{exact:true}).fill('New synthetic key');await click(page,await btn(page,'Save',root));await root.getByText('New synthetic key',{exact:true}).first().waitFor();await click(page,await btn(page,'Close',root));
    await click(page,(await btn(page,'Add to Magpie',root)).first());await page.getByLabel(await translated(page,'Model IDs, separated by commas')).fill('fixture-model');await click(page,await btn(page,'Add provider',root));await root.getByText(await translated(page,'Provider saved'),{exact:true}).waitFor();assert.equal(f.calls.filter(x=>x[0].endsWith('/provider')).length,1);await click(page,await btn(page,'Close',root));
    await click(page,root.getByRole('tab',{name:await translated(page,'Tuzi call details'),exact:true}));await root.locator('table').first().waitFor();assert.equal(await root.locator('.tuzi-metrics').count(),0);assert.equal(f.calls.find(([,b])=>b?.path==='/account/logs')[1].query.find(([k])=>k==='page_size')[1],'10');
    await root.getByText(await translated(page,'Refund amount'),{exact:true}).first().waitFor();if(process.env.ARTIFACT_DIR&&lang==='en'){await fs.mkdir(process.env.ARTIFACT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ARTIFACT_DIR,`tuzi-logs-${engine}-${width}.png`)});}assert.equal(f.calls.filter(([,b])=>b?.path==='/account/logs/statistics').length,1);
    await click(page,root.getByRole('tab',{name:await translated(page,'Model marketplace'),exact:true}));await root.locator('.tuzi-model').waitFor();await click(page,await btn(page,'Model details',root));await root.getByText(await translated(page,'Catalog price'),{exact:true}).waitFor();assert.match(await root.locator('#tuziSheet').textContent(),/\$2/);if(process.env.ARTIFACT_DIR&&lang==='en')await page.screenshot({path:path.join(process.env.ARTIFACT_DIR,`tuzi-prices-${engine}-${width}.png`)});await click(page,await btn(page,'Close',root));
    await click(page,root.getByRole('tab',{name:await translated(page,'Tuzi model status'),exact:true}));await root.getByText('99.12%',{exact:true}).waitFor();assert.equal(await root.getByText('MUST-NOT-DISPLAY',{exact:true}).count(),0);assert.equal(await root.locator('.tuzi-series').first().locator('[tabindex="0"]').count(),2);assert.match(await root.locator('.tuzi-series').first().locator('i').last().getAttribute('title'),/97.65%/);await root.getByText('123.46 ms',{exact:true}).waitFor();const batch=f.calls.find(([,b])=>b?.path==='/account/model-performance/batch')[1];assert.equal(batch.body.hours,6);assert.ok(!('groups'in batch.body),'all groups omitted');assert.equal(f.modelRequests.at(-1).page_size,'6');assert.equal(await root.locator('.tuzi-model').count(),6);assert.equal(batch.body.models.length,6);
    assert.equal(await root.locator('select').count(),0);assert.ok(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no horizontal overflow');
    assert.ok(await page.evaluate(()=>!Object.values(localStorage).some(v=>v.includes('synthetic-account-token')||v.includes('sk-synthetic'))),'no persistent secrets');
    if(process.env.ARTIFACT_DIR){await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.id==='thumb').map(a=>a.finished.catch(()=>{}))));await fs.mkdir(process.env.ARTIFACT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ARTIFACT_DIR,`tuzi-${engine}-${lang}-${width}.png`)});}
    assert.deepEqual(errors,[],`${engine}/${lang}/${width}`);await context.close();
  }
});
for(const engine of (process.env.BROWSER?[process.env.BROWSER]:['chromium','webkit']))test(`${engine}: unknown writes require readback, deletion needs confirmation, and Web has no account UI`,async(t)=>{
  const browser=await(engine==='webkit'?webkit.launch():chromium.launch(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chromium'}));t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(60000);const f=fixture();await page.route('**/*',f.handler);await page.goto('http://magpie.test/?view=tuzi');const root=page.locator('#view-tuzi');
  await page.getByLabel('Account system token',{exact:true}).fill('synthetic-account-token');await click(page,root.getByRole('button',{name:'Connect account',exact:true}));await root.locator('.tuzi-metrics').waitFor();
  await click(page,root.getByRole('button',{name:'Edit',exact:true}));await page.getByLabel('Name',{exact:true}).fill('Unsaved name');await click(page,root.getByRole('button',{name:'Close',exact:true}));await root.getByText('Discard unsaved key changes?',{exact:true}).waitFor();await click(page,root.getByRole('button',{name:'Keep editing',exact:true}));assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Unsaved name');
  f.setUncertain();await click(page,root.getByRole('button',{name:'Save',exact:true}));await root.getByRole('button',{name:'Read back uncertain write',exact:true}).waitFor();assert.ok(await root.getByRole('button',{name:'Save',exact:true}).isDisabled());
  await click(page,root.getByRole('button',{name:'Read back uncertain write',exact:true}));await root.getByText('Current server result',{exact:true}).waitFor();assert.equal(await root.locator('#tuziSheet').getByText('sk-synthetic-revealed',{exact:true}).count(),0);await click(page,root.getByRole('button',{name:'I checked the result',exact:true}));await root.locator('.tuzi-key .name').filter({hasText:'Synthetic key'}).waitFor();
  const recovery=f.calls.filter(x=>x[0].endsWith('/recover'));assert.deepEqual(recovery.map(([,b])=>b.acknowledge),[false,true]);assert.equal(f.calls.filter(([,b])=>b?.method==='PATCH').length,1,'no blind write replay');
  await click(page,root.getByRole('button',{name:'Edit',exact:true}));await click(page,root.locator('summary').filter({hasText:'Advanced key limits'}));
  await page.getByLabel('Unlimited key quota',{exact:true}).uncheck();await page.getByLabel('Key monetary limit',{exact:true}).fill('1.25');
  await click(page,root.getByRole('button',{name:'Expiry',exact:true}));await page.getByRole('menuitemradio',{name:'Choose expiry date',exact:true}).click();
  await page.getByLabel('Expiry date',{exact:true}).fill('2030-06-15T12:00');await page.getByLabel('Restrict available models',{exact:true}).check();await page.getByLabel('Allowed model IDs, separated by commas',{exact:true}).fill('fixture-model');
  await page.getByLabel('Allowed IP addresses',{exact:true}).fill('127.0.0.1');await page.getByLabel('Excluded IP addresses',{exact:true}).fill('192.0.2.1');await click(page,root.getByRole('button',{name:'Save',exact:true}));
  await root.getByRole('button',{name:'Key details',exact:true}).waitFor();const advancedPatch=f.calls.filter(([,b])=>b?.method==='PATCH').at(-1)[1].body;
  assert.equal(advancedPatch.remain_quota,'89286');assert.equal(advancedPatch.unlimited_quota,false);assert.equal(advancedPatch.model_limits_enabled,true);assert.equal(advancedPatch.allow_ips,'127.0.0.1');assert.equal(advancedPatch.exclude_ips,'192.0.2.1');assert.ok(advancedPatch.expired_time>0);assert.ok(!('name' in advancedPatch));
  await click(page,root.getByRole('button',{name:'Key details',exact:true}));await click(page,root.getByRole('button',{name:'Delete key',exact:true}));await click(page,root.getByRole('button',{name:'Cancel',exact:true}));assert.equal(f.calls.filter(([,b])=>b?.method==='DELETE').length,0);
  await click(page,root.getByRole('button',{name:'Key details',exact:true}));await click(page,root.getByRole('button',{name:'Delete key',exact:true}));await click(page,root.getByRole('button',{name:'Confirm',exact:true}));await root.getByText('No API keys match these filters.',{exact:true}).waitFor();assert.equal(f.calls.filter(([,b])=>b?.method==='DELETE').length,1);
  await click(page,root.getByRole('button',{name:'Disconnect account',exact:true}));await click(page,root.getByRole('button',{name:'Confirm',exact:true}));await page.getByLabel('Account system token',{exact:true}).waitFor();assert.equal(await root.locator('.tuzi-metrics').count(),0);
  const webContext=await browser.newContext();t.after(()=>webContext.close());const webPage=await webContext.newPage();webPage.setDefaultTimeout(10000);webPage.setDefaultNavigationTimeout(60000);const webFixture=fixture('en','light',true);await webPage.route('**/*',webFixture.handler);await webPage.goto('http://magpie.test/');assert.equal(await webPage.locator('#view-tuzi').count(),0);assert.equal(webFixture.calls.length,0);
});

for(const engine of (process.env.BROWSER?[process.env.BROWSER]:['chromium','webkit']))test(`${engine}: applied filters, catalog searches, refreshed metadata and prefill lifecycle`,async(t)=>{
  const browser=await(engine==='webkit'?webkit.launch():chromium.launch(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chromium'}));t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(10000);const f=fixture();await page.route('**/*',f.handler);await page.goto('http://magpie.test/?view=tuzi');const root=page.locator('#view-tuzi');
  await root.getByText('Connect your account to manage keys, records and models. Existing Magpie features work without an account.',{exact:true}).waitFor();await root.getByRole('tab',{name:'API keys',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await root.getByRole('tab',{name:'Tuzi call details',exact:true}).getAttribute('aria-selected'),'true');await page.keyboard.press('Home');assert.equal(await root.getByRole('tab',{name:'API keys',exact:true}).getAttribute('aria-selected'),'true');
  const input=page.getByLabel('Account system token',{exact:true});await input.fill('manual-token');await page.evaluate(()=>magpie.call('tuzi','navigate'));assert.equal(await input.inputValue(),'manual-token');assert.equal(f.calls.filter(([p])=>p.endsWith('/prefill')).length,0);
  await input.fill('');const release=f.holdPrefill();await page.evaluate(()=>{window.pendingNavigate=magpie.call('tuzi','navigate');});await page.waitForFunction(()=>document.querySelector('#tuziSystemToken')!=null);while(!f.calls.some(([p])=>p.endsWith('/prefill')))await page.waitForTimeout(20);await page.evaluate(()=>magpie.call('tuzi','leave'));release();await page.evaluate(()=>window.pendingNavigate);assert.equal(await input.inputValue(),'','leaving cannot refill a hidden credential');
  await page.evaluate(()=>magpie.call('tuzi','open'));await input.fill('synthetic-account-token');await click(page,await btn(page,'Connect account',root));await root.locator('.tuzi-metrics').waitFor();
  const before=f.calls.filter(([,b])=>b?.path==='/account/account').length;await click(page,await btn(page,'Refresh',root));await page.waitForFunction(()=>document.querySelector('#tuziPane').getAttribute('aria-busy')!=='true');assert.equal(f.calls.filter(([,b])=>b?.path==='/account/account').length,before+1);
  await page.getByLabel('Short key fragment',{exact:true}).fill('abc');assert.equal(await page.getByLabel('Short key fragment',{exact:true}).evaluate(e=>e.checkValidity()),false);await page.getByLabel('Short key fragment',{exact:true}).fill('abcd');assert.equal(await page.getByLabel('Short key fragment',{exact:true}).evaluate(e=>e.checkValidity()),true);
  await click(page,root.getByRole('tab',{name:'Tuzi call details',exact:true}));await root.getByText('Refund amount',{exact:true}).waitFor();assert.equal(await root.locator('.tuzi-logs tbody tr').count(),10);assert.equal(await root.getByText('fixture-model-5',{exact:true}).count(),0);await click(page,await btn(page,'All model rankings',root));await root.getByText('fixture-model-6',{exact:true}).waitFor();await click(page,await btn(page,'Close',root));
  const statsCall=f.calls.filter(([,b])=>b?.path==='/account/logs/statistics').at(-1)[1], listCall=f.calls.filter(([,b])=>b?.path==='/account/logs').at(-1)[1];const {page:ignoredPage,page_size:ignoredSize,...applied}=Object.fromEntries(listCall.query);const {interval_seconds:ignoredInterval,...statsQuery}=Object.fromEntries(statsCall.query);assert.deepEqual(statsQuery,applied);assert.notEqual(await root.locator('.tuzi-trend i').getAttribute('title'),'—');
  await click(page,root.locator('summary').filter({hasText:'More log filters'}));await click(page,await btn(page,'Log group',root));await page.getByRole('menuitemradio',{name:'other',exact:true}).click();const reads=f.calls.filter(([,b])=>b?.path==='/account/logs').length;assert.equal(Object.fromEntries(f.calls.filter(([,b])=>b?.path==='/account/logs').at(-1)[1].query).group,undefined);await click(page,await btn(page,'Apply filters',root));await page.waitForFunction(()=>document.querySelector('#tuziPane').getAttribute('aria-busy')!=='true');assert.equal(f.calls.filter(([,b])=>b?.path==='/account/logs').length,reads+1);assert.equal(Object.fromEntries(f.calls.filter(([,b])=>b?.path==='/account/logs').at(-1)[1].query).group,'other');
  await page.getByLabel('Go to page',{exact:true}).fill('2');await page.getByLabel('Go to page',{exact:true}).press('Enter');await page.waitForFunction(()=>document.querySelectorAll('.tuzi-logs tbody tr').length===1);assert.equal(Object.fromEntries(f.calls.filter(([,b])=>b?.path==='/account/logs').at(-1)[1].query).page,'2');await click(page,await btn(page,'Previous',root));await page.waitForFunction(()=>document.querySelectorAll('.tuzi-logs tbody tr').length===10);
  await click(page,(await btn(page,'Recorded call details',root)).first());await click(page,await btn(page,'Related request records',root));await root.getByText('OTHER-RECORD',{exact:true}).waitFor();assert.equal(await root.getByText('CURRENT-RECORD',{exact:true}).count(),0);await click(page,await btn(page,'Close',root));
  await click(page,root.getByRole('tab',{name:'Model marketplace',exact:true}));await root.locator('.tuzi-model').waitFor();const search=page.getByLabel('Search model catalog',{exact:true});await search.fill('11');await root.getByText('No models match these filters.',{exact:true}).waitFor();assert.equal(await search.inputValue(),'11');assert.ok(await search.evaluate(e=>e===document.activeElement));await search.fill('fixture');await search.press('Enter');await root.locator('.tuzi-model').waitFor();assert.equal(f.modelRequests.at(-1).search,'fixture');
  await click(page,await btn(page,'Model tag',root));await page.getByLabel('Search choices',{exact:true}).fill('vision');await page.getByRole('menuitemcheckbox',{name:'vision',exact:true}).click();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#tuziPane').getAttribute('aria-busy')!=='true');assert.equal(f.modelRequests.at(-1).tag,'vision');
});

for(const engine of (process.env.BROWSER?[process.env.BROWSER]:['chromium','webkit']))test(`${engine}: authentication failures reconcile native state while network errors preserve connection`,async(t)=>{
  const browser=await(engine==='webkit'?webkit.launch():chromium.launch(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chromium'}));t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(10000);const f=fixture();await page.route('**/*',f.handler);await page.goto('http://magpie.test/?view=tuzi');const root=page.locator('#view-tuzi');
  const connect=async()=>{await page.getByLabel('Account system token',{exact:true}).fill('synthetic-account-token');await click(page,await btn(page,'Connect account',root));await root.locator('.tuzi-metrics').waitFor();};await connect();
  const stateReads=f.calls.filter(([p])=>p.endsWith('/state')).length;f.failNext('network','/account/account');await click(page,await btn(page,'Refresh',root));await root.getByText('The service is unreachable. Your saved connection is kept.',{exact:true}).waitFor();assert.equal(await root.locator('.tuzi-status').textContent(),'Connected');assert.equal(await root.locator('.tuzi-metrics').count(),1);assert.equal(await root.locator('#tuziSystemToken').count(),0);assert.equal(f.calls.filter(([p])=>p.endsWith('/state')).length,stateReads);
  for(const code of ['invalid_token','account_disabled','identity_mismatch']){
    const originalGeneration=f.getState().generation;
    if(code==='account_disabled'){await click(page,await btn(page,'Key details',root));f.failNext(code,'/account/keys/8/reveal');await click(page,await btn(page,'Reveal key',root));}
    else{f.failNext(code,'/account/account');await click(page,await btn(page,'Refresh',root));}
    await root.getByLabel('Account system token',{exact:true}).waitFor();assert.equal(f.getState().generation,originalGeneration,'invalidation does not need a generation bump');assert.equal(await root.locator('.tuzi-status').textContent(),'Invalid connection');assert.equal(await root.locator('.tuzi-metrics').count(),0);assert.equal(await root.getByRole('button',{name:'Key details',exact:true}).count(),0);assert.ok(await root.locator('#tuziSheet').isHidden());assert.equal(await root.locator('#tuziPane').getAttribute('aria-busy'),null);await connect();
  }
});

for(const engine of (process.env.BROWSER?[process.env.BROWSER]:['chromium','webkit']))test(`${engine}: initial account state and restored connection finish before connection controls enable`,async(t)=>{
  const browser=await(engine==='webkit'?webkit.launch():chromium.launch(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chromium'}));t.after(()=>browser.close());
  for(const restored of [false,true]){
    const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage();page.setDefaultTimeout(10000);const f=fixture();
    if(restored)f.setState({status:'offline',generation:5,identity:{userId:'7',username:'fixture',displayName:'Synthetic account'},error:null});
    const release=restored?f.holdCheck():f.holdState();await page.route('**/*',f.handler);await page.goto('http://magpie.test/?view=tuzi'+(restored?'':'&tuziConnect=1'));const root=page.locator('#view-tuzi');await root.getByRole('tab',{name:'API keys',exact:true}).waitFor();
    while(!f.calls.some(([p])=>p.endsWith(restored?'/check':'/state')))await page.waitForTimeout(20);
    const connect=root.getByRole('button',{name:'Connect account',exact:true});assert.equal(await connect.isDisabled(),true,'initialization gates connection submission');assert.equal(await root.getByLabel('Account system token',{exact:true}).isDisabled(),true);
    await connect.evaluate(e=>e.click());await page.evaluate(()=>magpie.call('tuzi','relang'));assert.equal(f.calls.filter(([p])=>p.endsWith('/connect')).length,0,'no connection starts while initial read is held');assert.equal(await root.getAttribute('aria-busy'),'true');
    release();await page.waitForFunction(()=>document.querySelector('#view-tuzi').getAttribute('aria-busy')==='false');
    if(!restored){await page.waitForFunction(()=>document.querySelector('#tuziSystemToken').value==='SyntheticPrefillToken12345678901');assert.ok(!page.url().includes('tuziConnect'));assert.equal(f.calls.filter(([p])=>p.endsWith('/prefill')).length,1);await root.getByLabel('Account system token',{exact:true}).fill('synthetic-account-token');await click(page,connect);}
    await root.locator('.tuzi-metrics').waitFor();assert.equal(await root.locator('.tuzi-status').textContent(),'Connected');assert.equal(f.calls.filter(([p])=>p.endsWith('/connect')).length,restored?0:1);assert.equal(f.calls.filter(([,b])=>b?.path==='/account/account').length,1);
    await context.close();
  }
});


// Visibility is controlled at the DOM event boundary; HTTP responses remain
// real Playwright requests. Each held reply proves which signal gets aborted.
for(const engine of (process.env.BROWSER?[process.env.BROWSER]:['chromium','webkit']))test(`${engine}: account visibility preserves busy actions and cancels idle reads`,async(t)=>{
  const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chromium'}));t.after(()=>browser.close());
  const setup=async(st,restored=false)=>{
    const errors=[];
    const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'});st.after(async()=>{f.releaseHolds();try{await page.unrouteAll({behavior:'wait'});}finally{await context.close();}assert.deepEqual(errors,[],'visibility transitions produce no page errors');});
    const page=await context.newPage();page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>errors.push(e.message));const f=fixture();
    if(restored)f.setState({status:'connected',generation:4,identity:{userId:'7',displayName:'Synthetic account',connectionId:'synthetic'},error:null});
    await page.addInitScript(()=>{
      const original=window.fetch;window.visibilityRequests=[];
      window.fetch=async(input,init)=>{
        if(!String(input).startsWith('/api/tuzi/'))return original(input,init);
        const body=init?.body?JSON.parse(init.body):null;
        const record={path:String(input),operation:body?.path,method:body?.method,aborted:false,settled:false};window.visibilityRequests.push(record);
        init?.signal?.addEventListener('abort',()=>{record.aborted=true;},{once:true});
        try{return await original(input,init);}catch(e){record.error=e.name;throw e;}finally{record.settled=true;}
      };
      const set=window.setTimeout,clear=window.clearTimeout;window.performanceTimers=new Map();
      window.setTimeout=(fn,ms,...args)=>{const id=set(fn,ms,...args);if(ms===60000&&fn.name==='loadTab')window.performanceTimers.set(id,fn);return id;};
      window.clearTimeout=(id)=>{window.performanceTimers.delete(id);return clear(id);};
    });
    await page.route('**/*',f.handler);
    const visibility=async(hidden)=>page.evaluate(hidden=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:hidden?'hidden':'visible'});Object.defineProperty(document,'hidden',{configurable:true,value:hidden});document.dispatchEvent(new Event('visibilitychange'));},hidden);
    const goto=()=>page.goto('http://magpie.test/?view=tuzi');
    const idle=()=>page.waitForFunction(()=>document.querySelector('#view-tuzi')?.getAttribute('aria-busy')==='false'&&document.querySelector('#tuziPane')?.getAttribute('aria-busy')!=='true');
    const last=()=>page.evaluate(()=>window.visibilityRequests.at(-1));
    return {page,f,visibility,goto,idle,last,root:page.locator('#view-tuzi')};
  };
  await t.test('connect stays busy across hiding until its response is accepted',async(st)=>{
    const {page,f,visibility,goto,idle,last,root}=await setup(st);await goto();await idle();
    const held=f.holdRequest(p=>p.endsWith('/connect'));st.after(held.release);
    await root.getByLabel('Account system token',{exact:true}).fill('synthetic-account-token');await click(page,root.getByRole('button',{name:'Connect account',exact:true}));await held.entered;
    await visibility(true);await page.evaluate(()=>new Promise(r=>setTimeout(r,0)));
    const observed={request:await last(),busy:await root.getAttribute('aria-busy'),status:await root.locator('.tuzi-status').textContent(),notice:await root.locator('#tuziNotice').textContent()};
    console.log('visibility connect',JSON.stringify(observed));
    assert.equal(observed.request.aborted,false,'hiding must not abort an explicit account connection');assert.equal(observed.request.settled,false,'the response is still held');assert.equal(observed.busy,'true');
    held.release();await idle();assert.equal(await root.locator('.tuzi-status').textContent(),'Connected');await visibility(false);await root.locator('.tuzi-metrics').waitFor();
    assert.equal(f.calls.filter(([p])=>p.endsWith('/connect')).length,1,'visibility never retries a connection');
  });
  await t.test('initial state remains gated while hidden and finishes once',async(st)=>{
    const {page,f,visibility,goto,idle,last,root}=await setup(st,true);const held=f.holdRequest(p=>p.endsWith('/state'));st.after(held.release);
    await goto();await held.entered;await visibility(true);
    assert.equal((await last()).aborted,false,'initial state belongs to the busy opening');assert.equal(await root.getAttribute('aria-busy'),'true');
    await visibility(false);assert.equal((await last()).aborted,false,'returning during initialization does not start a competing read');
    held.release();await idle();assert.equal(await root.locator('.tuzi-status').textContent(),'Connected');await visibility(false);await root.locator('.tuzi-metrics').waitFor();
    assert.equal(f.calls.filter(([p])=>p.endsWith('/state')).length,1);
  });
  await t.test('key write completes while hidden without a replay',async(st)=>{
    const {page,f,visibility,goto,idle,last,root}=await setup(st,true);await goto();await idle();await root.locator('.tuzi-metrics').waitFor();
    await click(page,root.getByRole('button',{name:'Edit',exact:true}));await root.getByLabel('Name',{exact:true}).fill('Visibility saved key');
    const held=f.holdRequest((p,b)=>p.endsWith('/request')&&b.method==='PATCH');st.after(held.release);await click(page,root.getByRole('button',{name:'Save',exact:true}));await held.entered;
    await visibility(true);assert.equal((await last()).aborted,false,'hiding must not abort an explicit Key write');assert.equal(await root.getAttribute('aria-busy'),'true');
    held.release();await idle();await visibility(false);await root.getByText('Visibility saved key',{exact:true}).waitFor();
    assert.equal(f.calls.filter(([,b])=>b?.method==='PATCH').length,1,'a hidden write is never submitted twice');assert.equal(await root.locator('#tuziRecover').count(),0);
  });
  await t.test('idle reads cancel, visibility resumes, and hidden polling stops',async(st)=>{
    const {page,f,visibility,goto,idle,last,root}=await setup(st,true);await goto();await idle();await root.locator('.tuzi-metrics').waitFor();
    const held=f.holdRequest((p,b)=>p.endsWith('/request')&&b.path==='/account/account');st.after(held.release);await click(page,root.getByRole('button',{name:'Refresh',exact:true}));await held.entered;
    await visibility(true);assert.equal((await last()).aborted,true,'idle data reads still cancel when hidden');held.release();await visibility(false);await root.locator('.tuzi-metrics').waitFor();await idle();
    assert.equal(f.calls.filter(([,b])=>b?.path==='/account/account').length,3,'returning starts one fresh read after the canceled one');
    await click(page,root.getByRole('tab',{name:'Tuzi model status',exact:true}));await root.getByText('99.12%',{exact:true}).waitFor();await page.waitForFunction(()=>window.performanceTimers.size===1);
    await visibility(true);assert.equal(await page.evaluate(()=>window.performanceTimers.size),0,'hiding clears the minute refresh timer');await visibility(false);await page.waitForFunction(()=>window.performanceTimers.size===1);
    const checking=f.holdRequest(p=>p.endsWith('/check'));st.after(checking.release);await click(page,root.getByRole('button',{name:'Check connection',exact:true}));await checking.entered;
    await visibility(true);assert.equal((await last()).aborted,false,'a busy connection check survives hiding');assert.equal(await page.evaluate(()=>window.performanceTimers.size),0,'busy operations still stop background refresh timers');
    checking.release();await idle();assert.equal(await page.evaluate(()=>window.performanceTimers.size),0,'finishing hidden does not schedule background polling');await visibility(false);await page.waitForFunction(()=>window.performanceTimers.size===1);
    await click(page,root.getByRole('tab',{name:'API keys',exact:true}));await root.locator('.tuzi-metrics').waitFor();await click(page,root.getByRole('button',{name:'Key details',exact:true}));await click(page,root.getByRole('button',{name:'Reveal key',exact:true}));await root.getByText('sk-synthetic-revealed',{exact:true}).waitFor();
    await page.evaluate(()=>magpie.call('tuzi','leave'));assert.equal(await root.getByText('sk-synthetic-revealed',{exact:true}).count(),0,'a true page leave still erases revealed credentials');
  });
  await t.test('a true leave cancels connect and clears the entered token',async(st)=>{
    const {page,f,goto,idle,last,root}=await setup(st);await goto();await idle();const held=f.holdRequest(p=>p.endsWith('/connect'));st.after(held.release);
    await root.getByLabel('Account system token',{exact:true}).fill('synthetic-account-token');await click(page,root.getByRole('button',{name:'Connect account',exact:true}));await held.entered;
    await page.evaluate(()=>magpie.call('tuzi','leave'));assert.equal((await last()).aborted,true);assert.equal(await root.getByLabel('Account system token',{exact:true}).inputValue(),'');held.release();
  });
});
