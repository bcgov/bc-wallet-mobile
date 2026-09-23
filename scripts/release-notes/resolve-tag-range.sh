#!/usr/bin/env bash
# Resolves which of TAG_A/TAG_B is older and lists the PR numbers merged
# between them, for the "Release Notes" workflow. Writes `older`, `newer`
# and `pr_numbers` to GITHUB_OUTPUT. Requires a full clone with tags
# (fetch-depth: 0, fetch-tags: true).
set -euo pipefail

for t in "${TAG_A}" "${TAG_B}"; do
  if ! git rev-parse -q --verify "refs/tags/${t}" >/dev/null; then
    echo "::error::Tag '${t}' does not exist in this repository."
    exit 1
  fi
done

# Order by commit date, not ancestry — tags aren't guaranteed to sit on one
# straight line (see release-notes.yml header).
DATE_A=$(git log -1 --format=%ct "${TAG_A}")
DATE_B=$(git log -1 --format=%ct "${TAG_B}")
if [ "${DATE_A}" -le "${DATE_B}" ]; then
  OLDER="${TAG_A}"; NEWER="${TAG_B}"
else
  OLDER="${TAG_B}"; NEWER="${TAG_A}"
fi

if ! git merge-base --is-ancestor "${OLDER}" "${NEWER}"; then
  UNIQUE_TO_OLDER=$(git log --oneline "${NEWER}..${OLDER}" | wc -l | tr -d ' ')
  echo "::notice::${OLDER} and ${NEWER} are on divergent history (no straight line between them) — ${UNIQUE_TO_OLDER} commit(s) reachable from ${OLDER} never made it into ${NEWER}'s line and are intentionally excluded. This report only covers what's new in ${NEWER} since ${OLDER}."
fi

echo "older=${OLDER}" >> "${GITHUB_OUTPUT}"
echo "newer=${NEWER}" >> "${GITHUB_OUTPUT}"

# Squash-only merge history (see release-notes.yml header) — PR numbers come
# from the tail of each commit subject, e.g. "fix: ... (#4587)".
PR_NUMBERS=$(git log --pretty=%s "${OLDER}..${NEWER}" \
  | grep -oE '\(#[0-9]+\)[[:space:]]*$' \
  | grep -oE '[0-9]+' \
  | sort -un) || true

if [ -z "${PR_NUMBERS}" ]; then
  echo "::notice::No PRs found between ${OLDER} and ${NEWER} (matching '(#N)' at the end of a commit subject) — the report will be posted with empty tables."
  echo "pr_numbers=[]" >> "${GITHUB_OUTPUT}"
else
  echo "pr_numbers=$(printf '%s\n' "${PR_NUMBERS}" | jq -R -s -c 'split("\n") | map(select(length > 0) | tonumber)')" >> "${GITHUB_OUTPUT}"
fi
