# Derived-State Refactor Guide (for agents)

Read before refactoring app state that is computed from other state. Reference implementation: bc-wallet-mobile PR #4882 (card expiry phase).

## Core rule: derive, don't store

- Store only **facts**: raw data from the server, device, or user. Never store conclusions ("isExpired", "showRenewalNotice").
- Compute conclusions on read. A stored conclusion goes stale and disagrees with its facts.
- Delete actions, reducer cases, persisted fields, and launch-time resets that only existed to hold a conclusion.

## Layers

```
facts (store / context)  →  selector  →  rule (pure fn)  →  hook  →  UI
```

| Layer            | Job                                                                     | Must not                                       |
| ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| **Rule**         | Pure fn `(facts, now) => result`. The single definition of the concept. | Import React, the store, or call `new Date()`. |
| **Selector**     | Picks facts out of state and calls the rule.                            | Contain business logic.                        |
| **Hook**         | Reads store/context, calls the selector, memoizes.                      | Log, dispatch, or re-implement the rule.       |
| **UI / effects** | Branch on the result.                                                   | Re-derive the answer.                          |

## Naming

- Raw-input types end in `Fact`/`Facts`: `ExpiryFacts`. Readers know it is unprocessed data.
- Selectors use the Redux-style `select<Concept>` prefix (`selectAccountPhase`).
- Rule, selector and hook live together in `bcsc-theme/state/<domain>/` (`account-phase.ts`, `selectors.ts`, `useAccountPhase.ts`).
- Rules are `get<Concept>`: `getAccountPhase`. Hooks are `use<Concept>`: `useAccountPhase`.
- Result kinds are a string `enum` (`AccountPhaseType.Expired`), never bare string literals.

## Rule design

- One function answers the question everywhere. If two places decide it, merge them.
- Return a discriminated union; attach data only to the variants that have it (`expiresAt` on `Active`/`ExpiringSoon`).
- Take `now` as a parameter so tests control time.
- Order checks by authority: not applicable → authoritative server signals → missing data → computed values.
- Distinguish "nothing to judge" (`None`) from "can't tell" (`Unknown`). Never let missing data read as healthy.
- Compare dates as calendar days, not milliseconds.

## Side effects

- Logging, analytics, and push sync live in **one** effect keyed on the derived value, not in the hook (every hook consumer would log).
- Never log values that reveal PII (e.g. days until expiry reveals the expiry date).

## Testing

- Rule: table-driven unit tests covering every branch and boundary (day 0, warning-window edge, invalid date).
- Selector: maps state → facts correctly.
- Hook: one connected test with the real providers.
- Prove tests aren't theater: gut the implementation and confirm they fail.

## Scope discipline

- Refactor is behaviour-preserving unless a change is explicitly agreed; list any behaviour change in the PR.
- Remove now-dead code (system checks, scopes, flags) in the same PR; grep for log lines or queries that referenced it.
- Don't add re-render triggers (e.g. midnight timers) speculatively; recompute on store/context change until a need is shown.
- Comments say why, 1–3 lines; enum variants with non-obvious meaning get one.
