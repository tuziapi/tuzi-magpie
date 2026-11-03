#!/bin/sh
# Run checks without reading daily application/Agent credentials. Cache paths
# are resolved before changing the child process's HOME.
set -eu
task_gopath=$(go env GOPATH)
task_modcache=$(go env GOMODCACHE)
task_gocache=$(go env GOCACHE)
task_home=$(mktemp -d "${TMPDIR:-/tmp}/tuzi-magpie-check.XXXXXX")
trap 'chmod -R u+w "$task_home"; rm -rf "$task_home"' EXIT HUP INT TERM
mkdir -p "$task_home/.config" "$task_home/.cache" "$task_home/.local/share"
env HOME="$task_home" USERPROFILE="$task_home" XDG_CONFIG_HOME="$task_home/.config" XDG_CACHE_HOME="$task_home/.cache" XDG_DATA_HOME="$task_home/.local/share" XDG_STATE_HOME="$task_home/.local/state" GOPATH="$task_gopath" GOMODCACHE="$task_modcache" GOCACHE="$task_gocache" "$@"
