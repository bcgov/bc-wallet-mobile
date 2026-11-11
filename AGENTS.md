# AGENTS.md

Read `.codex/AGENTS.local.md` if present; it supplements these instructions but
must not override project requirements.

## Repository pitfalls

- One React Native/Bifold repository ships two apps. `BUILD_TARGET` in
  `app/.env` selects `bcwallet` → `app/src/bcwallet-theme/` or `bcsc` →
  `app/src/bcsc-theme/`. Put app-specific features in the selected theme.
- Yarn workspaces cover `app` and `packages/*`. `e2e/` is a separate Yarn
  project with its own dependencies and lockfile; run its commands there.
- The checked-in tree is the `bcsc-dev` variant. When changing assets or config
  also supplied by `variants/<name>/`, mirror the changes in the applicable
  overlays or `scripts/apply-variant.mjs` will silently revert them.
- `variant.env` files are sourced by shells. Single-quote literal values,
  especially `IOS_PRODUCT_NAME='$(TARGET_NAME)'`; use double quotes only when
  shell expansion is intended.
- Regenerate lockfiles with their package managers; CI checks manifest sync.
  Do not hand-edit `packages/bcsc-core/lib/`, Pods, or build outputs.
- For unexpected module-resolution or duplicate-dependency errors, check for
  a local Bifold link (`yarn link:bifold`).

## Validation

Use Node 24 and the Yarn version pinned in `package.json`. From the repo root:

- Run `yarn build` before `yarn typecheck`: it emits the required `bcsc-core`
  types into gitignored `packages/bcsc-core/lib/`.
- Before opening a PR, run `yarn build` then `yarn check`. The latter runs
  typecheck, lint, format checks, and app Jest tests; it does **not** run the
  build, coverage (`yarn coverage`), or native tests.
- Native lint/format requires `swiftformat`, `clang-format`, and `ktlint`.
  Missing-tool install hints mean validation is incomplete.
- App Jest tests use `TZ=GMT`. Co-locate tests.
- Native tests run from `packages/bcsc-core`: `yarn test:ios`,
  `yarn test:android`, or `yarn test` for both. Android requires **JDK 17**;
  set `JAVA_HOME` accordingly. Before adding native tests, read
  `.agents/skills/bcsc-core-native-testing/SKILL.md`.
- Before E2E work, read `e2e/README.md` for the testID registry, screen
  descriptors, arrange flows, and one-journey-per-session convention.

## Implementation rules

- Own the tactical decisions (naming, structure, test layout, which existing
  pattern to follow): match the surrounding code and note the choice in the
  PR's reviewer-focus section.
- Ask before building on a material decision: unspecified user-visible flow
  or copy; persisted store shape or app-state ownership; an IAS/API contract;
  a native module interface; key, token, or attestation handling; or issue
  readings that lead to different behaviour. Batch the questions into one ask,
  each with your recommended answer.
- Drive the issue to done: finish what the work uncovers in the same PR.
  Raise only what is material or would roughly double the PR, recommending
  fold-in or drop; whether a new issue exists is the user's call.
- New features use MVVM: a `use<Feature>ViewModel` hook holds the logic and
  the Screen renders. Read `docs/guides/mvvm.md` before building a new screen
  or feature. When editing existing code, follow the file's current pattern.
- API hooks return data and throw, without UI side effects. Service/UI hooks
  catch and surface errors. In BCSC features, use the matching named alert
  from `useAlerts()` (error modals take the caught error; informational
  alerts take no arguments) or, for screen-specific copy, `emitErrorModal`
  from `useErrorAlert()` with `ensureAppError(error, AppEventCode.XXX)` as the
  error. Skip errors a policy already surfaced (`isHandledAppError`). For
  multi-step flows see "Error reports" in `CONVENTIONS.md`.
- Map native `bcsc-core` rejections through `throwNativeBcscError` /
  `mapNativeBcscError` in `app/src/bcsc-theme/utils/native-error-map.ts`.
  Callers branch on `isAppError(error, AppEventCode.XXX)` and decide whether
  failure is critical or intentionally non-critical. Prefer idempotency, such
  as successful deletion when the item is already absent.
- Every `TouchableOpacity` and `Pressable` needs `accessibilityLabel`,
  `accessibilityRole`, `hitSlop`, and `testID`.
- Localize all user-facing text. Use interpolation rather than concatenation;
  handle wrapping in components, never with layout characters such as `\n`
  in translations.
- Never put personal data, tokens, credential attributes, or whole request/
  response bodies in logs, analytics, or user-visible errors. Logs are remote.
- Keep behavior aligned across iOS and Android, or explain the divergence.
- Record new design/UX patterns and decisions in `CONVENTIONS.md`.

## Commits, PRs, and releases

- Use Conventional Commits for commits and PR titles; allowed types are in
  `commitlint.config.js`. Scopes name the feature/package, not the
  architectural layer. **Every commit must be signed off: `git commit -s`.**
- Before creating or updating PRs, read `docs/pull-requests.md` and follow
  `.github/pull_request_template.md`. Write for a PO/PM first.
  Link issues with `Closes #<issue>` on the first line or the Development
  panel; auto-close is disabled here. Without an issue, use `status/no-issue`
  (see the documented exemptions). Each stacked PR needs its own link.
- Use `.github/ISSUE_TEMPLATE/` for issues; titles are plain text, not
  Conventional Commits. Read `docs/labels.md` before assigning labels;
  workflow state, priority, and issue type are fields, not labels.
- Merging to `main` builds artifacts but publishes nothing. Publishing uses
  the manual **Publish** workflow with existing artifacts, without rebuilding.
  Read `docs/ci-cd.md` before release work.
