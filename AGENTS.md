# AGENTS.md

Shared instructions for AI coding agents working in this repository. Keep them in
mind while writing or changing code — they describe how this project actually
works, not aspirations.

GitHub Copilot code review has its own file: `.github/copilot-instructions.md`.

## Developer-specific instructions

If `.codex/AGENTS.local.md` exists, read it before starting work.

This file is intentionally gitignored and may contain developer-specific
workflow preferences. It supplements the shared project instructions and
must not override project requirements.

## What this is

BC Wallet Mobile is a React Native app for holding Verifiable Credentials, built
on the OpenWallet Foundation's Bifold framework with Credo-ts for DIDComm and
credential exchange.

One repository ships two apps, selected by `BUILD_TARGET` in `app/.env`:

- **BC Wallet** (`bcwallet`) — the general credential wallet
- **BC Services Card** (`bcsc`) — government identity

The architecture is theme-based: `BUILD_TARGET` selects a theme directory under
`app/src/` — `bcwallet-theme/` or `bcsc-theme/` — and that is where each app's
screens and features live.

```
app/                  React Native app (both build targets)
packages/bcsc-core/   Native Turbo Module `react-native-bcsc-core` — Swift + Kotlin
e2e/                  Appium/WDIO suite, a separate Yarn project (see e2e/README.md)
variants/             Build-variant overlays applied by scripts/apply-variant.mjs
scripts/              Variant, version, icon, and ops scripts
docs/                 CI/CD, pull requests, labels, releases
```

Yarn 4 workspaces (`app`, `packages/*`). `e2e/` is deliberately outside the
workspace and has its own lockfile and `node_modules`.

## Commands

Node 24 and Yarn 4.9.2 (`packageManager` in `package.json`). Run from the repo
root unless noted.

```sh
yarn build        # builds packages/bcsc-core — required before typecheck
yarn typecheck    # tsc --noEmit across app + bcsc-core
yarn lint
yarn format:check # Prettier, swiftformat, clang-format, ktlint
yarn test         # app Jest suite (TZ=GMT)
yarn coverage
yarn check        # typecheck + lint + format:check + test — run this before opening a PR
```

Native lint and format need `swiftformat`, `clang-format`, and `ktlint`
(`brew install swiftformat clang-format ktlint`). Without them the format
scripts exit with an install hint, not a real failure.

`yarn build` must run before `yarn typecheck` — `bcsc-core`'s emitted types live
in `packages/bcsc-core/lib/`, which is gitignored.

App-level commands run from `app/`: `yarn android`, `yarn ios`, `yarn start`,
`yarn test:watch`.

Bifold can be linked locally with `yarn link:bifold`. If you hit strange module
resolution or duplicate-dependency errors, check whether Bifold is currently
linked.

## Architecture

New work follows a React-adapted **MVVM** pattern; existing work follows the
pattern already in the file it lives in. Suggest a refactor to MVVM when it is
genuinely warranted, don't do it as drive-by cleanup.

- **Model** — `useStore`, API hooks (`useApi`, etc.), and services.
- **ViewModel** — a `use[Feature]ViewModel` hook that consumes the Model layer
  and returns state plus action handlers. **No JSX or UI components in a
  ViewModel hook.** It may use `useTranslation` and hold a navigation object;
  what it must not do is render.
- **View** — a `[Feature]Screen` or component that consumes the ViewModel hook
  and handles layout, styling, and presentation only.

Some older hooks use a `Model` suffix (`useSetupStepsModel`); those may be
renamed to `ViewModel` over time.

Use `useMemo` for derived state and `useCallback` for stable handlers.

### Directory layout

Feature-based: each feature owns its screens, components, ViewModels, and
sub-features.

```
app/src/
  bcsc-theme/          BC Services Card app
    api/               API clients and services
    components/        Shared across features
    contexts/
    features/
      home/            Home.tsx + components/
      verify/          Screens, ViewModels, components/, send-video/, live-call/
      auth/  pairing/  settings/
    hooks/  navigators/  types/  utils/
  bcwallet-theme/      BC Wallet app (same shape)
  components/          App-wide shared components
  localization/        i18n translations
  services/  store/  utils/
```

Feature-specific components stay in the feature folder; promote to a shared
`components/` only when a second feature needs them.

### Error handling

- Favour idempotency over erroring — deleting something that doesn't exist
  should succeed, not throw.
- **API hooks throw. Service and UI hooks catch and surface.** An API hook makes
  the call, returns data, and throws on failure — no UI side effects.
- User-facing errors belong in Views or ViewModel hooks. Use `emitErrorAlert`
  with `AppError.fromErrorDefinition(ErrorRegistry.XXX, { cause: error })` in
  preference to `emitError` with registry keys.
- Native module errors go through `throwNativeError` / `toNativeAppError` in
  `app/src/bcsc-theme/utils/native-error-map.ts`.
- Callers inspect the error type (e.g. `isBcscNativeError`) and decide: some
  paths are critical (onboarding, auth), others are intentionally non-critical
  (background tasks, optional nickname updates).
- Errors should surface, not be swallowed.

## Conventions

**Accessibility.** Every `TouchableOpacity` and `Pressable` needs
`accessibilityLabel`, `accessibilityRole`, `hitSlop`, and `testID`.

**Localization.** All user-facing text is localised. Prefer interpolation over
concatenation: `t('Key', { value })` with `"Key": "Text {{value}}"`. Never embed
layout characters such as `\n` in a localized string — handle wrapping in the
component.

**Privacy.** Personal data, tokens, credential attributes, and whole request or
response bodies must not reach a log line, an analytics event, or a user-visible
error string. Remote logging makes anything logged permanent.

**Platform parity.** A change that alters behaviour on one platform should alter
it on both, or say why not. Native modules, permissions, camera, and biometrics
are where divergence hides.

**Comments.** Explain why, not what. `@ts-expect-error` needs a description —
`@typescript-eslint/ban-ts-comment` warns without one.

**Design and UX decisions** are recorded in `CONVENTIONS.md`. Add an entry when
a pattern is established or an approach is chosen over an alternative.

## Testing

- Jest with the React Native preset and Testing Library; tests run with `TZ=GMT`.
- Co-locate tests with source (`Screen.tsx` + `Screen.test.tsx`).
- ViewModel hooks: `renderHook` from `@testing-library/react-native`.
- Views: render with the ViewModel hook mocked.
- Codecov posts project and patch status on PRs, targeting current coverage.

**Native tests** live in `packages/bcsc-core` and run on their own toolchain —
XCTest via SPM on iOS, JUnit 4 + MockK on Android. From that package:
`yarn test:ios`, `yarn test:android`, or `yarn test` for both. The package
targets **JDK 17** (`.tool-versions`, `android/build.gradle`, and the CI job all
pin it); if `test:android` fails on a newer default JDK, point `JAVA_HOME` at a
17 install. Read `.agents/skills/bcsc-core-native-testing/SKILL.md` before
adding native tests — it covers the SPM test target, `SPM_BUILD` stubs, mocking
patterns, and injectable timestamps.

**E2E tests** are a separate Yarn project in `e2e/`; run everything from there.
Its conventions — the testID registry, screen descriptors, arrange flows, and
one-journey-per-session files — are documented in `e2e/README.md`. Follow them
rather than inventing a new shape.

## Generated and managed files — do not hand-edit

- `packages/bcsc-core/lib/` — emitted by `yarn build` (bob).
- `yarn.lock`, `app/android/**/gradle.lockfile`, `app/ios/Podfile.lock` — a CI
  check fails if they drift from the manifests. Regenerate them with the
  package manager, never by hand.
- `app/ios/Pods/`, build outputs, coverage.
- **Variant overlays.** The checked-in working tree _is_ the `bcsc-dev` variant.
  `scripts/apply-variant.mjs` overlays `variants/<name>/` on top of it, so a
  change to an asset or config that a variant also overlays must be mirrored in
  both places or applying that variant will silently revert it.

## Keeping changes scoped

- Do what was asked. Don't widen a change into unrelated refactoring, renaming,
  or reformatting — it makes review harder and hides the real diff.
- Prefer several small, self-contained PRs over one large one.
- Don't reformat files you aren't otherwise changing; Prettier and ESLint own
  formatting.
- Update or remove a comment in the same change that makes it stale.

## Commits

Conventional Commits, configured in `commitlint.config.js`:

```
<type>[optional scope]: <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`,
`revert`. Lower-case type, non-empty subject.

Scope is optional. Use the feature or package touched — `bcsc`, `bcsc-theme`,
`ui`, `deps`, `ci`, `e2e` — rather than an architectural layer.

- Imperative mood ("add", not "added"), no leading capital, no trailing period.
- Under 72 characters where you can manage it.
- Body explains what and why, not how.

**Every commit needs a `Signed-off-by` trailer.** The DCO check fails the PR
without it on _every_ commit, and fixing it afterwards needs a rebase and a
force-push. Commit with `git commit -s` — git has no config that adds the
trailer automatically.

## Issues and pull requests

Write for a PO or PM first: what changed for the user or the product, then the
technical detail if it earns its place. Short is good.

**PR titles** use the same Conventional Commits format as commits.

**PR bodies** follow `.github/pull_request_template.md` — `docs/pull-requests.md`
has the detail:

- `Closes #<issue>` on the first line, or a link from the Development panel. A
  bare `#123` further down creates no link GitHub tracks. `Closes` does not
  close anything here — auto-close is off, so it is pure traceability.
- **What changed** — enough to read the diff. Backstory lives in the issue.
  Screenshots and video go here.
- **What should the reviewer focus on** — the part you're least sure about, or
  say there isn't one.
- **How to test** — how someone else checks it. "Covered by unit tests" counts.

A couple of hundred words for the whole body. Don't restate the issue's
acceptance criteria or pad a section to look thorough.

No issue behind it? Omit the `Closes` line and add the `status/no-issue` label.
The hygiene check exempts `build:`, `docs:`, and `release:` titles — work that
structurally cannot have an issue. A `chore:` title does **not** exempt a PR.

**Stacked PRs** each need their own link: the same `Closes #<issue>` on each, or
sub-issues under a parent for a stack of four or more. Say which to merge first.

**Issues** are created from the forms in `.github/ISSUE_TEMPLATE/`. Titles are
plain text — the conventional-commit prefixes are for commits and PR titles only.

**Labels** — see `docs/labels.md`. At most one `component/` and one `work/`;
`status/` flags only while true. Workflow state, priority, and
Bug/Feature/Task/Epic are board fields, not labels.

## CI

`yarn check` locally covers what the Code Quality workflow runs: build,
typecheck, test with coverage, lint, and format check. That workflow also runs
native tests for iOS and Android. Alongside it, every PR gets a lockfile sync
check (`yarn.lock`, `gradle.lockfile`, `Podfile.lock`), a PR hygiene check,
CodeQL, SonarCloud, Codecov, and DCO.

Merging to `main` builds artifacts and publishes nothing — App Store Connect,
Google Play, and Firebase App Distribution are reached from the manual
**Publish** workflow, which uploads an existing build's artifacts and never
rebuilds. See `docs/ci-cd.md`.

## Variant configuration files (`variant.env`)

These are sourced in shell contexts (GitHub Actions runs `source variant.env`),
so quoting matters.

**Prefer single quotes.** They are literal and prevent shell expansion. Use
double quotes only when substitution is explicitly required — a double-quoted
value containing `$`, a backtick, or `!` will be interpreted by the shell.

```dotenv
# Correct
APP_NAME='BC Services Card'
IOS_PRODUCT_NAME='$(TARGET_NAME)'

# Incorrect — $(...) is expanded
IOS_PRODUCT_NAME="$(TARGET_NAME)"
```
