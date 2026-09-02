# Pull requests

Every PR needs a tracked link to an issue, or an explicit note that it has none.
A check enforces this on PRs marked ready for review.

## Link it

Put the issue number on the first line:

```
Closes #1234
```

Or link it from the **Development** panel on the right — same result. A bare
`#1234` further down in the description looks like a link but isn't one; it
never reaches the issue timeline or the board.

`Closes` does not close anything here. This repo has GitHub's auto-close setting
turned off, so the keyword is pure traceability — a merged PR leaves its issue
open awaiting verification, and a person closes it.

## No issue behind it?

That's normal. Omit the `Closes` line and add the **`status/no-issue`** label.

A `chore:` title does **not** exempt a PR. Only `build:`, `docs:`, and
`release:` do — those categories structurally can't have an issue.

## Stacked PRs

Each PR in the stack needs its own link.

- **Two or three PRs** — put the same `Closes #1234` on each. Nothing races to
  close the issue, and its timeline shows the whole stack.
- **Four or more** — split the work into sub-issues under a parent, and link one
  per PR.

Say which PR to merge first. Target the parent's branch; GitHub retargets the
child to `main` when the parent merges.

## Write it short

Follow `.github/pull_request_template.md`. A couple of hundred words for the
whole body, in language a PO or PM understands.

| Section | What goes in it |
|---|---|
| **What changed** | Enough to read the diff. Backstory lives in the issue. Screenshots and video here |
| **What should the reviewer focus on** | The part you're least sure about — or say there isn't one |
| **How to test** | How someone else checks it. "Covered by unit tests" counts |

Don't restate the issue's acceptance criteria or pad a section to look thorough.
"Copy change, quick skim is fine" is a complete answer.

## What the check looks at

| Rule | Passes when |
|---|---|
| Linked issue | `closingIssuesReferences` is non-empty — `Closes #` or a Development-panel link |
| Sections filled | Each of the three has 15+ characters, ignoring HTML comments |

Skipped entirely for: drafts, the merge queue, bot authors, `dependencies`,
`build:`/`docs:`/`release:` titles, and `status/no-issue`.

Labels: see [labels.md](labels.md).
