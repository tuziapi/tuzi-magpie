#!/usr/bin/env python3
"""Launch a non-fixture macOS build through LaunchServices in a private sandbox."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shlex
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

LSREGISTER = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'
PORT = 18543


def atomic_json(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2))
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path,
                        help='New directory under /private/tmp; Documents TCC blocks LS-launched helpers')
    parser.add_argument('--keep-open', action='store_true')
    parser.add_argument('--port', type=int, default=PORT,
                        help='Unused loopback port for this isolated acceptance instance')
    args = parser.parse_args()
    port = args.port
    if not 1024 <= port <= 65535:
        parser.error('Use an unprivileged loopback port from 1024 to 65535')
    if not args.app.is_absolute() or not args.output.is_absolute():
        parser.error('Use absolute app and output paths')
    app, out = args.app.resolve(), args.output.resolve()
    if not out.is_relative_to(Path('/private/tmp')) or out.exists():
        parser.error('Use a new task directory under /private/tmp')
    info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    schemes = [s for row in info.get('CFBundleURLTypes', []) for s in row.get('CFBundleURLSchemes', [])]
    if info.get('CFBundleIdentifier') != 'com.tuzi.magpie' or schemes != ['tuzimagpie']:
        parser.error('Only the tuzi distribution identity is permitted')
    executable = app / 'Contents/MacOS' / info['CFBundleExecutable']
    build = subprocess.check_output(['go', 'version', '-m', str(executable)], text=True)
    tags = next((row.split('=', 1)[1].split(',') for row in build.splitlines() if '\t-tags=' in row), [])
    if 'production' not in tags or 'tuzi_fixture' in tags or 'nogui' in tags:
        parser.error('Requires a production GUI binary without fixture hooks')
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', port))
    out.mkdir(parents=True, mode=0o700)
    (out / 'build-info.txt').write_text(build)
    original_hash = hashlib.sha256(executable.read_bytes()).hexdigest()
    home = out / 'home'
    home.mkdir(mode=0o700)
    config = home / 'config/tuzi-magpie'
    config.mkdir(parents=True)
    # This is a new install, not a legacy settings file whose absent Dock
    # choice meant Hide. Leave language unset to exercise the product default.
    (config / 'settings.json').write_text(json.dumps({'theme': 'light', 'port': port, 'dockSettled': True}))
    wrapper = out / 'tuzi-magpie-production-acceptance.app'
    shutil.copytree(app, wrapper, symlinks=True)
    copied = wrapper / 'Contents/MacOS' / info['CFBundleExecutable']
    if not copied.is_file() or not copied.resolve().is_relative_to(wrapper):
        parser.error('Executable must remain within the copied bundle')
    launcher = wrapper / 'Contents/MacOS/tuzi-isolated-launcher'
    info['CFBundleExecutable'] = launcher.name
    info['CFBundleDisplayName'] = 'tuzi-magpie isolated production acceptance'
    (wrapper / 'Contents/Info.plist').write_bytes(plistlib.dumps(info))
    real_home = Path.home().resolve()
    profile = out / 'sandbox.sb'
    profile.write_text('(version 1) (allow default) (deny network*) '
                       '(allow network* (local ip "localhost:*") (remote ip "localhost:*")) '
                       '(deny file-read-data file-write* (subpath ' + json.dumps(str(real_home)) + ')) '
                       '(deny mach-lookup (global-name "com.apple.securityd") (global-name "com.apple.securityd.xpc")) '
                       '(allow file-read-data file-write* (subpath ' + json.dumps(str(out)) + ')) ')
    env = {'HOME': str(home), 'USERPROFILE': str(home), 'CFFIXED_USER_HOME': str(home),
           'XDG_CONFIG_HOME': str(home / 'config'), 'XDG_CACHE_HOME': str(home / 'cache'),
           'XDG_DATA_HOME': str(home / 'data'), 'XDG_STATE_HOME': str(home / 'state'),
           'PATH': '/usr/bin:/bin:/usr/sbin:/sbin', 'TMPDIR': str(home),
           'MAGPIE_ADDR': '127.0.0.1:' + str(port), 'MAGPIE_NO_INSTALL': '1'}
    pidfile = out / 'app-pids.txt'
    command = ['/usr/bin/env', '-i', *[key + '=' + value for key, value in env.items()],
               '/usr/bin/sandbox-exec', '-f', str(profile), str(copied), 'app']
    launcher.write_text('#!/bin/sh\nset -eu\nprintf \'%s\\n\' "$$" >> ' + shlex.quote(str(pidfile)) +
                        '\nexec ' + shlex.join(command) + ' >> ' + shlex.quote(str(out / 'app.log')) + ' 2>&1\n')
    launcher.chmod(0o700)
    result = {'passed': False, 'uiVisuallyVerified': False, 'paidInference': False,
              'checks': [], 'errors': [], 'sourceApp': str(app), 'wrapper': str(wrapper),
              'sourceExecutableSHA256': original_hash, 'port': port, 'buildTags': tags}
    commands, pids = [], set()
    registered = False
    stage = 'sign-copy'

    def run(command):
        process = subprocess.run(command, capture_output=True, text=True)
        commands.append({'argv': command, 'exit': process.returncode,
                         'stdout': process.stdout, 'stderr': process.stderr})
        if process.returncode:
            raise RuntimeError('command failed: ' + shlex.join(command) + ': ' + process.stderr)
        return process.stdout

    def app_pids():
        if pidfile.exists():
            pids.update(int(value) for value in pidfile.read_text().splitlines() if value.isdigit())
        return sorted(pids)

    def alive_owned(pid):
        process = subprocess.run(['/bin/ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True)
        return process.returncode == 0 and str(copied) in process.stdout

    try:
        run(['/usr/bin/codesign', '--force', '--deep', '--sign', '-', str(wrapper)])
        run([LSREGISTER, '-f', str(wrapper)])
        registered = True
        stage = 'launchservices'
        run(['/usr/bin/open', '-n', '-a', str(wrapper)])
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        deadline = time.monotonic() + 60
        models = None
        while time.monotonic() < deadline:
            ids = app_pids()
            if len(ids) == 1 and alive_owned(ids[0]):
                try:
                    with opener.open(f'http://127.0.0.1:{port}/v1/models', timeout=1) as response:
                        models = json.load(response)
                    break
                except (OSError, ValueError):
                    pass
            time.sleep(.2)
        if models is None or models.get('object') != 'list' or not isinstance(models.get('data'), list):
            raise RuntimeError('owned production app did not provide a valid gateway model list')
        stage = 'gateway-owner'
        listening = run(['/usr/sbin/lsof', '-nP', '-a', '-p', str(ids[0]),
                         f'-iTCP:{port}', '-sTCP:LISTEN'])
        (out / 'gateway-listener.txt').write_text(listening)
        atomic_json(out / 'models.json', models)
        result['appPID'] = ids[0]
        result['checks'].append('LaunchServices started the non-fixture native binary; its exact PID owns the loopback gateway')
        stage = 'desktop-only-account'
        try:
            with opener.open(f'http://127.0.0.1:{port}/api/tuzi/state', timeout=3) as response:
                raise RuntimeError('HTTP gateway exposed desktop account state: ' + str(response.status))
        except urllib.error.HTTPError as error:
            if error.code not in (403, 404):
                raise
            result['accountHTTPStatus'] = error.code
        if (config / 'account-private/account.json').exists():
            raise RuntimeError('fresh app unexpectedly persisted an account')
        if hashlib.sha256(executable.read_bytes()).hexdigest() != original_hash:
            raise RuntimeError('source executable changed during acceptance')
        result['checks'].append('account management refused over HTTP; no account file; original executable unchanged')
        result['passed'] = True
    except Exception as error:
        result['errors'].append({'stage': stage, 'message': str(error)})
    finally:
        try:
            if registered:
                run([LSREGISTER, '-u', str(wrapper)])
            run([LSREGISTER, '-f', str(app)])
            result['registrationRestored'] = True
        except Exception as error:
            result['passed'] = False
            result['errors'].append({'stage': 'registration-restore', 'message': str(error)})
        result['keptOpen'] = bool(args.keep_open and result['passed'])
        for pid in app_pids():
            if alive_owned(pid) and not result['keptOpen']:
                os.kill(pid, signal.SIGTERM)
                deadline = time.monotonic() + 5
                while alive_owned(pid) and time.monotonic() < deadline:
                    time.sleep(.1)
                if alive_owned(pid):
                    os.kill(pid, signal.SIGKILL)
        atomic_json(out / 'commands.json', commands)
        atomic_json(out / 'processes.json', {'appPIDs': sorted(pids),
                    'cleaned': not any(alive_owned(pid) for pid in pids)})
        atomic_json(out / 'result.json', result)
        print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
