#!/usr/bin/env python3
"""Run opt-in installed CLI acceptance with pinned Go caches and a temporary HOME."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--codex", required=True, type=Path)
parser.add_argument("--claude", required=True, type=Path)
parser.add_argument("--real-home", required=True, type=Path,
                    help="Actual user home denied by the inherited macOS sandbox")
args = parser.parse_args()
for path in (args.codex, args.claude, args.real_home):
    if not path.is_absolute() or not path.exists():
        parser.error(f"An existing absolute path is required: {path}")
repo = Path(__file__).resolve().parents[2]
keys = ["GOPATH", "GOMODCACHE", "GOCACHE"]
values = subprocess.check_output(["go", "env", *keys], cwd=repo, text=True).splitlines()
env = os.environ.copy()
env.update(zip(keys, values))
home = tempfile.mkdtemp(prefix="tuzi-installed-cli-")
env.update({"HOME": home, "TUZI_ACCEPTANCE_CODEX": str(args.codex),
            "TUZI_ACCEPTANCE_CLAUDE": str(args.claude),
            "TUZI_ACCEPTANCE_REAL_HOME": str(args.real_home)})
try:
    result = subprocess.run(["go", "test", "-race", "-p", "1", "-tags", "tuzi_fixture",
                             "./internal/tuzifixture", "./internal/agent", "-run",
                             "TestDesktopAccountFixtureProjection|TestTuziInstalledCLIs",
                             "-v", "-count=1", "-timeout=4m"], cwd=repo, env=env)
    raise SystemExit(result.returncode)
finally:
    shutil.rmtree(home)
