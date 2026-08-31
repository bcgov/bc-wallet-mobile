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
| `ring-1` | QA testers | `bcsc-approvers-ring-1` |
| `ring-2` | UAT testers | `bcsc-approvers-ring-2` |
| `ring-3` | Early adopters | `bcsc-approvers-ring-3-plus` |
| `ring-4` | Everyone | `bcsc-approvers-ring-3-plus` |

Publishing to a ring publishes every ring below it, so `ring-2` sends the build
to ring-0, ring-1 and ring-2. The team gets it straight away; everything above
ring-0 waits on one approval covering the whole run. Rejecting stops the
widening, but the team already has it.

BC Wallet is the exception. It is being retired after v4.1, so it publishes to
the team and is left out of the wider rings rather than failing on groups that
were never created. The **Resolve build** log says so when it applies.

### Only ring-0 uploads

Ring-0 puts the build in the stores. Higher rings only widen who can see it,
because Apple and Google both reject a repeated upload. Every step checks
first, so publishing is safe to repeat: taking a ring-0 build up to ring-2 a
week later skips what is already done.

One asymmetry on Google Play. A re-publish never touches the internal track, so
a newer build there is left alone. Widening does replace whatever the target
ring track held, which is deliberate: widening is an explicit decision, so it
is the one case where a build can knock another off a track.

## Who approves

QA and UAT are separate rings with separate gates. ring-1 goes to QA testers,
ring-2 to UAT testers, and each has its own approval even though the same
people sit on both teams today.

| Team | Approves | Who is on it |
|---|---|---|
| `bcsc-approvers-ring-1` | ring-1 | The UAT team, the PO and the dev team |
| `bcsc-approvers-ring-2` | ring-2 | The UAT team, the PO and the dev team |
| `bcsc-approvers-ring-3-plus` | ring-3 and ring-4 | The PO and the dev team |

Approving is separate from receiving: being on an approver team does not put
you in that ring's tester group, and vice versa.

Anyone in the team can approve, and membership is managed in the team, so
nothing here changes when someone joins or leaves. You cannot approve your own
run, so a publish always needs a second person.

## Publishing

Go to **Actions → Publish → Run workflow**. Anyone with write access can start
one; only an approver can take it past ring-0.

| Input | Leave it alone to | Use it to |
|---|---|---|
| `ring` | Publish to UAT | Stop at QA, or go further |
| `build_number` | Publish the newest usable build | Publish an older build |
| `targets` | Publish to all three stores | Retry one store after a failure |

Publish never builds. It uploads the artifacts an earlier CI run produced, so
what a tester installs is exactly what CI made.

### Where a build goes

| | ring-0 (the team) | ring-1 to ring-4 |
|---|---|---|
| App Store Connect | Uploaded | |
| TestFlight | Internal testing, automatic | External testing, that ring's group |
| Google Play | Internal testing | Closed testing, that ring's track |
| Firebase | The `ring-0` group | That ring's group |

`ring-0` with a hyphen means the ring you pick when running Publish. Each
service spells its own groups differently, and Publish sends each the form it
expects:

| Service | Matches on | Spelling |
|---|---|---|
| TestFlight | Group display name | `ring 1` |
| Google Play | Track name | `ring 1` |
| Firebase | Group alias, which cannot contain a space | `ring-1` |

Two things that surprise people. TestFlight's ring-0 needs nothing from
Publish: Apple gives internal testers every build automatically and refuses to
assign one, so that group exists for the people in it. And approving a ring
does not always reach iOS testers at once, because Apple reviews the first
build of each version before external testers can install it, usually about a
day. Play and Firebase have no such wait.

### Which branch

Publish only runs from `main` or a `release/*` branch, and stops with a reason
anywhere else. It is a guard against shipping a feature branch by accident; the
version comes from the variant files, not the branch name.

### One publish at a time

Publishes queue in the order they started rather than running together, so more
than one can be waiting. A run sitting at the approval gate holds the queue, so
approve or reject promptly.

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

Rings are created by hand, per variant, and a missing group fails the run
rather than skipping that ring quietly.

- **Google Play**: closed tracks `ring 1` to `ring 4` (Test and release →
  Testing → Closed testing → Create track). Tracks cannot be created through
  the API. Use a Google Group for testers so membership changes need no Console
  edit.
- **App Store Connect**: `ring 0` as an internal group (up to 100 App Store
  Connect users, no Apple review, builds arrive automatically), `ring 1` to
  `ring 4` as external groups.
- **Firebase App Distribution**: aliases `ring-0` to `ring-4` in **both**
  projects. iOS and Android are separate projects, so a group added to one is
  invisible to the other, and the platform that has it succeeds while the other
  fails. The project number is in that platform's `google-services` document,
  and in `FIREBASE_APP_ID` in the publish log.

Check a Firebase group's alias after creating it. Firebase derives the alias
from the display name and will not reuse one that is taken, so a second group
called "ring 1" becomes `ring-1-1` and never receives a build.

The repository side is done: the `ring-1` to `ring-4` environments exist with
their approver teams. A new ring needs a reviewer on its environment straight
away, or it publishes with nobody signing off.

## When something goes wrong

Each store publishes separately, so one failing does not stop the others.
Re-run with `targets` set to the store that failed.

A destination that is skipped rather than failed had no artifact to publish.
The **Resolve build** step lists what it found. iOS and Android build
independently, so a run can hold one and not the other.
