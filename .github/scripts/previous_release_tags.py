"""Find the two tags a new release tag should be compared against.

publish.yml tags every ring-0 build `bcsc-v<version>-<build>`, and asks for
two release notes reports per tag: one against the previous build of the same
version (what changed in this build) and one against the last build of the
previous version (what changed in this release).

Only `<prefix>v<major>.<minor>.<patch>-<build>` tags are considered, so the
older hand-made tags (`bcsc-v4.1.0`, `bcsc-v4.1.0_rc1`) are ignored. The
prefix comes from the tag being published, so a variant with its own prefix
is never compared against another's.

Writes `previous_build_tag` and `previous_version_tag` to GITHUB_OUTPUT, empty
when there is no such tag — the first build of a version has no previous
build, and the first version has no previous version.
"""

import os
import re
import subprocess
import sys

TAG_PATTERN = re.compile(r"^(?P<prefix>.*v)(?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)-(?P<build>\d+)$")


def parse(tag):
    match = TAG_PATTERN.match(tag)
    if not match:
        return None
    return {
        "tag": tag,
        "prefix": match["prefix"],
        "version": (int(match["major"]), int(match["minor"]), int(match["patch"])),
        "build": int(match["build"]),
    }


def main():
    tag = os.environ["TAG"]
    current = parse(tag)
    if not current:
        print(f"::error::'{tag}' is not a <prefix>v<major>.<minor>.<patch>-<build> tag, so there is nothing to compare it against.")
        return 1

    result = subprocess.run(["git", "tag", "--list"], capture_output=True, text=True, check=True)
    candidates = [parsed for parsed in map(parse, result.stdout.split()) if parsed and parsed["prefix"] == current["prefix"]]

    same_version = [c for c in candidates if c["version"] == current["version"] and c["build"] < current["build"]]
    previous_build = max(same_version, key=lambda c: c["build"], default=None)

    # The newest build of the newest version below this one. Sorting on
    # (version, build) rather than build alone keeps a patch released after a
    # later minor — 4.1.3 tagged after 4.2.0 — from standing in as "the
    # previous version" of 4.2.0's successor.
    earlier_versions = [c for c in candidates if c["version"] < current["version"]]
    previous_version = max(earlier_versions, key=lambda c: (c["version"], c["build"]), default=None)

    outputs = {
        "previous_build_tag": previous_build["tag"] if previous_build else "",
        "previous_version_tag": previous_version["tag"] if previous_version else "",
    }
    for name, value in outputs.items():
        print(f"{name}={value or '(none)'}")
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
        for name, value in outputs.items():
            handle.write(f"{name}={value}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
