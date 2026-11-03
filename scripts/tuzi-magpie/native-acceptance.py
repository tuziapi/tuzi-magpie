#!/usr/bin/env python3
"""Launch the actual fixture-tagged macOS app with isolated data and network."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--app", required=True, type=Path)
parser.add_argument("--fixture", required=True, type=Path)
parser.add_argument("--output", required=True, type=Path)
parser.add_argument("--keep-open", action="store_true")
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
for p in (args.app, args.fixture, args.output):
    if not p.is_absolute():
        parser.error("All paths must be absolute")
args.output.mkdir(parents=True, exist_ok=True)
if (args.output / "processes.json").exists():
    parser.error("Use a new output directory; never replace another run's state")
home = args.output / "home"
home.mkdir(mode=0o700)
config = home / "config" / "tuzi-magpie"
config.mkdir(parents=True)
(config / "settings.json").write_text(json.dumps({"lang":"en", "theme":"light", "port":18343}))
result_path = args.output / "result.json"
real_home = Path.home()
profile = '(version 1) (allow default) (deny network*) (allow network* (local ip "localhost:*") (remote ip "localhost:*")) '
profile += '(deny file-read-data file-write* (subpath ' + json.dumps(str(real_home)) + ')) '
profile += '(deny mach-lookup (global-name "com.apple.securityd") (global-name "com.apple.securityd.xpc")) '
for allowed in (repo, args.output, args.app.parent, args.fixture.parent):
    profile += '(allow file-read-data file-write* (subpath ' + json.dumps(str(allowed)) + ')) '
(args.output / "sandbox.sb").write_text(profile)
env = {"HOME":str(home), "USERPROFILE":str(home), "CFFIXED_USER_HOME":str(home),
       "XDG_CONFIG_HOME":str(home/"config"), "XDG_CACHE_HOME":str(home/"cache"),
       "XDG_DATA_HOME":str(home/"data"), "XDG_STATE_HOME":str(home/"state"),
       "PATH":"/usr/bin:/bin:/usr/sbin:/sbin", "TMPDIR":str(home),
       "MAGPIE_ADDR":"127.0.0.1:18343", "MAGPIE_NO_INSTALL":"1",
       "TUZI_MAGPIE_FIXTURE_ORIGIN":"http://127.0.0.1:18341",
       "TUZI_MAGPIE_FIXTURE_REPORT":str(result_path),
       "TUZI_MAGPIE_FIXTURE_SCRIPT":str(repo/"scripts/tuzi-magpie/native-workspace.js")}
processes = []
logs = []
try:
    for name, command in (("fixture", [str(args.fixture), "-report", str(result_path)]),
                          ("app", ["/usr/bin/sandbox-exec", "-f", str(args.output/"sandbox.sb"), str(args.app), "app"])):
        log = (args.output/(name+".log")).open("w")
        logs.append(log)
        p = subprocess.Popen(command, cwd=repo, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        processes.append((name,p))
        if name == "fixture":
            time.sleep(0.3)
            if p.poll() is not None:
                raise RuntimeError("Fixture could not bind its reserved port")
    (args.output/"processes.json").write_text(json.dumps({name:p.pid for name,p in processes}))
    deadline = time.monotonic()+120
    while time.monotonic() < deadline and not result_path.exists():
        for name,p in processes:
            if p.poll() is not None:
                raise RuntimeError(name+" exited before native acceptance reported")
        time.sleep(0.5)
    if not result_path.exists():
        raise RuntimeError("Native acceptance timed out; inspect app.log")
    result = json.loads(result_path.read_text())
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    if not result.get("passed"):
        raise RuntimeError("Native acceptance failed")
finally:
    if not args.keep_open:
        for _,p in reversed(processes):
            if p.poll() is None:
                os.killpg(p.pid, signal.SIGTERM)
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(p.pid, signal.SIGKILL)
                    p.wait()
    for log in logs:
        log.close()
