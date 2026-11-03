#!/usr/bin/env python3
"""Run required Go checks serially with isolated homes and durable stage logs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--stage', action='append', help='Run only selected stage(s)')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
source_diff = subprocess.check_output(['git', 'diff', 'HEAD', '--binary'], cwd=root)
(output / 'source-diff.patch').write_bytes(source_diff)
(output / 'source.json').write_text(json.dumps({
    'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
    'status': subprocess.check_output(['git', 'status', '--short'], cwd=root).decode(),
    'diff_sha256': hashlib.sha256(source_diff).hexdigest(),
    'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}, indent=2) + '\n')
toolbin = '/Users/syd08/.local/toolchains/go1.25.12/bin'
base = {'PATH': toolbin + ':' + os.environ.get('PATH', '/usr/bin:/bin'),
        'GOPATH': '/Users/syd08/go', 'GOMODCACHE': '/Users/syd08/go/pkg/mod',
        'GOCACHE': '/Users/syd08/Library/Caches/go-build', 'GOMAXPROCS': '4',
        'GOPROXY': 'https://goproxy.cn,https://proxy.golang.org,direct'}
stages = [
 ('vet-macos', ['go','vet','./...'], {}),
 ('vet-linux', ['go','vet','-tags','nogui','./...'], {'GOOS':'linux','CGO_ENABLED':'0'}),
 ('vet-windows', ['go','vet','./...'], {'GOOS':'windows','CGO_ENABLED':'0'}),
 ('build-macos', ['go','build','-o',str(output/'tuzi-magpie-check'),'.'], {}),
 ('build-linux', ['go','build','-tags','nogui','-o',str(output/'tuzi-magpie-linux-check'),'.'], {'GOOS':'linux','CGO_ENABLED':'0'}),
 ('build-windows', ['go','build','-o',str(output/'tuzi-magpie-windows-check.exe'),'.'], {'GOOS':'windows','CGO_ENABLED':'0'}),
 ('test-all', ['go','test','-tags','nogui','-count=1','-p','2','./...'], {}),
 ('race-tuzi', ['go','test','-race','-tags','nogui tuzi_fixture','-count=1','-p','2','-run','Tuzi|DesktopAccountFixture|NoProxyDoesNotFallBack|NoProxyPreservesHTTPEnvironmentMatching','./internal/tuziaccount','./internal/gateway','./internal/provider','./internal/gui','./internal/agent','./internal/tuzifixture','./internal/cli','./internal/netproxy'], {}),
]
results=[]
for name, command, extra in stages:
    if args.stage and name not in args.stage:
        continue
    print('START '+name, flush=True)
    started=time.monotonic()
    with tempfile.TemporaryDirectory(prefix='tmg-', dir='/tmp') as home:
        env={**base, **extra, 'HOME':home, 'USERPROFILE':home, 'CFFIXED_USER_HOME':home,
             'XDG_CONFIG_HOME':home+'/.config', 'XDG_CACHE_HOME':home+'/.cache',
             'XDG_DATA_HOME':home+'/.local/share', 'XDG_STATE_HOME':home+'/.local/state', 'TMPDIR':home}
        with (output/(name+'.log')).open('w') as log:
            process=subprocess.run(command,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
        result={'stage':name,'exitCode':process.returncode,'seconds':round(time.monotonic()-started,2),'command':command}
        results.append(result)
        (output/'results.json').write_text(json.dumps(results,indent=2))
        print(json.dumps(result),flush=True)
print('DONE', flush=True)
raise SystemExit(1 if any(r['exitCode'] for r in results) else 0)
