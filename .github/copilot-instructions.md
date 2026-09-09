# GitHub Copilot instructions

How Copilot should behave in this repository, and in particular how it should
review pull requests on GitHub.

**Engineering rules live in the root [`AGENTS.md`](../AGENTS.md)** — architecture,
commands, conventions, commit and PR format. Read it when writing or changing
code. This file is about reviewing.

## Reviewing a pull request

This is a wallet holding people's real credentials. A defect that corrupts
wallet state or leaks personal data costs a holder far more than a style nit
costs the team. Review accordingly.

### Procedure

1. **Read _What should the reviewer focus on_ first.** It names where the author
   is least certain. Start there. If it says the change is trivial and the diff
   agrees, a short review is the correct review.

2. **Check the blast radius.** Credential create/store/delete, onboarding, PIN,
   biometrics, native modules, or IAS and mediator calls — read every changed
   line. Everything else is usually a skim.

3. **Review by the priorities below**, stopping when you have enough to be
   useful. Four real findings beat twenty observations.

4. **Summarise by ordering the changed files by review risk**, one line each.
   This is the most valuable part — it tells the human where to spend attention
   before they open the diff.

### Priorities

Roughly in order:

- **Wallet state** — can this leave the wallet unrecoverable? Partial writes, no
  rollback on a failed exchange, assuming a credential survives an await.
  Anything that creates, stores, mutates, or deletes a credential, or changes
  onboarding, PIN, or biometric state.
- **PII** — personal data, tokens, credential attributes, and whole
  request/response bodies must not reach a log, an analytics event, or a
  user-visible error string. Remote logging makes it permanent.
- **iOS/Android divergence** — behaviour changing on one platform only. Hides in
  native modules, permissions, camera, biometrics. Say which platform looks
  untested.
- **Accessibility** — `TouchableOpacity` and `Pressable` need
  `accessibilityLabel`, `accessibilityRole`, `hitSlop`, and `testID`. New
  user-facing text must be localised, and localised strings must not carry
  layout characters such as `\n`.
- **Error handling** — errors surface, never swallowed. API hooks throw; service
  and UI hooks catch and surface. Deleting something absent should succeed, not
  throw. Native errors go through `throwNativeError` / `toNativeAppError`.
- **Architecture** — new work is MVVM (no JSX in ViewModel hooks); existing work
  follows the pattern in the file it's in.

### Do not comment on

- Formatting, import order, or anything Prettier and ESLint already enforce.
- Naming preferences, or behaviour-preserving restructuring, unless the current
  form is genuinely ambiguous.
- Test coverage percentages as a number, or missing tests for code the PR
  didn't add.
- Generated files, lockfiles, and dependency bumps.
- Anything the author already flagged as known.

### Reporting findings

- Every comment should be actionable: what is wrong, where, and why it matters —
  once. Repeating a point across files adds noise, not weight.
- Separate "this is a bug" from "consider this" so the author can triage.
- If you're unsure something is a defect, say so. A confident wrong finding
  costs more than silence.
- Give the reasoning in a sentence or two, not a lecture.

## Also enforced by CI

Two things a review can usefully catch before a check does:

- Every commit needs a `Signed-off-by` trailer (`git commit -s`). The DCO check
  fails the PR without it on any commit, and the fix is a rebase and force-push.
- The PR body follows `.github/pull_request_template.md` with `Closes #<issue>`
  on the first line, or carries the `status/no-issue` label. See
  `docs/pull-requests.md`.
