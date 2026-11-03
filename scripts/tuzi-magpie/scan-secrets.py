#!/usr/bin/env python3
"""Local-only credential pattern audit. JSON output never includes matched bytes."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

RULES = {
    "private-key": rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----",
    "github-token": rb"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b",
    "aws-access-id": rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    "google-api-key": rb"\bAIza[A-Za-z0-9_-]{35}\b",
    "stripe-secret": rb"\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b",
    "slack-token": rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b",
    "model-api-key": rb"\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{24,}\b",
    "jwt": rb"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{16,}\b",
    "literal-secret": rb'''(?i)(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|secret[_-]?key)["']?\s*[:=]\s*["']([A-Za-z0-9+/_=-]{24,})["']''',
}


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args])


def scan(data, path, source, blob=None):
    if b"\0" in data:
        return [], "binary"
    found = []
    for rule, pattern in RULES.items():
        for match in re.finditer(pattern, data):
            value = match.group(1) if match.lastindex else match.group()
            # Hashes support equality triage without disclosing candidate data.
            found.append({"rule": rule, "path": path, "source": source,
                          "line": data.count(b"\n", 0, match.start()) + 1,
                          "blob": blob, "candidate_sha256": hashlib.sha256(value).hexdigest(),
                          "length": len(value),
                          "context_kind": "test-or-doc" if re.search(r"(^|/)(tests?|testdata|fixtures?|docs|examples?)(/|$)|_test\.|\.test\.", path) else "source"})
    return found, "text"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("repository", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--history", action="store_true", help="Scan every locally reachable blob; never fetch")
    args = parser.parse_args()
    root = args.repository.resolve()
    report = {"repository": str(root), "head": git(root, "rev-parse", "HEAD").decode().strip(),
              "shallow": git(root, "rev-parse", "--is-shallow-repository").decode().strip() == "true",
              "reachable_commits": int(git(root, "rev-list", "--all", "--count")),
              "local_roots": git(root, "rev-list", "--all", "--max-parents=0").decode().splitlines(),
              "rules": list(RULES), "history": args.history, "findings": [], "counts": {}}
    counts = report["counts"]
    paths = set(git(root, "ls-files", "-z", "--cached", "--others", "--exclude-standard").split(b"\0")) - {b""}
    for raw in sorted(paths):
        path = raw.decode(errors="replace")
        file = root / path
        if file.is_symlink() or not file.is_file():
            counts["working_skipped_links_missing"] = counts.get("working_skipped_links_missing", 0) + 1
            continue
        findings, kind = scan(file.read_bytes(), path, "working")
        report["findings"].extend(findings)
        counts["working_" + kind] = counts.get("working_" + kind, 0) + 1
    if args.history:
        objects = git(root, "rev-list", "--objects", "--all").decode().splitlines()
        process = subprocess.Popen(["git", "-C", str(root), "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        try:
            for item in objects:
                oid, _, path = item.partition(" ")
                process.stdin.write((oid + "\n").encode())
                process.stdin.flush()
                header = process.stdout.readline().split()
                size = int(header[2])
                data = process.stdout.read(size)
                process.stdout.read(1)
                if header[1] != b"blob":
                    continue
                findings, kind = scan(data, path, "history", oid)
                report["findings"].extend(findings)
                counts["history_" + kind] = counts.get("history_" + kind, 0) + 1
        finally:
            process.stdin.close()
            process.stdout.close()
            process.wait()
        for oid in sorted({f["blob"] for f in report["findings"] if f["blob"]}):
            commits = git(root, "log", "--all", "--format=%H", "--find-object=" + oid).decode().splitlines()
            for finding in report["findings"]:
                if finding["blob"] == oid:
                    finding["touching_commits"] = commits
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(args.output), "counts": counts, "findings": len(report["findings"]), "shallow": report["shallow"]}))


if __name__ == "__main__":
    main()
