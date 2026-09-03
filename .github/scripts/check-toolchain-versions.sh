#!/usr/bin/env bash
#
# Compares the formatter versions pinned in quality.yml against their latest upstream
# release. swiftformat and ktlint are pinned because a new release can change formatting
# rules and fail a build on code nobody touched; pinning removes the surprise but also
# means nothing announces a new version — Dependabot cannot read a version string out of
# a workflow file.
#
# Prints a markdown table of anything behind, including the sha256 of the new release so
# a bump is a two-line edit. Exits 0 whether or not anything is behind; the caller
# decides what to do with the output.
set -euo pipefail

workflow="${WORKFLOW_FILE:-.github/workflows/quality.yml}"
rows=''

pinned_version() {
  grep -oE "^[[:space:]]*$1: '[^']+'" "$workflow" | head -1 | sed "s/.*'\(.*\)'/\1/"
}

latest_release() {
  gh api "repos/$1/releases/latest" --jq '.tag_name' | sed 's/^v//'
}

release_sha256() {
  curl -fsSL --proto '=https' --proto-redir '=https' --retry 3 --retry-connrefused \
    "https://github.com/$1/releases/download/$2/$3" | shasum -a 256 | cut -d' ' -f1
}

check_tool() {
  local name="$1" repo="$2" var="$3" asset="$4"
  local pinned latest sha

  pinned="$(pinned_version "$var")"
  if [ -z "$pinned" ]; then
    echo "::warning::could not read $var from $workflow — this checker needs updating" >&2
    return
  fi

  latest="$(latest_release "$repo")"
  echo "$name: pinned=$pinned latest=$latest" >&2
  [ "$pinned" = "$latest" ] && return 0

  sha="$(release_sha256 "$repo" "$latest" "$asset")"
  rows="${rows}| \`${name}\` | ${pinned} | ${latest} | \`${sha}\` |"$'\n'
}

check_tool swiftformat nicklockwood/SwiftFormat SWIFTFORMAT_VERSION swiftformat.zip
check_tool ktlint      pinterest/ktlint         KTLINT_VERSION      ktlint

[ -z "$rows" ] && exit 0

cat <<EOF
One or more pinned formatters have a newer release. Both gate CI, so a bump can change
formatting rules — read the release notes before taking it.

Update the version **and** its hash together in \`${workflow}\`:

| Tool | Pinned | Latest | sha256 of the new release |
|---|---|---|---|
${rows}
EOF
