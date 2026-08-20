---
name: code-review
description: Review a pull request in bc-wallet-mobile — what to prioritise, what to leave alone, and how to summarise findings for the reviewer who comes next.
---

# Reviewing a pull request

This repository is a React Native wallet holding people's real credentials. A
defect that corrupts wallet state or leaks personal data costs a holder far more
than a missed style nit costs the team. Review accordingly.

## Procedure

1. **Read the PR description first.** The **What should the reviewer focus on**
   section names where the author is least certain. Start there. If that section
   says the change is trivial and the diff agrees, a short review is the correct
   review.

2. **Establish the blast radius.** Which of these does the diff touch?
   - Credential create, store, mutate, or delete
   - Onboarding, PIN, or biometric state
   - Native modules (`packages/bcsc-core`, anything under `android/` or `ios/`)
   - Network calls to IAS or a mediator
   - Anything else

   The first four warrant a close read of every changed line. The last is
   usually a skim.

3. **Review against the priorities below**, highest first, stopping when you
   have enough to be useful. A review of four real findings beats twenty
   observations.

4. **Post a short summary that orders the changed files by review risk** —
   highest first, one line each on what to look at in that file. This is the
   most valuable thing in the review: it tells the human reviewer where to spend
   their attention.

## Priorities

**Credential and wallet state.** Can this leave the wallet in a state the holder
cannot recover from? Look for partial writes, missing rollback on a failed
exchange, and assumptions that a credential still exists after an await.

**PII in logs and errors.** Personal data, tokens, credential attributes, and
whole request or response bodies must not reach a log line, an analytics event,
or a user-visible error string. Remote logging makes this permanent.

**iOS/Android divergence.** Does this change behaviour on one platform and not
the other? Native modules, permissions, camera, and biometrics are where this
hides. Say which platform you believe is untested.

**Accessibility.** `TouchableOpacity` and `Pressable` need `accessibilityLabel`,
`accessibilityRole`, `hitSlop`, and `testID`. User-facing text must be
localised, and localised strings must not carry layout characters such as `\n` —
use `onTextLayout` measurement for wrapped-text layout instead.

**Error handling.** Errors surface rather than being swallowed. API hooks throw;
service and UI hooks catch and surface. Prefer idempotency: deleting something
that does not exist should succeed. Native module errors go through
`throwNativeError` / `toNativeAppError`.

**Architecture.** New work follows MVVM. Existing work follows whatever pattern
is already in the file — suggest refactoring only where it genuinely pays.

## Do not comment on

- Formatting, import order, or anything Prettier and ESLint enforce
- Naming preferences, or behaviour-preserving restructuring, unless the current
  form is genuinely ambiguous
- Coverage percentages, or missing tests for code the PR did not add
- Generated files, lockfiles, and dependency bumps
- Anything the author already flagged as a known limitation

## Tone

Say what is wrong and why it matters, once. Distinguish "this is a bug" from
"consider this" so the author can triage. If you are uncertain whether something
is a defect, say so rather than asserting it — a confident wrong finding costs
more review time than saying nothing.
