#!/bin/sh
# Install the released tuzi-magpie desktop app; never build or install upstream Magpie.
set -eu
repo=https://github.com/tuziapi/tuzi-magpie
version=latest
check=
fail() { printf 'tuzi-magpie: %s\n' "$*" >&2; exit 1; }
while [ "$#" -gt 0 ]; do
  case "$1" in
    --version) [ "$#" -ge 2 ] || fail '--version requires vX.Y.Z'; version=$2; shift 2 ;;
    --check) check=1; shift ;;
    -h|--help) printf '%s\n' 'Usage: install.sh [--version vX.Y.Z] [--check]' 'Installs the desktop app. --check only downloads and verifies it.'; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done
if [ "$version" != latest ]; then
  printf '%s\n' "$version" | grep -Eq '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' || fail 'Expected a stable version such as v0.1.0'
fi
case "$(uname -m)" in arm64|aarch64) arch=arm64 ;; x86_64|amd64) arch=amd64 ;; *) fail 'Unsupported CPU architecture' ;; esac
case "$(uname -s)" in
  Darwin) platform=macos; suffix=dmg ;;
  Linux)
    [ "$arch" = amd64 ] || fail 'Linux desktop releases currently support amd64 only'
    [ -r /etc/os-release ] || fail 'Ubuntu 24.04 is required'
    # Read data, not shell code from an OS description file.
    os_id=$(sed -n 's/^ID=//p' /etc/os-release | tr -d '"')
    os_version=$(sed -n 's/^VERSION_ID=//p' /etc/os-release | tr -d '"')
    [ "$os_id" = ubuntu ] && [ "$os_version" = 24.04 ] || fail 'This desktop package requires Ubuntu 24.04 amd64'
    platform=linux; suffix=deb ;;
  *) fail 'Use install.ps1 on Windows. Supported: macOS and Ubuntu 24.04 amd64.' ;;
esac
command -v curl >/dev/null 2>&1 || fail 'curl is required'
if [ "$platform" = macos ]; then
  command -v shasum >/dev/null 2>&1 || fail 'shasum is required'
else
  command -v sha256sum >/dev/null 2>&1 || fail 'sha256sum is required'
fi
work=$(mktemp -d "${TMPDIR:-/tmp}/tuzi-install.XXXXXXXX")
mounted=
stage=
cleanup() {
  if [ -n "$mounted" ]; then hdiutil detach "$work/mount" -quiet >/dev/null 2>&1 || true; fi
  if [ -n "$stage" ] && [ -d "$stage" ]; then
    if [ -e "$stage/previous.app" ] && [ ! -e "$app" ]; then
      if ! mv "$stage/previous.app" "$app"; then
        printf 'Previous app retained at %s/previous.app
' "$stage" >&2
        rm -rf "$work"
        return
      fi
    fi
    rm -rf "$stage"
  fi
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
get() { curl --proto '=https' --tlsv1.2 -fsSL "$1" -o "$2"; }
if [ "$version" = latest ]; then sums="$repo/releases/latest/download/SHA256SUMS.txt"; else sums="$repo/releases/download/$version/SHA256SUMS.txt"; fi
get "$sums" "$work/SHA256SUMS.txt"
# Resolve the version from the checksum snapshot, then download from that
# exact tag. A new Latest release during installation cannot mix versions.
entry=$(awk -v tail="-$platform-$arch.$suffix" '$2 ~ /^tuzi-magpie-v[0-9]+\.[0-9]+\.[0-9]+-/ && substr($2,length($2)-length(tail)+1)==tail {print $1 " " $2}' "$work/SHA256SUMS.txt")
[ "$(printf '%s\n' "$entry" | wc -l | tr -d ' ')" = 1 ] && [ -n "$entry" ] || fail 'Missing or ambiguous package checksum'
digest=${entry%% *}; asset=${entry#* }
[ "${#digest}" = 64 ] || fail 'Invalid SHA-256'
case "$digest" in *[!0-9a-fA-F]*) fail 'Invalid SHA-256' ;; esac
resolved=${asset#tuzi-magpie-}; resolved=${resolved%-"$platform"-"$arch"."$suffix"}
printf '%s\n' "$resolved" | grep -Eq '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' || fail 'Invalid package version'
[ "$version" = latest ] || [ "$version" = "$resolved" ] || fail 'Checksum version mismatch'
printf 'Downloading tuzi-magpie %s (%s %s)…\n' "$resolved" "$platform" "$arch"
get "$repo/releases/download/$resolved/$asset" "$work/$asset"
if [ "$platform" = macos ]; then actual=$(shasum -a 256 "$work/$asset" | awk '{print $1}'); else actual=$(sha256sum "$work/$asset" | awk '{print $1}'); fi
[ "$(printf '%s' "$digest" | tr A-F a-f)" = "$actual" ] || fail 'SHA-256 mismatch; nothing installed'
[ -z "$check" ] || { printf 'Verified %s (SHA-256 %s)\n' "$asset" "$actual"; exit 0; }
if [ "$platform" = linux ]; then
  if [ "$(id -u)" = 0 ]; then apt-get install -y "$work/$asset"; else sudo apt-get install -y "$work/$asset"; fi
  printf '%s\n' 'Installed. Run: tuzi-magpie (requires a graphical desktop session).'
  exit 0
fi
# Install per-user and keep all account/configuration directories untouched.
apps="$HOME/Applications"
app="$apps/tuzi-magpie.app"
bin="$HOME/.local/bin"
link="$bin/tuzi-magpie"
if [ -e "$link" ] || [ -L "$link" ]; then
  [ -L "$link" ] && [ "$(readlink "$link")" = "$app/Contents/MacOS/tuzi-magpie" ] || fail "Refusing to replace another command at $link"
fi
[ ! -L "$app" ] || fail "Refusing to replace a symlink at $app"
if [ -e "$app" ]; then
  [ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Contents/Info.plist" 2>/dev/null)" = com.tuzi.magpie ] || fail "Another application occupies $app"
  pgrep -f "$app/Contents/MacOS/tuzi-magpie" >/dev/null 2>&1 && fail 'Quit tuzi-magpie before updating' || :
fi
mkdir -p "$apps" "$bin" "$work/mount"
hdiutil attach "$work/$asset" -readonly -nobrowse -mountpoint "$work/mount" -quiet
mounted=1
source_app="$work/mount/tuzi-magpie.app"
[ -x "$source_app/Contents/MacOS/tuzi-magpie" ] || fail 'The disk image contains no tuzi-magpie executable'
[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$source_app/Contents/Info.plist")" = com.tuzi.magpie ] || fail 'Unexpected application identity'
codesign --verify --deep --strict "$source_app"
# Stage on the destination volume. Failed copying leaves the old app intact.
stage=$(mktemp -d "$apps/.tuzi-install.XXXXXXXX")
if ! ditto "$source_app" "$stage/tuzi-magpie.app"; then rm -rf "$stage"; fail 'Could not copy the app'; fi
if [ -e "$app" ]; then mv "$app" "$stage/previous.app"; fi
if ! mv "$stage/tuzi-magpie.app" "$app"; then
  fail 'Could not install the app; previous version restored'
fi
rm -rf "$stage"
ln -sfn "$app/Contents/MacOS/tuzi-magpie" "$link"
printf 'Installed at %s\nRun: "%s"\n' "$app" "$link"
case ":$PATH:" in *":$bin:"*) printf '%s\n' 'You can also run: tuzi-magpie' ;; *) printf '%s\n' 'To use the short command, add this to ~/.zshrc (or your shell profile), then reopen the terminal:' 'export PATH="$HOME/.local/bin:$PATH"' ;; esac
printf '%s\n' 'This app is not Developer ID signed/notarized. If macOS blocks it, use Privacy & Security → Open Anyway. Gatekeeper is not disabled.'
