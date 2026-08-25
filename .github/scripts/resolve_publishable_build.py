"""Pick which `Native Build & Test` run publish.yml should publish.

A run reporting success is not sufficient. When a push's final commit touches
no build-relevant path, early-exit-check skips the build jobs and the run still
concludes successfully — with nothing to publish. Artifacts also expire. So a
run only qualifies if it still holds unexpired IPA or AAB artifacts.
"""

import json
import os
import re
import subprocess
import sys

WORKFLOW = "main.yaml"
RUN_PAGE_SIZE = 100
IPA = re.compile(r"^ios-(?P<variant>.+)\.ipa$")
AAB = re.compile(r"^android-(?P<variant>.+)\.aab$")


def gh_api(path):
    result = subprocess.run(
        ["gh", "api", path], capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout)


def publishable_variants(run_id):
    """Variants in this run that still have an artifact we can publish."""
    artifacts = gh_api(
        f"repos/{REPO}/actions/runs/{run_id}/artifacts?per_page=100"
    )["artifacts"]
    names = [a["name"] for a in artifacts if not a["expired"]]
    variants = set()
    for name in names:
        match = IPA.match(name) or AAB.match(name)
        if match:
            variants.add(match.group("variant"))
    return sorted(variants)


def fail(message):
    print(f"::error::{message}")
    sys.exit(1)


REPO = os.environ["REPO"]
requested_build = os.environ.get("REQUESTED_BUILD", "").strip()
requested_variants = [
    v.strip() for v in os.environ.get("REQUESTED_VARIANTS", "").split(",") if v.strip()
]

runs = gh_api(
    f"repos/{REPO}/actions/workflows/{WORKFLOW}/runs"
    f"?branch=main&per_page={RUN_PAGE_SIZE}"
)["workflow_runs"]

if requested_build:
    matches = [r for r in runs if str(r["run_number"]) == requested_build]
    if not matches:
        fail(
            f"No main build {requested_build} in the last {RUN_PAGE_SIZE} runs. "
            "It may be older than the artifact retention window."
        )
    run = matches[0]
    if run["conclusion"] != "success":
        fail(f"Build {requested_build} concluded '{run['conclusion']}', not success.")
    variants = publishable_variants(run["id"])
    if not variants:
        fail(
            f"Build {requested_build} has no publishable artifacts. "
            "They have expired, or that run skipped the build jobs."
        )
else:
    run, variants = None, []
    for candidate in runs:
        if candidate["conclusion"] != "success":
            continue
        found = publishable_variants(candidate["id"])
        if found:
            run, variants = candidate, found
            break
    if run is None:
        fail(
            f"No main build in the last {RUN_PAGE_SIZE} runs both succeeded and "
            "still has artifacts to publish."
        )

if requested_variants:
    unknown = sorted(set(requested_variants) - set(variants))
    if unknown:
        fail(
            f"Build {run['run_number']} has no artifacts for: {', '.join(unknown)}. "
            f"Available: {', '.join(variants)}."
        )
    variants = [v for v in variants if v in requested_variants]

print(f"Publishing build {run['run_number']} (run {run['id']})")
print(f"  commit:   {run['head_sha']}")
print(f"  variants: {', '.join(variants)}")
if not requested_build:
    print("  chosen as the most recent main build with publishable artifacts")

with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
    output.write(f"run_id={run['id']}\n")
    output.write(f"run_number={run['run_number']}\n")
    output.write(f"head_sha={run['head_sha']}\n")
    output.write(f"variants={json.dumps(variants)}\n")
