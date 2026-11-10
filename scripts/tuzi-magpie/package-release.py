#!/usr/bin/env python3
"""Build desktop packages without a developer certificate; never publish them."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "https://github.com/tuziapi/tuzi-magpie"


def run(*args, **kwargs):
    subprocess.run([str(arg) for arg in args], check=True, cwd=ROOT, **kwargs)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--platform", choices=["macos", "windows", "linux"], required=True)
    parser.add_argument("--arch", choices=["amd64", "arm64"], required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    match = re.fullmatch(r"v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-beta\.([1-9][0-9]*))?", args.version)
    if not match:
        parser.error("version must be vX.Y.Z or vX.Y.Z-beta.N")
    expected = {"macos": "Darwin", "windows": "Windows", "linux": "Linux"}[args.platform]
    if platform.system() != expected:
        parser.error(f"{args.platform} desktop packaging requires {expected}")
    if args.platform in ("linux", "windows") and args.arch != "amd64":
        parser.error("Linux DEB and Windows installer currently target amd64")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    numeric = ".".join(match.groups()[:3])
    beta = match.group(4)
    bundle_version = numeric + ("." + beta if beta else "")
    deb_version = numeric + ("~beta." + beta if beta else "")
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=normal"], cwd=ROOT))
    if dirty:
        parser.error("commit source changes before packaging, so assets identify an exact source commit")
    flags = f"-s -w -X main.version={args.version} -X github.com/yetone/magpie/internal/product.Repository={REPOSITORY}"
    env = {**os.environ, "GOARCH": args.arch}
    if args.platform != "windows":
        env["CGO_ENABLED"] = "1"
    prefix = f"tuzi-magpie-{args.version}-{args.platform}-{args.arch}"
    artifacts = []

    def target(name):
        path = output / name
        if path.exists():
            raise SystemExit(f"Refusing to overwrite {path}")
        artifacts.append(path)
        return path

    def notices(folder):
        for name in ("LICENSE", "THIRD_PARTY_NOTICES"):
            shutil.copy2(ROOT / name, folder / name)
        shutil.copy2(ROOT / "docs/tuzi-magpie/unsigned-install.md", folder / "INSTALL.md")

    with tempfile.TemporaryDirectory(prefix="tuzi-package-") as temp:
        stage = Path(temp)
        if args.platform == "macos":
            run("make", "app", f"VERSION={args.version}", f"LDFLAGS={flags}", env=env)
            bundle = stage / "tuzi-magpie.app"
            shutil.copytree(ROOT / "tuzi-magpie.app", bundle, symlinks=True)
            plist_path = bundle / "Contents/Info.plist"
            plist = plistlib.loads(plist_path.read_bytes())
            plist["CFBundleShortVersionString"] = numeric
            plist["CFBundleVersion"] = bundle_version
            plist_path.write_bytes(plistlib.dumps(plist))
            # Ad-hoc integrity signing is required on Apple Silicon. It is
            # not Developer ID signing and does not provide notarization.
            run("codesign", "--force", "--deep", "--sign", "-", bundle)
            run("codesign", "--verify", "--deep", "--strict", bundle)
            run("lipo", bundle / "Contents/MacOS/tuzi-magpie", "-verify_arch", "arm64" if args.arch == "arm64" else "x86_64")
            native_arch = "arm64" if platform.machine().lower() in ("arm64", "aarch64") else "amd64"
            if native_arch == args.arch:
                version = subprocess.check_output([str(ROOT / "scripts/tuzi-magpie/isolated.sh"), str(bundle / "Contents/MacOS/tuzi-magpie"), "--version"], text=True)
                if args.version not in version:
                    raise SystemExit(f"Wrong embedded version: {version!r}")
            notices(stage)
            (stage / "Applications").symlink_to("/Applications")
            dmg = target(prefix + ".dmg")
            # hdiutil's inferred size can be too small for the signed app.
            # Reserve filesystem space in addition to the logical file sizes.
            size = sum(p.stat().st_size for p in stage.rglob("*") if p.is_file() and not p.is_symlink())
            megabytes = max(128, (size + 1048575) // 1048576 + 64)
            run("hdiutil", "create", "-volname", "tuzi-magpie", "-srcfolder", stage,
                "-fs", "HFS+", "-size", f"{megabytes}m", "-format", "UDZO", dmg)
            run("hdiutil", "verify", dmg)
        elif args.platform == "windows":
            run("make", "release-windows", f"VERSION={args.version}", f"LDFLAGS={flags}", env=env)
            binary = ROOT / "dist/tuzi-magpie-windows-amd64.exe"
            run(binary, "--version")
            for arch in ("amd64", "arm64"):
                folder = stage / arch
                folder.mkdir()
                shutil.copy2(ROOT / f"dist/tuzi-magpie-windows-{arch}.exe", folder / "tuzi-magpie.exe")
                notices(folder)
                # The marker opts into the application's existing portable
                # storage mode; no user configuration is bundled.
                (folder / ".tuzi-magpie-portable").touch()
                archive = target(f"tuzi-magpie-{args.version}-windows-{arch}-portable.zip")
                with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
                    for item in sorted(folder.iterdir()):
                        z.write(item, item.name)
            makensis = shutil.which("makensis")
            if not makensis:
                candidate = Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "NSIS/makensis.exe"
                if candidate.is_file():
                    makensis = str(candidate)
            if not makensis:
                raise SystemExit("NSIS is required to create the Windows installer")
            setup = target(prefix + "-setup.exe")
            run(makensis, "/WX", f"/DVERSION={args.version}", f"/DSOURCE={ROOT}", f"/DOUTPUT={setup}", ROOT / "build/tuzi-magpie/installer.nsi")
        else:
            run("make", "release-linux", f"VERSION={args.version}", f"LDFLAGS={flags}", env=env)
            binary = ROOT / "dist/tuzi-magpie-linux-amd64"
            run(binary, "--version")
            linked = subprocess.check_output(["ldd", str(binary)], text=True)
            print(linked)
            if "not found" in linked:
                raise SystemExit("The Linux desktop binary has unresolved dependencies")
            package = stage / "package"
            bin_dir = package / "usr/bin"
            doc_dir = package / "usr/share/doc/tuzi-magpie"
            app_dir = package / "usr/share/applications"
            icon_dir = package / "usr/share/icons/hicolor/256x256/apps"
            control = package / "DEBIAN"
            for folder in (bin_dir, doc_dir, app_dir, icon_dir, control):
                folder.mkdir(parents=True)
            shutil.copy2(binary, bin_dir / "tuzi-magpie")
            notices(doc_dir)
            shutil.copy2(ROOT / "internal/gui/icon-256.png", icon_dir / "tuzi-magpie.png")
            (app_dir / "tuzi-magpie.desktop").write_text("[Desktop Entry]\nType=Application\nName=tuzi-magpie\nExec=tuzi-magpie %u\nIcon=tuzi-magpie\nStartupWMClass=tuzi-magpie\nTerminal=false\nCategories=Development;Utility;\nMimeType=x-scheme-handler/tuzimagpie;\n")
            (control / "control").write_text(f"Package: tuzi-magpie\nVersion: {deb_version}\nArchitecture: amd64\nMaintainer: tuzi-magpie maintainers <noreply@github.com>\nDepends: libc6 (>= 2.39), libgtk-3-0t64, libwebkit2gtk-4.1-0\nSection: utils\nPriority: optional\nHomepage: {REPOSITORY}\nDescription: Tuzi desktop account and local AI gateway (unsigned)\n")
            deb = target(prefix + ".deb")
            run("dpkg-deb", "--root-owner-group", "--build", package, deb)
            run("dpkg-deb", "--info", deb)
            run("dpkg-deb", "--contents", deb)
    manifest = {
        "version": args.version, "commit": commit, "repository": REPOSITORY,
        "platform": args.platform, "architecture": args.arch,
        "developerSigned": False, "notarized": False,
        "artifacts": [{"file": path.name, "bytes": path.stat().st_size,
                       "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in artifacts],
    }
    (output / (prefix + "-manifest.json")).write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
