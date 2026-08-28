"""Pick which `Native Build & Test` run publish.yml should publish.

A run reporting success is not sufficient. When a push's final commit touches
no build-relevant path, early-exit-check skips the build jobs and the run still
concludes successfully — with nothing to publish. Artifacts also expire. So a
run only qualifies if it still holds unexpired artifacts.

iOS and Android build in independent jobs, so a run can hold artifacts for one
platform and not the other. Each artifact kind gets its own variant list so
publish.yml only runs the jobs that have something to upload.
"""

import json
import os
import re
import subprocess
import sys

WORKFLOW = "main.yaml"
RUN_PAGE_SIZE = 100
# ring-0 always publishes; the input picks how much further to go.
RINGS = ["ring-0", "ring-1", "ring-2", "ring-3", "ring-4"]
# BC Wallet is being retired after v4.1, so its ring groups and tracks were
# never created past ring-0. It still publishes to the team; it is left out of
# everything above that rather than failing the run on a missing group.
RING_0_ONLY = {"bcwallet-prod"}


def spaced(ring):
    """The name TestFlight and Play know a ring by.

    Firebase matches on a group alias, which cannot contain spaces, so it keeps
    the hyphen. TestFlight matches on the group's display name and Play on the
    track name, and both of those are written with a space. Same ring, three
    services, two spellings.
    """
    return ring.replace("-", " ")
KINDS = {
    "ipa": re.compile(r"^ios-(?P<variant>.+)\.ipa$"),
    "aab": re.compile(r"^android-(?P<variant>.+)\.aab$"),
    "apk": re.compile(r"^android-(?P<variant>.+)\.apk$"),
}


def gh_api(path):
    result = subprocess.run(
        ["gh", "api", path], capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout)


def publishable_variants(run_id):
    """Per artifact kind, the variants in this run we can still publish."""
    artifacts = gh_api(
        f"repos/{REPO}/actions/runs/{run_id}/artifacts?per_page=100"
    )["artifacts"]
    names = [a["name"] for a in artifacts if not a["expired"]]
    found = {kind: set() for kind in KINDS}
    for name in names:
        for kind, pattern in KINDS.items():
            match = pattern.match(name)
            if match:
                found[kind].add(match.group("variant"))
    return {kind: sorted(variants) for kind, variants in found.items()}


def all_variants(by_kind):
    return sorted({v for variants in by_kind.values() for v in variants})


def fail(message):
    print(f"::error::{message}")
    sys.exit(1)


REPO = os.environ["REPO"]
BRANCH = os.environ["BRANCH"]
RING = os.environ["RING"]
if RING not in RINGS:
    print(f"::error::Unknown ring '{RING}'. Expected one of: {', '.join(RINGS)}.")
    sys.exit(1)
requested_build = os.environ.get("REQUESTED_BUILD", "").strip()
requested_variants = [
    v.strip() for v in os.environ.get("REQUESTED_VARIANTS", "").split(",") if v.strip()
]

runs = gh_api(
    f"repos/{REPO}/actions/workflows/{WORKFLOW}/runs"
    f"?branch={BRANCH}&per_page={RUN_PAGE_SIZE}"
)["workflow_runs"]

if requested_build:
    matches = [r for r in runs if str(r["run_number"]) == requested_build]
    if not matches:
        fail(
            f"No {BRANCH} build {requested_build} in the last {RUN_PAGE_SIZE} runs. "
            "It may be older than the artifact retention window."
        )
    run = matches[0]
    if run["conclusion"] != "success":
        fail(f"Build {requested_build} concluded '{run['conclusion']}', not success.")
    by_kind = publishable_variants(run["id"])
    if not all_variants(by_kind):
        fail(
            f"Build {requested_build} has no publishable artifacts. "
            "They have expired, or that run skipped the build jobs."
        )
else:
    run, by_kind = None, {}
    for candidate in runs:
        if candidate["conclusion"] != "success":
            continue
        found = publishable_variants(candidate["id"])
        if all_variants(found):
            run, by_kind = candidate, found
            break
    if run is None:
        fail(
            f"No {BRANCH} build in the last {RUN_PAGE_SIZE} runs both succeeded and "
            "still has artifacts to publish."
        )

if requested_variants:
    unknown = sorted(set(requested_variants) - set(all_variants(by_kind)))
    if unknown:
        fail(
            f"Build {run['run_number']} has no artifacts for: {', '.join(unknown)}. "
            f"Available: {', '.join(all_variants(by_kind))}."
        )
    by_kind = {
        kind: [v for v in variants if v in requested_variants]
        for kind, variants in by_kind.items()
    }

print(f"Publishing build {run['run_number']} (run {run['id']})")
print(f"  commit: {run['head_sha']}")
if not requested_build:
    print(f"  chosen as the most recent {BRANCH} build with publishable artifacts")
for kind, variants in by_kind.items():
    if variants:
        print(f"  {kind}: {', '.join(variants)}")
    else:
        # Named explicitly so a half-published build is obvious in the log
        # rather than showing up as a quietly skipped job.
        print(f"  {kind}: none — those destinations will be skipped")

# Publishing to a ring publishes every ring below it too, so ring-2 means
# ring-0, ring-1 and ring-2. ring-0 is the upload; the rest only widen who
# can see it, because Apple rejects a duplicate binary and Play rejects a
# duplicate version code.
widen_rings = RINGS[1 : RINGS.index(RING) + 1]

print(f"  ring:   {RING}")
print(f"  reaches: {', '.join(RINGS[: RINGS.index(RING) + 1])}")
print("  ring-0 publishes now, without approval")
held_back = sorted(set(all_variants(by_kind)) & RING_0_ONLY)
if held_back and widen_rings:
    print(f"  ring-0 only for: {', '.join(held_back)}")
if widen_rings:
    print(f"  after {RING} is approved: {', '.join(widen_rings)}")

with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
    for kind, variants in by_kind.items():
        widening = [v for v in variants if v not in RING_0_ONLY]
        output.write(f"widen_{kind}_variants={json.dumps(widening)}\n")
    # Firebase group aliases keep the hyphen.
    output.write(f"widen_rings_csv={','.join(widen_rings)}\n")
    # Play track names use the spaced form.
    output.write(f"widen_tracks_csv={','.join(spaced(r) for r in widen_rings)}\n")
    # TestFlight takes one group per line, spaced, so it needs the heredoc form.
    output.write("widen_groups_lines<<__RINGS_EOF__\n")
    output.write("\n".join(spaced(r) for r in widen_rings) + "\n")
    output.write("__RINGS_EOF__\n")
    output.write(f"run_id={run['id']}\n")
    output.write(f"run_number={run['run_number']}\n")
    output.write(f"head_sha={run['head_sha']}\n")
    for kind, variants in by_kind.items():
        output.write(f"{kind}_variants={json.dumps(variants)}\n")
