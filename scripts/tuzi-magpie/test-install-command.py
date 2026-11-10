#!/usr/bin/env python3
"""Offline installer boundary tests: no downloads or real installation."""
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('install.sh').resolve()
ASSET = 'tuzi-magpie-v0.1.0-macos-arm64.dmg'
PAYLOAD = b'fixture disk image'
DIGEST = hashlib.sha256(PAYLOAD).hexdigest()

class InstallCommand(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tuzi installer test ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.home = self.root / 'home'
        self.home.mkdir()
        self.env = dict(os.environ, HOME=str(self.home), TMPDIR=str(self.root),
                        PATH=str(self.bin)+os.pathsep+os.environ['PATH'],
                        FIXTURE_ROOT=str(self.root), FIXTURE_ARCH='arm64')
        (self.root/'payload').write_bytes(PAYLOAD)
        (self.root/'sums').write_text(f'{DIGEST}  {ASSET}\n')
        self.command('uname', '#!/bin/sh\nif [ "$1" = -s ]; then echo Darwin; else echo "$FIXTURE_ARCH"; fi\n')
        self.command('curl', '''#!/usr/bin/env python3
import os, pathlib, sys
r=pathlib.Path(os.environ['FIXTURE_ROOT']); args=sys.argv[1:]
url=next(a for a in args if a.startswith('https://'))
assert url.startswith('https://github.com/tuziapi/tuzi-magpie/releases/')
with (r/'requests').open('a') as f:f.write(url+'\\n')
if os.environ.get('FAIL_DOWNLOAD'):sys.exit(22)
source='sums' if url.endswith('/SHA256SUMS.txt') else 'payload'
pathlib.Path(args[args.index('-o')+1]).write_bytes((r/source).read_bytes())
''')
    def command(self, name, content):
        p = self.bin/name
        p.write_text(content)
        p.chmod(0o755)
    def run_script(self, *args):
        return subprocess.run(['sh', str(SCRIPT), *args], env=self.env,
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    def test_latest_snapshot_pins_asset_and_cleans_downloads(self):
        r = self.run_script('--check')
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn('Verified '+ASSET, r.stdout)
        self.assertEqual((self.root/'requests').read_text().splitlines(), [
            'https://github.com/tuziapi/tuzi-magpie/releases/latest/download/SHA256SUMS.txt',
            'https://github.com/tuziapi/tuzi-magpie/releases/download/v0.1.0/'+ASSET])
        self.assertFalse((self.home/'Applications').exists())
        self.assertFalse((self.home/'.local').exists())
        self.assertEqual(list(self.root.glob('tuzi-install.*')), [])
    def test_corrupt_download_is_rejected(self):
        (self.root/'payload').write_bytes(b'changed after checksum')
        r = self.run_script('--check')
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('SHA-256 mismatch', r.stdout)
        self.assertFalse((self.home/'Applications').exists())
        self.assertFalse((self.home/'.local').exists())
    def test_ambiguous_or_missing_checksum_is_rejected(self):
        for sums in ['', f'{DIGEST}  {ASSET}\n'*2]:
            with self.subTest(sums=sums):
                (self.root/'sums').write_text(sums)
                r = self.run_script('--check')
                self.assertNotEqual(r.returncode, 0)
                self.assertIn('Missing or ambiguous', r.stdout)
    def test_requested_version_cannot_silently_change(self):
        r = self.run_script('--version', 'v0.2.0', '--check')
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('version mismatch', r.stdout)
        self.assertEqual(len((self.root/'requests').read_text().splitlines()), 1)
    def test_invalid_version_never_downloads(self):
        r = self.run_script('--version', '../../elsewhere', '--check')
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse((self.root/'requests').exists())
    def test_unsupported_cpu_never_downloads(self):
        self.env['FIXTURE_ARCH'] = 'armv7l'
        r = self.run_script('--check')
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse((self.root/'requests').exists())
    def test_download_failure_is_not_an_empty_release(self):
        self.env['FAIL_DOWNLOAD'] = '1'
        r = self.run_script('--check')
        self.assertNotEqual(r.returncode, 0)
        self.assertNotIn('Installed', r.stdout)
        self.assertEqual(list(self.root.glob('tuzi-install.*')), [])

if __name__ == '__main__': unittest.main()
