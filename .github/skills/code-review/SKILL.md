---
name: code-review
description: Review a pull request in bc-wallet-mobile — what to prioritise, what to leave alone, and how to summarise findings.
---

# Reviewing a pull request

This is a wallet holding people's real credentials. A defect that corrupts
wallet state or leaks personal data costs a holder far more than a style nit
costs the team. Review accordingly.

## Procedure

1. **Read *What should the reviewer focus on* first.** It names where the author
   is least certain. Start there. If it says the change is trivial and the diff
   agrees, a short review is the correct review.

2. **Check the blast radius.** Credential create/store/delete, onboarding, PIN,
   biometrics, native modules, or IAS and mediator calls — read every changed
   line. Everything else is usually a skim.

3. **Review by priority below**, stopping when you have enough to be useful.
   Four real findings beat twenty observations.

4. **Summarise by ordering the changed files by review risk**, one line each.
   This is the most valuable part — it tells the human where to spend attention
   before they open the diff.

## Priorities

- **Wallet state** — can this leave the wallet unrecoverable? Partial writes,
  no rollback on a failed exchange, assuming a credential survives an await.
- **PII** — personal data, tokens, credential attributes, and whole
  request/response bodies must not reach a log, an analytics event, or a
  user-visible error. Remote logging makes it permanent.
- **iOS/Android divergence** — behaviour changing on one platform only. Hides in
  native modules, permissions, camera, biometrics. Say which platform looks
  untested.
- **Accessibility** — `TouchableOpacity`/`Pressable` need `accessibilityLabel`,
  `accessibilityRole`, `hitSlop`, `testID`. Text must be localised, without
  layout `\n`.
- **Error handling** — errors surface, never swallowed. API hooks throw; service
  and UI hooks catch. Deleting something absent should succeed. Native errors go
  through `throwNativeError`/`toNativeAppError`.
- **Architecture** — new work is MVVM; existing work follows the file it's in.

## Leave alone

Formatting and import order (Prettier and ESLint own those), naming
preferences, behaviour-preserving restructuring, coverage percentages, missing
tests for code the PR didn't add, lockfiles and dependency bumps, and anything
the author already flagged as known.

## Tone

Say what's wrong and why it matters, once. Separate "this is a bug" from
"consider this" so the author can triage. If you're unsure something is a
defect, say so — a confident wrong finding costs more than silence.
