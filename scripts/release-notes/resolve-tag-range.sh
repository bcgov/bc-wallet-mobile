#!/usr/bin/env bash
# Resolves which of TAG_A/TAG_B is older and lists the PR numbers merged
# between them, for the "Release Notes" workflow. Writes `older`, `newer`
# and `pr_numbers` to GITHUB_OUTPUT. Requires a full clone with tags
# (fetch-depth: 0, fetch-tags: true).
set -euo pipefail

for tag in "${TAG_A}" "${TAG_B}"; do
  if ! git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
    echo "::error::Tag '${tag}' does not exist in this repository."
    exit 1
  fi
done

# Order by commit date - not ancestry, tags aren't guaranteed to sit in a straight line.
# Every git command below addresses tags via refs/tags/, matching the validation
# above, so a same-named branch can never shadow the tag.
date_a=$(git log -1 --format=%ct "refs/tags/${TAG_A}")
date_b=$(git log -1 --format=%ct "refs/tags/${TAG_B}")
if [ "${date_a}" -le "${date_b}" ]; then
  older="${TAG_A}"; newer="${TAG_B}"
else
  older="${TAG_B}"; newer="${TAG_A}"
fi

if ! git merge-base --is-ancestor "refs/tags/${older}" "refs/tags/${newer}"; then
  unique_to_older=$(git rev-list --count "refs/tags/${newer}..refs/tags/${older}")
  echo "::notice::${older} and ${newer} are on divergent history (no straight line between them) — ${unique_to_older} commit(s) reachable from ${older} never made it into ${newer}'s line and are intentionally excluded. This report only covers what's new in ${newer} since ${older}."
fi

echo "older=${older}" >> "${GITHUB_OUTPUT}"
echo "newer=${newer}" >> "${GITHUB_OUTPUT}"

# Squash-only merge history. PR numbers come from the tail of each commit subject"fix: ... (#4587)".
# `git log` runs outside the pipe so a real git failure still trips `set -e`; 
# `sed`/`sort` exit 0 even when nothing matches, so "no PRs found" is not mixed up with a git error.
commit_subjects=$(git log --pretty=%s "refs/tags/${older}..refs/tags/${newer}")
pr_numbers=$(printf '%s\n' "${commit_subjects}" \
  | sed -En 's/.*\(#([0-9]+)\)[[:space:]]*$/\1/p' \
  | sort -un)

if [ -z "${pr_numbers}" ]; then
  echo "::notice::No PRs found between ${older} and ${newer} (matching '(#N)' at the end of a commit subject) — the report will be posted with empty tables."
  echo "pr_numbers=[]" >> "${GITHUB_OUTPUT}"
else
  echo "pr_numbers=$(printf '%s\n' "${pr_numbers}" | jq -R -s -c 'split("\n") | map(select(length > 0) | tonumber)')" >> "${GITHUB_OUTPUT}"
fi
