## How to Contribute

Government employees, public and members of the private sector are encouraged to contribute to the repository by **forking and submitting a pull request**.

(If you are new to GitHub, you might start with a [basic tutorial](https://help.github.com/articles/set-up-git) and check out a more detailed guide to [pull requests](https://help.github.com/articles/using-pull-requests/).)

Pull requests will be evaluated by the repository guardians on a schedule and if deemed beneficial will be committed to the master.

All contributors retain the original copyright to their stuff, but by contributing to this project, you grant a world-wide, royalty-free, perpetual, irrevocable, non-exclusive, transferable license to all users **under the terms of the license under which this project is distributed.**

<!-- TODO: I don't know if this should be heres -->

## Changelog entries

Every PR that changes behaviour a user or QA would notice needs a changelog entry: a markdown file under `.changes/`, named `<kebab-case-slug>.md` (e.g. `.changes/fix-biometrics-crash.md`) — any short, unique, descriptive name works.

```markdown
---
type: fixed
---

Fixed the card list scrolling past the last item on smaller screens.
```

- `type` must be one of `added`, `changed`, `fixed`, `removed`. (This is a different, smaller vocabulary than the commit-message `type` enforced by `commitlint.config.js` — the two aren't related.)
- The body is prose written for a non-technical reader — QA, product, support — not a commit-message-style one-liner. Describe what changed from a user's point of view, not which files moved.
- CI fails a PR that adds no `.changes/*.md` file. If your PR genuinely doesn't need one (a dependency bump, a CI-only tweak), apply the `status/skip-changelog` label instead of writing a throwaway entry.

At release time, pending entries are folded into `CHANGELOG.md` and the consumed `.changes/*.md` files are deleted automatically — you don't need to touch `CHANGELOG.md` yourself.
