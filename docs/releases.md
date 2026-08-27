# Releases

Nothing ships on its own. Merging code produces build artifacts and stops there.
A build reaches people only when someone runs the **Publish** workflow and says
how far it should go.

For what CI runs and when, see [ci-cd.md](ci-cd.md).

## Rings

A ring is an audience. Each one is wider than the last.

| Ring | Who gets the build | Who approves it |
|---|---|---|
| `ring-0` | The team | Nobody, it always publishes |
| `ring-1` | QA | `bcsc-approvers-ring-1` |
| `ring-2` | UAT | `bcsc-approvers-ring-2-plus` |
| `ring-3` | Early adopters | `bcsc-approvers-ring-2-plus` |
| `ring-4` | Everyone | `bcsc-approvers-ring-2-plus` |

Publishing to a ring publishes every ring below it. Choosing `ring-2` sends the
build to ring-0, ring-1 and ring-2.

The team always gets the build straight away. Everything above ring-0 waits for
one approval, which covers the whole run. Rejecting stops the widening, but the
team already has it.

The same ring names are used on Firebase, TestFlight and Google Play, so
"ring-2 has it" means the same thing wherever a tester is.

### Only ring-0 uploads

Ring-0 puts the build in the stores. Higher rings widen who can see that same
build; it is never uploaded twice, because Apple and Google both reject a
repeated upload.

Publishing is therefore safe to repeat. Taking a build that already went to
ring-0 up to ring-2 later works fine: the ring-0 steps see it is already there
and skip.

## Who approves

Two teams, so signing off on a QA build doesn't also let you release to
everyone.

| Team | Approves | Members |
|---|---|---|
| `bcsc-approvers-ring-1` | ring-1 | UAT, the PO and the dev team |
| `bcsc-approvers-ring-2-plus` | ring-2 to ring-4 | The PO and the dev team |

Anyone in the team can approve. Membership is managed in the team, so nothing
in this repo changes when someone joins or leaves.

Whoever starts a publish cannot approve their own run, so a publish always
needs a second person.

## Publishing

Go to **Actions → Publish → Run workflow**. Anyone with write access can start
one; only an approver can take it past ring-0.

| Input | Leave it alone to | Use it to |
|---|---|---|
| `ring` | Publish to QA | Go further |
| `build_number` | Publish the newest usable build | Publish an older build |
| `targets` | Publish to all three stores | Retry one store after a failure |
| `variants` | Publish every variant | Publish a subset |

Publish never builds. It uploads the artifacts an earlier CI run produced, so
what a tester installs is exactly what CI made.

### Where a build goes

| | ring-0 | ring-1 to ring-4 |
|---|---|---|
| App Store Connect | Uploaded | |
| TestFlight | `ring-0` group | That ring's group |
| Google Play | Internal testing | That ring's closed track |
| Firebase | `ring-0` group | That ring's group |

### Which branch

Publish only runs from `main` or a `release/*` branch. Anywhere else it stops
and says why. This is a guard against shipping a feature branch by accident;
the version comes from the variant files, not the branch name.

### One publish at a time

Publishes queue rather than run together, and a run waiting for approval holds
the queue. Approve or reject promptly; rejecting frees the queue.

## Version numbers

Neither number is set by hand.

**The version** (e.g. `4.1.0`) lives in `variants/<name>/variant.env`. Publish
reads it from the commit that produced the build, so an older build keeps the
version it was built with.

**The build number** is the CI run number. It always goes up, so there is
nothing to coordinate.

## Branching a release

`main` is always the next version. When a version is ready to stabilise, cut a
release branch and let `main` move on:

- 4.1.0 ships, `main` becomes 4.2.0
- `release/v4.1.x` carries the shipping line and takes fixes

CI builds `release/*` branches the same way it builds `main`. Fixes that belong
in both places land on the release branch and are brought forward to `main`.

## Still done by hand

**Submitting to the App Store.** Ring-4 gets the build to App Store Connect and
out to every TestFlight ring. A person submits it for Apple's review.

**Releasing on Google Play.** Ring-4 puts the build on its closed track. A
person promotes it to Production.

Both are on the list to automate. Neither blocks a release today.

## One-time setup

The rings have to exist before a build can reach them. They are created by
hand, and there is one app per variant.

For each variant:

- **Google Play**: four closed testing tracks named `ring-1` to `ring-4` (Test
  and release → Testing → Closed testing → Create track). Tracks cannot be
  created through the API. Use a Google Group for testers so membership changes
  don't need a Play Console edit.
- **App Store Connect**: five TestFlight beta groups, `ring-0` to `ring-4`.
- **Firebase App Distribution**: five tester groups, `ring-0` to `ring-4`.

The repository side is done. The `ring-1` to `ring-4` environments exist under
Settings → Environments with their approver team set. If a ring is ever added,
give its environment a reviewer straight away, or that ring will publish with
nobody signing off.

A missing TestFlight or Firebase group fails the run rather than quietly
skipping that ring.

## When something goes wrong

Each store publishes separately, so one failing does not stop the others.
Re-run with `targets` set to the store that failed.

A destination that is skipped rather than failed had no artifact to publish.
The **Resolve build** step lists what it found. iOS and Android build
independently, so a run can hold one and not the other.
