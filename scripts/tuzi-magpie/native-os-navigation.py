#!/usr/bin/env python3
"""Verify cold/warm LaunchServices navigation using a private sandboxed app copy."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shlex
import shutil
import signal
import subprocess
import sys
import time
import urllib.request

LSREGISTER = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'
LINK = 'tuzimagpie://account/connect'
OBSERVER = r'''(async () => {
 if(window.__tuziOSNavigation) return; window.__tuziOSNavigation=true;
 const checks=[], errors=[];
 const wait=async(fn,label)=>{const end=Date.now()+45000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,100));}throw new Error(label);};
 const report=async(stage)=>{const r=await fetch('/__tuzi-fixture/report',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({stage,passed:stage==='complete'&&!errors.length,checks,errors,nativeOrigin:location.origin,at:new Date().toISOString()})});if(!r.ok)throw new Error('report write failed');};
 const verify=async()=>{
  await wait(()=>typeof view!=='undefined'&&view==='tuzi'&&!document.querySelector('#view-tuzi')?.hidden&&document.querySelector('#view-tuzi')?.getAttribute('aria-busy')==='false','OS link did not open the ready Tuzi page');
  const token=document.querySelector('#tuziSystemToken'),status=document.querySelector('#tuziConnection .tuzi-status');
  if(!token||token.value!==''||status?.dataset.state!=='disconnected')throw new Error('navigation read credentials or connected an account');
  if(location.origin!=='wails://localhost')throw new Error('not the actual native webview');
 };
 try {
  await wait(()=>typeof show==='function'&&window.magpie?.page('tuzi')&&document.querySelector('#tuziTabs button'),'native page mount');
  // No show(tuzi): the first arrival must come from the OS-delivered URL.
  await verify();checks.push('cold LaunchServices URL opens native Tuzi with empty disconnected account');
  await show('providers');await wait(()=>view==='providers'&&!document.querySelector('#view-providers').hidden,'prepare warm navigation');
  await report('warm-ready');
  // The runner issues a second open -a wrapper.app URL after warm-ready.
  await verify();checks.push('warm LaunchServices URL returns from Providers to Tuzi in the same native process');
 } catch(e){errors.push(String(e.message||e));}
 await report(errors.length?'failed':'complete');
})();'''


def atomic_json(path, value):
    tmp=path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2))
    tmp.replace(path)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app',required=True,type=Path,help='Source fixture .app, never modified')
    parser.add_argument('--fixture',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path,help='New task evidence directory; use /private/tmp to avoid Documents TCC for LaunchServices')
    parser.add_argument('--keep-open',action='store_true',help='Keep only a successful owned instance for inspection; report its exact PIDs')
    args=parser.parse_args()
    for path in (args.app,args.fixture,args.output):
        if not path.is_absolute():parser.error('Use absolute paths')
    app=args.app.resolve();fixture=args.fixture.resolve();out=args.output.resolve()
    real_home=Path.home().resolve()
    info=plistlib.loads((app/'Contents/Info.plist').read_bytes())
    if info.get('CFBundleIdentifier')!='com.tuzi.magpie':parser.error('Only the tuzi distribution bundle is permitted')
    schemes=[s for entry in info.get('CFBundleURLTypes',[]) for s in entry.get('CFBundleURLSchemes',[])]
    if schemes!=['tuzimagpie']:parser.error('Unexpected app protocol registration')
    if out.exists() or out==real_home or out in real_home.parents:parser.error('Use a new task-specific evidence directory')
    out.mkdir(parents=True,mode=0o700)
    home=out/'home';home.mkdir(mode=0o700)
    config=home/'config/tuzi-magpie';config.mkdir(parents=True)
    (config/'settings.json').write_text(json.dumps({'lang':'en','theme':'light','port':18443}))
    (home/'.tuzi-native-acceptance-home').write_text('synthetic-tuzi-native-acceptance\n')
    wrapper=out/'tuzi-magpie-os-acceptance.app'
    shutil.copytree(app,wrapper,symlinks=True)
    original=wrapper/'Contents/MacOS'/info['CFBundleExecutable']
    if not original.is_file() or not original.resolve().is_relative_to(wrapper):parser.error('Source executable must be an ordinary file in the copied bundle')
    original_hash=hashlib.sha256(original.read_bytes()).hexdigest()
    launcher=wrapper/'Contents/MacOS/tuzi-isolated-launcher'
    info['CFBundleExecutable']=launcher.name
    info['CFBundleDisplayName']='tuzi-magpie isolated OS acceptance'
    (wrapper/'Contents/Info.plist').write_bytes(plistlib.dumps(info))
    script=out/'observer.js';script.write_text(OBSERVER)
    ui_report=out/'ui-result.json';pidfile=out/'app-pids.txt';profile=out/'sandbox.sb'
    sandbox='(version 1) (allow default) (deny network*) (allow network* (local ip "localhost:*") (remote ip "localhost:*")) '
    sandbox+='(deny file-read-data file-write* (subpath '+json.dumps(str(real_home))+')) '
    sandbox+='(deny mach-lookup (global-name "com.apple.securityd") (global-name "com.apple.securityd.xpc")) '
    for allowed in (out,fixture.parent):
        sandbox+='(allow file-read-data file-write* (subpath '+json.dumps(str(allowed))+')) '
    profile.write_text(sandbox)
    env={'HOME':str(home),'USERPROFILE':str(home),'CFFIXED_USER_HOME':str(home),'XDG_CONFIG_HOME':str(home/'config'),'XDG_CACHE_HOME':str(home/'cache'),'XDG_DATA_HOME':str(home/'data'),'XDG_STATE_HOME':str(home/'state'),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','TMPDIR':str(home),'MAGPIE_ADDR':'127.0.0.1:18443','MAGPIE_NO_INSTALL':'1','TUZI_MAGPIE_FIXTURE_ORIGIN':'http://127.0.0.1:18441','TUZI_MAGPIE_FIXTURE_REPORT':str(ui_report),'TUZI_MAGPIE_FIXTURE_SCRIPT':str(script)}
    command=['/usr/bin/env','-i',*[k+'='+v for k,v in env.items()],'/usr/bin/sandbox-exec','-f',str(profile),str(original),'app']
    launcher.write_text('#!/bin/sh\nset -eu\nprintf \'%s\\n\' "$$" >> '+shlex.quote(str(pidfile))+'\nexec '+shlex.join(command)+' >> '+shlex.quote(str(out/'app.log'))+' 2>&1\n')
    launcher.chmod(0o700)
    result={'passed':False,'gatewayVerified':False,'checks':[],'errors':[],'sourceApp':str(app),'sourceExecutableSHA256':original_hash,'wrapper':str(wrapper),'url':LINK,'ports':[18441,18443]}
    fixture_process=None;registered=False;stage='sign-copy';pids=set()
    log=(out/'fixture.log').open('w')
    commands=[]
    def run(command):
        p=subprocess.run(command,capture_output=True,text=True)
        commands.append({'argv':command,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
        if p.returncode:raise RuntimeError('command failed: '+shlex.join(command)+': '+p.stderr)
    def app_pids():
        if pidfile.exists():
            pids.update(int(n) for n in pidfile.read_text().splitlines() if n.isdigit())
        return sorted(pids)
    def alive_owned(pid):
        p=subprocess.run(['/bin/ps','-p',str(pid),'-o','command='],capture_output=True,text=True)
        return p.returncode==0 and str(original) in p.stdout
    def wait_for(stage_name,timeout=65):
        started=time.monotonic();end=started+timeout
        while time.monotonic()<end:
            ids=app_pids()
            if ids and time.monotonic()-started>3 and not any(alive_owned(p) for p in ids):raise RuntimeError('owned app exited; inspect app.log')
            if fixture_process.poll() is not None:raise RuntimeError('synthetic fixture exited')
            if ui_report.exists():
                try:report=json.loads(ui_report.read_text())
                except json.JSONDecodeError:report={}
                if report.get('errors'):raise RuntimeError('native observer: '+str(report['errors']))
                if report.get('stage')==stage_name:return report
            time.sleep(.2)
        raise RuntimeError('timed out waiting for '+stage_name)
    try:
        run(['/usr/bin/codesign','--force','--deep','--sign','-',str(wrapper)])
        stage='fixture'
        fixture_process=subprocess.Popen(['/usr/bin/sandbox-exec','-f',str(profile),str(fixture),'-addr','127.0.0.1:18441'],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,cwd=out)
        time.sleep(.3)
        if fixture_process.poll() is not None:raise RuntimeError('fixture port unavailable')
        stage='register-copy'
        run([LSREGISTER,'-f',str(wrapper)]);registered=True
        stage='cold-url'
        run(['/usr/bin/open','-n','-a',str(wrapper),LINK])
        cold=wait_for('warm-ready')
        ids=app_pids()
        if len(ids)!=1 or not alive_owned(ids[0]):raise RuntimeError('cold launch did not produce exactly one owned app PID')
        result['appPID']=ids[0];result['checks']=cold['checks']
        atomic_json(out/'cold-result.json',cold)
        stage='warm-url'
        run(['/usr/bin/open','-a',str(wrapper),LINK])
        warm=wait_for('complete')
        if app_pids()!=ids or not alive_owned(ids[0]):raise RuntimeError('warm navigation did not use the same owned app PID')
        if warm.get('passed') is not True or warm.get('nativeOrigin')!='wails://localhost':raise RuntimeError('native observer did not pass')
        if (config/'account-private/account.json').exists():raise RuntimeError('navigation unexpectedly persisted an account')
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open('http://127.0.0.1:18441/__snapshot',timeout=5) as response:snapshot=json.load(response)
        if snapshot.get('modelCalls')!=0 or snapshot.get('paths'):raise RuntimeError('navigation unexpectedly called account/model service')
        atomic_json(out/'fixture-snapshot.json',snapshot)
        result.update(passed=True,checks=warm['checks'],nativeOrigin=warm['nativeOrigin'])
        result['checks'].append('same owned PID; no account persisted; no account/model service calls')
    except Exception as error:
        result['errors'].append({'stage':stage,'message':str(error)})
    finally:
        for pid in app_pids():
            if alive_owned(pid) and not (args.keep_open and result["passed"]):
                os.kill(pid,signal.SIGTERM)
                end=time.monotonic()+5
                while alive_owned(pid) and time.monotonic()<end:time.sleep(.1)
                if alive_owned(pid):os.kill(pid,signal.SIGKILL)
        if fixture_process is not None and fixture_process.poll() is None and not (args.keep_open and result["passed"]):
            os.killpg(fixture_process.pid,signal.SIGTERM)
            try:fixture_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(fixture_process.pid,signal.SIGKILL);fixture_process.wait()
        try:
            if registered:run([LSREGISTER,'-u',str(wrapper)])
            run([LSREGISTER,'-f',str(app)])
            result['registrationRestored']=True
            result['keptOpen']=bool(args.keep_open and result['passed'])
        except Exception as error:
            result['passed']=False;result['errors'].append({'stage':'registration-restore','message':str(error)})
        log.close()
        atomic_json(out/'commands.json',commands)
        atomic_json(out/'processes.json',{'appPIDs':sorted(pids),'fixturePID':fixture_process.pid if fixture_process else None,'cleaned':not any(alive_owned(p) for p in pids)})
        atomic_json(out/'result.json',result)
        print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)
    return 0 if result['passed'] else 1


if __name__=='__main__':sys.exit(main())
