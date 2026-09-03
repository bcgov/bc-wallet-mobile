#!/usr/bin/env bash
#
# Runs one of the native formatters, making sure it is installed first.
#
# Locally a missing tool is installed from the repo's Brewfile rather than telling you
# to go and do it yourself. In CI a missing tool is an error: the workflow installs
# swiftformat and ktlint at pinned versions, so silently brew-installing whatever is
# current there would defeat the pinning.
#
# Usage: scripts/native-tool.sh <tool> [args...]
set -euo pipefail

tool="${1:?usage: native-tool.sh <tool> [args...]}"
shift

if ! command -v "$tool" >/dev/null 2>&1; then
  if [ -n "${CI:-}" ]; then
    echo "::error::$tool is not on PATH. CI installs the formatters in .github/workflows/quality.yml." >&2
    exit 1
  fi

  root="$(git rev-parse --show-toplevel)"
  echo "⚠️  $tool is not installed — running 'brew bundle' to install the repo's native tooling..." >&2
  brew bundle --file="$root/Brewfile"

  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "❌ $tool still not found after 'brew bundle'. Is it listed in $root/Brewfile?" >&2
    exit 1
  fi
fi

exec "$tool" "$@"
