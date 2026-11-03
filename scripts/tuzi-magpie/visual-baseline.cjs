// Reproducible original-page screenshots; synthetic HTTP only, never live config.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const assets = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const engine = process.env.BROWSER || 'chromium';
const views = ['agents','providers','routing','library','usage','sessions','plugins','settings'];
const fixture = {
  providers: [{id:'synthetic',name:'Synthetic provider',icon:'generic',chat:'http://127.0.0.1:18342/v1',key:{set:true,masked:'sk-…fixture'},host:'127.0.0.1:18342',models:[{id:'synthetic-model',name:'Synthetic model',on:true}],agents:[]}],
  presets: [], excluded: [], discovered: [], gateway:{running:false,window:true,mine:true,url:'http://127.0.0.1:18343',calls:[],groups:[]},
};
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await (engine==='webkit' ? webkit.launch() : chromium.launch(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}));
 const results=[];
 try {
 for(const lang of ['en','zh']) for(const theme of ['light','dark']) for(const width of [1100,440]) {
  const context=await browser.newContext({viewport:{width,height:800},reducedMotion:'reduce',locale:lang==='zh'?'zh-CN':'en-US',timezoneId:'Asia/Shanghai'});
  const page=await context.newPage();page.setDefaultNavigationTimeout(60000);page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());const json=data=>route.fulfill({json:data});
   if(u.host!=='magpie.test')return route.fulfill({status:403,body:'Only synthetic fixtures are allowed'});
   if(u.pathname==='/boot.js')return route.fulfill({contentType:'text/javascript',body:`window.bootPrefs=${JSON.stringify({lang,theme,web:false,pluginConfig:{},featuresOff:[]})};`});
   if(u.pathname==='/wails/runtime.js')return route.fulfill({contentType:'text/javascript',body:'export const Window={};'});
   if(u.pathname==='/api/state')return json({agents:[],profiles:[],settings:{lang,theme},version:'synthetic'});
   if(u.pathname==='/api/providers')return json(fixture);
   if(u.pathname==='/api/groups')return json({groups:[]});
   if(u.pathname==='/api/plugins')return json({installed:[],available:[]});
   if(u.pathname==='/api/builtins')return json({plugins:[]});
   if(u.pathname==='/api/sessions')return json({sessions:[],total:0});
   if(u.pathname==='/api/caller-keys')return json({keys:[]});
   if(u.pathname.startsWith('/api/'))return json({});
   const file=path.join(assets,u.pathname==='/'?'index.html':u.pathname);
   try {return route.fulfill({body:await fs.readFile(file),contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]});}
   catch{return route.fulfill({status:404,body:''});}
  });
  for(const view of views){
   await page.goto(`http://magpie.test/?view=${view}`);
   await page.locator(`#view-${view}`).waitFor({state:'visible'});
   await page.evaluate(()=>document.fonts.ready);
   // Settles intentional initial loading transitions; capture comparison uses the same wait.
   await page.waitForTimeout(350);
   const name=`${engine}-${lang}-${theme}-${width}-${view}`;
   await page.screenshot({path:path.join(output,name+'.png')});
   results.push({name,errors:[...errors],title:await page.title(),view,lang,theme,width});
   errors.length=0;
  }
  await context.close();
 }
 } finally {await browser.close();await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({assets,fixture,results},null,2));}
 console.log(`Captured ${results.length} original-page conditions`);
 assert.equal(results.filter(r=>r.errors.length).length,0,JSON.stringify(results.filter(r=>r.errors.length)));
})().catch(e=>{console.error(e);process.exitCode=1});
