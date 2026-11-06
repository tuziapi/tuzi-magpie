#!/usr/bin/env python3
"""Verify all six desktop assets against their build manifests before publishing."""
import argparse
import hashlib
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--directory", type=Path, required=True)
parser.add_argument("--version", required=True)
parser.add_argument("--commit", required=True)
args = parser.parse_args()
if not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+-beta\.[1-9][0-9]*", args.version):
    parser.error("expected a beta version")
if not re.fullmatch(r"[0-9a-f]{40}", args.commit):
    parser.error("expected a full source commit")
root = args.directory.resolve()
prefix = "tuzi-magpie-" + args.version
expected = {
    "macos-arm64": [prefix + "-macos-arm64.dmg"],
    "macos-amd64": [prefix + "-macos-amd64.dmg"],
    "windows-amd64": [prefix + "-windows-amd64-setup.exe", prefix + "-windows-amd64-portable.zip", prefix + "-windows-arm64-portable.zip"],
    "linux-amd64": [prefix + "-linux-amd64.deb"],
}
checksums = {}
for platform, names in expected.items():
    manifest_path = root / (prefix + "-" + platform + "-manifest.json")
    manifest = json.loads(manifest_path.read_text())
    if (manifest["version"] != args.version or manifest["commit"] != args.commit
            or manifest["repository"] != "https://github.com/tuziapi/tuzi-magpie"
            or manifest["platform"] + "-" + manifest["architecture"] != platform
            or manifest["developerSigned"] is not False or manifest["notarized"] is not False):
        raise SystemExit(f"Unexpected build identity: {manifest_path.name}")
    entries = manifest["artifacts"]
    if sorted(entry["file"] for entry in entries) != sorted(names):
        raise SystemExit(f"Unexpected asset list: {manifest_path.name}")
    for entry in entries:
        path = root / entry["file"]
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if path.stat().st_size != entry["bytes"] or digest != entry["sha256"]:
            raise SystemExit(f"Asset checksum/size mismatch: {path.name}")
        checksums[path.name] = digest
    checksums[manifest_path.name] = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
(root / "SHA256SUMS.txt").write_text("".join(f"{digest}  {name}\n" for name, digest in sorted(checksums.items())))
print(f"Verified six installers/archives and four manifests at {args.commit}")
