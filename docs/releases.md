# Releases

Nothing ships on its own. Merging code produces build artifacts and stops
there. A build reaches people only when someone runs the **Publish** workflow
and says who should get it.

This page covers how a release is put together. For what CI runs and when, see
[ci-cd.md](ci-cd.md).

## Rings

A ring is an audience. Publishing to a ring is how you say *who* sees this
build. Each ring is wider than the one before it.

| Ring | Who | Typically |
|---|---|---|
| `ring-0` | The team | Every build worth looking at. The default. |
| `ring-1` | QA | Builds QA is asked to test |
| `ring-2` | UAT | Release candidates |
| `ring-3` | Early adopters | A candidate we're confident in |
| `ring-4` | Everyone | The build we're releasing |

The same ring names are used on Firebase, TestFlight and Google Play, so
"ring-2 has it" means the same thing wherever a tester happens to be.

**Ring 0 comes first.** Publishing at ring-0 uploads the build to the stores.
Every ring after that widens who can see *that same build* — it does not upload
again. Publishing straight to ring-2 without a ring-0 publish first will fail,
because there is nothing for it to widen.

## Publishing

Go to **Actions → Publish → Run workflow**. Anyone with write access can run
it. Pick the branch, pick a ring, run it.

| Input | Leave it alone to | Use it to |
|---|---|---|
| `ring` | Publish to the team (`ring-0`) | Widen an already-published build |
| `build_number` | Publish the most recent usable build | Publish an older build |
| `targets` | Publish everywhere | Retry one destination after a partial failure |
| `variants` | Publish every variant in the build | Publish a subset |

Publish never builds. It takes the artifacts an earlier CI run produced and
uploads those, so what a tester installs is exactly what CI made.

### Where a build goes

| Ring | App Store Connect | TestFlight | Google Play | Firebase |
|---|---|---|---|---|
| `ring-0` | Uploaded | `ring-0` group | Internal track | `ring-0` group |
| `ring-1`–`ring-4` | — | That ring's group | — | That ring's group |

### Which branch

Publish only runs from `main` or a `release/*` branch. From anywhere else it
stops immediately and tells you why.

That guard is there to stop someone shipping a feature branch by accident. The
version number comes from the variant files, not the branch name, so the branch
matters less than it looks — it's a guard rail, not a source of truth.

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

Two steps are deliberately not automated.

**Submitting to the App Store.** Publishing at ring-4 gets the build to App
Store Connect and out to the widest tester ring. Submitting it for Apple's
review is a person pressing the button in App Store Connect.

**Widening on Google Play.** Publish puts the build on Play's internal track.
Moving it to a wider track is done in the Play Console. The ring you choose
drives Firebase and TestFlight; Play stays at internal.

Both are on the list to automate. Neither blocks a release today.

## When something goes wrong

Publish runs each destination separately, so one failing does not stop the
others. Re-run with `targets` set to just the destination that failed, rather
than publishing everything again.

If a destination is skipped rather than failed, the build had no artifact for
it — the **Resolve build** step lists what it found and what it didn't. iOS and
Android build independently, so a run can legitimately hold one and not the
other.
