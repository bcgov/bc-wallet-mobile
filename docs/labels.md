# Issue and PR labels

20 labels, grouped by prefix. Most issues need none or one.

Pick at most one `component/` and one `work/`. `ops/` marks where an issue came
from and can sit alongside either. `status/` flags go on only while true — take
them off when they stop being.

## component/ — the area

| Label | Use it when |
|---|---|
| `component/accessibility` | Screen reader, contrast, font scaling, WCAG |
| `component/security` | Auth, keys, data protection, disclosure |
| `component/performance` | Speed, rendering, memory, app size |
| `component/cicd` | Pipelines, builds, release automation |
| `component/test-automation` | E2E, unit tests, test harness |
| `component/design` | Needs or involves UX design |

## work/ — the kind of work

| Label | Use it when |
|---|---|
| `work/tech-debt` | Refactors, cleanup, maintenance |
| `work/spike` | Timeboxed research; output is a decision, not shipped code |

Not `type/` — issue **Type** is a separate field.

## ops/ — where it came from

| Label | Use it when |
|---|---|
| `ops/problem-report` | User-reported error surfaced by remote logging |

## status/ — only while true

| Label | Use it when |
|---|---|
| `status/blocked` | Can't proceed until something else lands. Exempt from the stale bot |
| `status/external-dependency` | Waiting on a third party. Exempt from the stale bot |
| `status/needs-info` | Waiting on repro steps, a decision, or clarification |
| `status/good first issue` | Small, well-scoped, safe for a newcomer |
| `status/do-not-merge` | PR: not to land yet |
| `status/no-issue` | PR: no linked issue on purpose. Exempt from the PR hygiene check |
| `status/skip-changelog` | PR: leave out of the generated changelog |

## UAT

| Label | Use it when |
|---|---|
| `UAT` | Created by the UAT team |
| `UAT/blocked` | UAT can't proceed |

Only a UAT team member closes a `UAT` issue.

## Bot-owned — never set by hand

`stale` · `dependencies`

Unprefixed because automation writes them by exact name: the stale bot sets
`stale`, Dependabot sets `dependencies` (pinned in `.github/dependabot.yml`).

## Use a field, not a label

| For | Use |
|---|---|
| Workflow state | Board **Status** |
| Priority | Board **Priority** |
| Bug / Feature / Task / Epic | Issue **Type** |
| Epic membership | **Parent issue** |
| PR awaiting review | **Linked pull requests** (automatic) |
| Target release | **Milestone** |

Issues are closed by people, not automation. This repo has GitHub's *auto-close
issues with merged linked pull requests* setting turned **off**, so `Closes #`
creates the link but closes nothing — a merged PR leaves its issue open awaiting
verification. A `UAT` issue is closed by a UAT team member.

PRs: see [pull-requests.md](pull-requests.md).
