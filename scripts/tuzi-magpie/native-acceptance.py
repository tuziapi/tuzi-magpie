#!/usr/bin/env python3
"""Launch the actual fixture-tagged macOS app with isolated data and network."""
import argparse
import json
import os
from pathlib import Path
import signal
import sys
import subprocess
import time
import urllib.request

from native_isolation import require_free_ports, require_listener, sandboxed

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--app", required=True, type=Path)
parser.add_argument("--fixture", required=True, type=Path)
parser.add_argument("--output", required=True, type=Path)
parser.add_argument("--keep-open", action="store_true")
parser.add_argument("--account-link", action="store_true", help="Start through the fixed native account link argument")
parser.add_argument("--skip-gateway", action="store_true", help="Navigation-only acceptance; does not claim gateway verification")
parser.add_argument("--home", type=Path, help="Reuse this task's isolated home for restart acceptance")
parser.add_argument("--script", type=Path, help="Native DOM acceptance script")
parser.add_argument("--bootstrap-delay", help="Test-only synthetic bootstrap delay, e.g. 500ms")
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
for p in (args.app, args.fixture, args.output):
    if not p.is_absolute():
        parser.error("All paths must be absolute")
args.app = args.app.resolve()
args.fixture = args.fixture.resolve()
args.output = args.output.resolve()
if args.script:
    args.script = args.script.resolve()
require_free_ports((18341, 18343))
args.output.mkdir(parents=True, exist_ok=True)
if (args.output / "processes.json").exists():
    parser.error("Use a new output directory; never replace another run's state")
home = (args.home or args.output / "home").resolve()
real_home = Path.home().resolve()
marker = home / ".tuzi-native-acceptance-home"
if home == real_home or home in real_home.parents or not home.is_relative_to(args.output.parent):
    parser.error("Reuse only an isolated home under the evidence directory")
if args.home and (not marker.is_file() or marker.read_text() != "synthetic-tuzi-native-acceptance\n"):
    parser.error("Reused home has no native-acceptance ownership marker")
home.mkdir(mode=0o700, exist_ok=args.home is not None)
if not args.home:
    marker.write_text("synthetic-tuzi-native-acceptance\n")
config = home / "config" / "tuzi-magpie"
config.mkdir(parents=True, exist_ok=True)
if not args.home:
    (config / "settings.json").write_text(json.dumps({"lang":"en", "theme":"light", "port":18343}))
result_path = args.output / "result.json"
ui_result_path = args.output / "ui-result.json"
profile = '(version 1) (allow default) (deny network*) (allow network* (local ip "localhost:*") (remote ip "localhost:*")) '
profile += '(deny file-read-data file-write* (subpath ' + json.dumps(str(real_home)) + ')) '
profile += '(deny mach-lookup (global-name "com.apple.securityd") (global-name "com.apple.securityd.xpc")) '
for allowed in (repo, args.output, home, args.app.parent, args.fixture.parent):
    profile += '(allow file-read-data file-write* (subpath ' + json.dumps(str(allowed)) + ')) '
(args.output / "sandbox.sb").write_text(profile)
env = {"HOME":str(home), "USERPROFILE":str(home), "CFFIXED_USER_HOME":str(home),
       "XDG_CONFIG_HOME":str(home/"config"), "XDG_CACHE_HOME":str(home/"cache"),
       "XDG_DATA_HOME":str(home/"data"), "XDG_STATE_HOME":str(home/"state"),
       "PATH":"/usr/bin:/bin:/usr/sbin:/sbin", "TMPDIR":str(home),
       "MAGPIE_ADDR":"127.0.0.1:18343", "MAGPIE_NO_INSTALL":"1",
       "TUZI_MAGPIE_FIXTURE_ORIGIN":"http://127.0.0.1:18341",
       "TUZI_MAGPIE_FIXTURE_REPORT":str(ui_result_path),
       "TUZI_MAGPIE_FIXTURE_SCRIPT":str(args.script or repo/"scripts/tuzi-magpie/tests/native-workspace.js")}
processes = []
logs = []
result = {"passed": False, "checks": [], "errors": []}
stage = "launch"
try:
    fixture_command = sandboxed(args.output/"sandbox.sb", args.fixture, "-report", str(ui_result_path))
    if args.bootstrap_delay:
        fixture_command.extend(("-bootstrap-delay", args.bootstrap_delay))
    for name, command in (("fixture", fixture_command),
                          ("app", sandboxed(args.output/"sandbox.sb", args.app, "tuzimagpie://account/connect" if args.account_link else "app"))):
        log = (args.output/(name+".log")).open("w")
        logs.append(log)
        p = subprocess.Popen(command, cwd=repo, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        processes.append((name,p))
        if name == "fixture":
            time.sleep(0.3)
            if p.poll() is not None:
                raise RuntimeError("Fixture could not bind its reserved port")
    (args.output/"processes.json").write_text(json.dumps({name:p.pid for name,p in processes}))
    stage = "native-ui"
    deadline = time.monotonic()+120
    while time.monotonic() < deadline and not ui_result_path.exists():
        for name,p in processes:
            if p.poll() is not None:
                raise RuntimeError(name+" exited before native acceptance reported")
        time.sleep(0.5)
    if not ui_result_path.exists():
        raise RuntimeError("Native acceptance timed out; inspect app.log")
    result = json.loads(ui_result_path.read_text())
    ui_passed = result.get("passed") is True
    result["passed"] = False
    result["gatewayVerified"] = False
    if ui_passed and args.skip_gateway:
        result["passed"] = True
    elif ui_passed:
        stage = "gateway"
        # Agent requests originate outside the webview; use the Provider ID
        # actually saved by the native page, through the actual HTTP gateway.
        app_process = next(p for name, p in processes if name == "app")
        if app_process.poll() is not None:
            raise RuntimeError("The launched app exited before gateway acceptance")
        listener = require_listener(app_process.pid, 18343)
        (args.output/"gateway-listener.txt").write_text(listener)
        result["gatewayPID"] = app_process.pid
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        body = json.dumps({"model": result["providerId"] + "/gpt-5.5", "input": "Synthetic acceptance", "stream": False}).encode()
        request = urllib.request.Request("http://127.0.0.1:18343/v1/responses", data=body, headers={"Content-Type":"application/json"})
        with opener.open(request, timeout=30) as response:
            output = response.read().decode()
        if "TUZI_CLI_OK" not in output:
            raise RuntimeError("Actual gateway did not return synthetic completion")
        with opener.open("http://127.0.0.1:18341/__snapshot", timeout=5) as response:
            snapshot = json.load(response)
        if snapshot["modelCalls"] < 1:
            raise RuntimeError("Gateway did not reach synthetic model service")
        (args.output/"fixture-snapshot.json").write_text(json.dumps(snapshot, indent=2))
        (args.output/"gateway-response.json").write_text(output)
        result["checks"].append("desktop-saved Provider to real gateway to synthetic model")
        result["gatewayVerified"] = True
        result["passed"] = True
    if not result.get("passed"):
        raise RuntimeError("Native UI acceptance failed")
except Exception as error:
    result["passed"] = False
    result.setdefault("errors", []).append({"stage": stage, "message": str(error)})
finally:
    temporary = result_path.with_suffix(".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    temporary.replace(result_path)
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
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

if not result.get("passed"):
    sys.exit(1)
