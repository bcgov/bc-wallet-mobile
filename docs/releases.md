# Releases

Nothing ships on its own. Merging code produces build artifacts and stops
there. A build reaches people only when someone runs the **Publish** workflow
and says how far it should go.

This page covers how a release is put together. For what CI runs and when, see
[ci-cd.md](ci-cd.md).

## Rings

A ring is an audience. Each ring is wider than the one before it.

| Ring | Who gets the build | Who approves it |
|---|---|---|
| `ring-0` | The team | Nobody — always publishes |
| `ring-1` | QA | `bcsc-approvers-ring-1` |
| `ring-2` | UAT | `bcsc-approvers-ring-2-plus` |
| `ring-3` | Early adopters | `bcsc-approvers-ring-2-plus` |
| `ring-4` | Everyone | `bcsc-approvers-ring-2-plus` |

Publishing to a ring publishes every ring below it too. Choosing `ring-2` sends
the build to ring-0, ring-1 and ring-2.

`ring-0` always goes out, straight away, with no approval. Everything above it
waits for someone to approve the ring you picked. One approval covers the
whole run — approving a ring-3 publish releases rings 1, 2 and 3 together.

Rejecting stops the widening, but ring-0 has already gone to the team by then.

The same ring names are used on Firebase, TestFlight and Google Play, so
"ring-2 has it" means the same thing wherever a tester happens to be.

### Only ring-0 uploads

Ring-0 puts the build in the stores. Every higher ring only widens who can see
that same build — it is never uploaded twice, because Apple rejects a duplicate
binary and Google Play rejects a repeated version code.

That also makes publishing safe to repeat. Taking a build that already went to
ring-0 up to ring-2 later works fine: the ring-0 steps notice the build is
already there and skip.

## Who approves

Two teams, so letting QA sign off on a QA build doesn't also let them release
to everyone.

| Team | Approves | Members |
|---|---|---|
| `bcsc-approvers-ring-1` | ring-1 | UAT, the PO and the dev team |
| `bcsc-approvers-ring-2-plus` | ring-2, ring-3, ring-4 | The PO and the dev team |

Anyone in the team can approve — being a team maintainer is not required.
Membership is managed in the team, so nothing in this repo changes when
someone joins or leaves.

Whoever starts a publish cannot approve their own run, so a ring-1 publish
needs a second person.

## Publishing

Go to **Actions → Publish → Run workflow**. Anyone with write access can start
one; only an approver can take it past ring-0.

| Input | Leave it alone to | Use it to |
|---|---|---|
| `ring` | Publish to QA (`ring-1`) | Go further, or stop at ring-0 by rejecting |
| `build_number` | Publish the most recent usable build | Publish an older build |
| `targets` | Publish to all three stores | Retry one store after a partial failure |
| `variants` | Publish every variant in the build | Publish a subset |

Publish never builds. It takes the artifacts an earlier CI run produced and
uploads those, so what a tester installs is exactly what CI made.

### Where a build goes

| | ring-0 | ring-1 to ring-4 |
|---|---|---|
| App Store Connect | Uploaded | — |
| TestFlight | `ring-0` group | That ring's group |
| Google Play | Internal testing | That ring's closed track |
| Firebase | `ring-0` group | That ring's group |

### Which branch

Publish only runs from `main` or a `release/*` branch. From anywhere else it
stops immediately and tells you why.

That guard is there to stop someone shipping a feature branch by accident. The
version number comes from the variant files, not the branch name, so the branch
matters less than it looks — it's a guard rail, not a source of truth.

### One publish at a time

Publishes queue rather than run together, and a run waiting for approval holds
the queue. If you are an approver, approve or **reject** promptly — rejecting
releases the queue for the next publish. Rejecting does not undo ring-0; that
build has already gone to the team.

## Version numbers

Two numbers matter, and neither is set by hand at publish time.

**The version** (e.g. `4.1.0`) lives in `variants/<name>/variant.env`. Publish
reads it from the commit that produced the build, so republishing an older
build carries the version it was actually built with, not today's.

**The build number** is the CI run number. It always goes up, so there is
nothing to coordinate and no chance of colliding with a build already in a
store.

## Branching a release

`main` is always the next version. When a version is ready to stabilise, cut a
release branch for it and let `main` move on:

- `main` becomes the next minor — 4.1.0 ships, `main` becomes 4.2.0
- `release/v4.1.x` carries the shipping line and takes fixes

CI builds `release/*` branches the same way it builds `main`, so a release
branch produces publishable artifacts without any extra setup.

Fixes that belong in both places land on the release branch and are brought
forward to `main`.

## What is still done by hand

**Submitting to the App Store.** Ring-4 gets the build to App Store Connect and
out to every TestFlight ring. Submitting it for Apple's review is a person
pressing the button in App Store Connect.

**Releasing on Google Play.** Ring-4 puts the build on its closed track.
Promoting to Production is done in the Play Console.

Both are on the list to automate. Neither blocks a release today.

## One-time setup

Publishing assumes the rings already exist. They are created by hand, per app,
and there is one app per variant.

For each variant:

- **Google Play** — four closed testing tracks named `ring-1` to `ring-4`
  (Test and release → Testing → Closed testing → Create track). Tracks cannot
  be created through the API. Testers can be managed with a Google Group so
  membership changes don't need a Play Console edit.
- **App Store Connect** — five TestFlight beta groups, `ring-0` to `ring-4`.
- **Firebase App Distribution** — five tester groups, `ring-0` to `ring-4`.

The repository side is already done: the `ring-1` to `ring-4` environments
exist under Settings → Environments, each with its approver team as a required
reviewer and self-review prevented.

If a ring is ever added, give its environment a required reviewer straight
away — an environment with no reviewers approves instantly, so the ring would
publish with nobody signing off.

A missing TestFlight or Firebase group fails the run rather than quietly
distributing to the groups that do exist.

## When something goes wrong

Publish runs each store separately, so one failing does not stop the others.
Re-run with `targets` set to just the store that failed, rather than publishing
everything again.

If a destination is skipped rather than failed, the build had no artifact for
it — the **Resolve build** step lists what it found and what it didn't. iOS and
Android build independently, so a run can legitimately hold one and not the
other.
