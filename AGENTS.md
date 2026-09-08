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
- App Jest tests use `TZ=GMT`. Co-locate tests; use Testing Library's
  `renderHook` for ViewModels and mock the ViewModel when testing a View.
- Native tests run from `packages/bcsc-core`: `yarn test:ios`,
  `yarn test:android`, or `yarn test` for both. Android requires **JDK 17**;
  set `JAVA_HOME` accordingly. Before adding native tests, read
  `.agents/skills/bcsc-core-native-testing/SKILL.md`.
- Before E2E work, read `e2e/README.md` for the testID registry, screen
  descriptors, arrange flows, and one-journey-per-session convention.

## Implementation rules

- New features use MVVM: `use[Feature]ViewModel` consumes store/API/services
  and exposes state and handlers; Screens render. ViewModels may translate
  and navigate but contain **no JSX or UI components**. Follow existing
  patterns when editing existing code; avoid incidental MVVM migrations.
- Keep components within their feature until a second feature needs them.
  Use `useMemo` for derived state and `useCallback` for stable handlers.
- API hooks return data and throw, without UI side effects. Service/UI hooks
  catch and surface errors. In Views/ViewModels, prefer `emitErrorAlert` with
  `AppError.fromErrorDefinition(ErrorRegistry.XXX, { cause: error })` over
  `emitError` with registry keys.
- Map native errors through `throwNativeError` / `toNativeAppError` in
  `app/src/bcsc-theme/utils/native-error-map.ts`. Callers inspect the type
  (e.g. `isBcscNativeError`) and decide whether failure is critical or
  intentionally non-critical. Prefer idempotency, such as successful deletion
  when the item is already absent.
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
