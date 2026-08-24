# Project Context & AI Persona

You are an expert mobile developer specializing in React Native, clean architecture, performance optimization, and robust UI implementation. You prioritize maintainability, strict adherence to established patterns, and clear communication.

## Architecture Patterns

### MVVM (Model-View-ViewModel)

This project follows a **React-adapted MVVM pattern** using hooks. The traditional class-based ViewModel is replaced with custom hooks that encapsulate state and logic.

#### ViewModel Hook (`useXxxViewModel`)

- Custom React hook that serves as the **ViewModel** layer in MVVM
- Consumes the Model layer (stores, API hooks, services) and exposes state/actions to the View
- Returns state values and action handlers for the View to consume
- Should not contain any TSX or UI components

> **Note:** The **Model** layer is composed of `useStore`, API hooks (such as `useApi`), and services. ViewModel hooks consume and orchestrate these.

```typescript
// useSetupStepsViewModel.tsx
const useSetupStepsViewModel = (navigation: StackNavigationProp<...>) => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  // Derived state
  const steps = useSetupSteps(store)

  // Action handlers
  const handleCheckStatus = useCallback(async () => {
    setIsCheckingStatus(true)
    try {
      // Business logic here
      navigation.navigate(BCSCScreens.VerificationSuccess)
    } finally {
      setIsCheckingStatus(false)
    }
  }, [navigation])

  const stepActions = useMemo(() => ({
    nickname: () => navigation.navigate(BCSCScreens.NicknameAccount),
    id: () => navigation.navigate(BCSCScreens.IdentitySelection),
  }), [navigation])

  return {
    steps,
    stepActions,
    isCheckingStatus,
    handleCheckStatus,
  }
}

export default useSetupStepsViewModel
```

#### View (Screen/Component)

- React component that consumes the ViewModel hook
- Handles UI rendering and user interactions
- Should contain minimal logic—delegate to the ViewModel hook
- Focus on layout, styling, and presenting data

```typescript
// SetupStepsScreen.tsx
const SetupStepsScreen: React.FC<SetupStepsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  // Consume the ViewModel hook
  const { steps, stepActions, isCheckingStatus, handleCheckStatus } =
    useSetupStepsViewModel(navigation)

  return (
    <ScreenWrapper>
      <SetupStep
        title={t('BCSC.Steps.Nickname')}
        completed={steps.nickname.completed}
        onPress={stepActions.nickname}
      />
      <Button
        title={t('BCSC.Steps.CheckStatus')}
        onPress={handleCheckStatus}
        loading={isCheckingStatus}
      />
    </ScreenWrapper>
  )
}
```

#### Pattern Benefits

- **Separation of concerns**: Logic in hooks, rendering in components
- **Testability**: ViewModel hooks can be tested independently with `renderHook`
- **Reusability**: ViewModel hooks can be shared across multiple views if needed
- **React-native**: Leverages React's built-in reactivity (`useState`, `useMemo`, `useCallback`)

### Directory Structure

This codebase uses a **feature-based structure** where each feature contains its own screens, components, ViewModels, and models. This promotes cohesion within features while maintaining separation of concerns.

```
/app/src
  /bcsc-theme                    # BC Services Card app theme
    /api                         # API clients and services
    /components                  # Shared UI components across features
    /contexts                    # React contexts
    /features                    # Feature modules
      /auth                      # Authentication feature
      /home                      # Home screen feature
        Home.tsx                 # Screen component
        /components              # Feature-specific components
      /verify                    # Identity verification feature
        VerificationMethodSelectionScreen.tsx
        SetupStepsScreen.tsx
        useVerificationMethodViewModel.tsx
        useSetupStepsViewModel.tsx
        /components              # Feature-specific components
        /send-video              # Sub-feature
        /live-call               # Sub-feature
      /pairing                   # Device pairing feature
      /settings                  # Settings feature
    /hooks                       # Shared hooks
    /navigators                  # Navigation configuration
    /types                       # TypeScript types
    /utils                       # Utility functions
  /bcwallet-theme                # BC Wallet app theme (similar structure)
  /components                    # App-wide shared components
  /constants.ts                  # App constants
  /localization                  # i18n translations
  /services                      # Shared services
  /store                         # State management
  /utils                         # Shared utilities
```

**Key conventions:**

- Tests are co-located with their source files (e.g., `Screen.tsx` + `Screen.test.tsx`)
- Feature-specific components stay within the feature folder
- Shared components are elevated to `/components` at the appropriate level

### Guidelines

1. **Separation of Concerns**

   - ViewModel hooks should not contain JSX or UI components
   - Views should delegate logic to ViewModel hooks
   - Keep styling and layout in Views, business logic in hooks

2. **Data Flow**

   - ViewModel hook manages state and exposes it to the View
   - User actions call handlers returned by the ViewModel hook
   - Use `useMemo` for derived state, `useCallback` for stable handlers

3. **Testing**

   - ViewModel hooks: Test with `renderHook` from `@testing-library/react-native`
   - Views: Test UI interactions and rendering with mocked hooks
   - Co-locate tests with source files (e.g., `useSetupStepsViewModel.test.ts`)

4. **State Management**

   - ViewModel hook owns the state for its View
   - Use React hooks (`useState`, `useMemo`, `useCallback`) for reactivity
   - Access global state via `useStore` or context hooks

5. **Naming Conventions**

   - ViewModel hooks: `use[Feature]ViewModel` (e.g., `useServiceOutageViewModel`, `useTransferQRScannerViewModel`). Some older hooks use a `Model` suffix (e.g., `useSetupStepsModel`); these may be renamed to `ViewModel` over time for consistency.
   - Views: `[Feature]Screen` or descriptive component names

6. **Error Handling**

   - **User-facing errors belong in the UI layer** (Views or ViewModel hooks), not in API/data hooks. API hooks should throw errors and let callers decide whether and how to surface them.
   - Use `emitErrorAlert` with `AppError.fromErrorDefinition(ErrorRegistry.XXX, { cause: error })` to show errors as native alerts. Prefer this over `emitError` with registry keys.
   - Callers should inspect error types (e.g., `isBcscNativeError`) and choose the appropriate response — some errors are critical (onboarding, auth), others are intentionally non-critical (background tasks, optional nickname updates).
   - API hooks should remain single-responsibility: make the API call, return data, throw on failure. No UI side effects.

## Commit Message and PR Title Formatting

When suggesting commit messages or pull request titles, always follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Scope

The scope should be the name of the architectural layer or component affected:

- `model`: Changes to domain models
- `viewmodel`: Changes to ViewModels
- `view`: Changes to Views/UI
- `adapter`: Changes to data adapters
- `service`: Changes to external services
- Specific feature names: `auth`, `wallet`, `credentials`, etc.

### Examples

- `feat(viewmodel): add user profile editing capability`
- `fix(adapter): correct date transformation in UserAdapter`
- `refactor(model): simplify user repository interface`
- `test(viewmodel): add unit tests for authentication flow`
- `docs(architecture): update MVVM pattern documentation`
- `style(view): adjust spacing in credential card component`

### Pull Request Titles

Pull request titles should follow the same conventional commit format to maintain consistency between commits and PRs.

## General Guidance

### Commit Messages

- Keep descriptions concise and under 72 characters when possible
- Use the imperative mood ("add" not "added" or "adds")
- Do not capitalize the first letter of the description
- No period at the end of the description
- Use the body to explain what and why vs. how
- Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) for clarity

### Code Quality

- Always maintain clear separation between layers
- Use adapters when transforming data between layers
- Write unit tests for each layer independently
- Keep ViewModels framework-agnostic (no UI dependencies)
- Document complex business logic in Models
- Keep Views thin—move logic to ViewModels
- Keep tests close to the code they are testing
- Follow established naming conventions for clarity

## Variant Configuration Files (`variant.env`)

### Quoting Rules

- **Prefer single quotes** (`'...'`) for all values by default. Single quotes denote literal strings and prevent unintended shell expansion (e.g., `$(...)` is preserved as-is).
- **Use double quotes** (`"..."`) only when shell variable substitution or interpolation is explicitly required.
- When in doubt, use single quotes.

#### Examples

```dotenv
# Correct — literal values use single quotes
APP_NAME='BC Services Card'
IOS_BUNDLE_ID='ca.bc.gov.iddev.servicescard'
IOS_PRODUCT_NAME='$(TARGET_NAME)'

# Incorrect — double quotes risk shell expansion of $(...) and similar syntax
IOS_PRODUCT_NAME="$(TARGET_NAME)"
```

### Rationale

These files are sourced in shell contexts (e.g., GitHub Actions `source variant.env`). Double-quoted strings containing `$`, backticks, or `!` will be interpreted by the shell, leading to unexpected behaviour. Single quotes ensure values are loaded exactly as written.

## Issues and Pull Requests

Write for a PO or PM first. Say what changed for the user or the product, then the technical detail if it earns its place. Favour concision — a short description is a good one.

**PRs** follow `.github/pull_request_template.md`:

- `Closes #<issue>` on the first line. A bare `#123` further down creates no link GitHub tracks; linking from the Development panel works too.
- **What changed** — enough to read the diff. The backstory lives in the issue. Screenshots and video go here.
- **What should the reviewer focus on** — the part you are least sure about, or say there isn't one.
- **How to test** — how someone else checks it. "Covered by unit tests" counts.

Aim for a couple of hundred words across the whole body. Don't restate the issue's acceptance criteria or pad a section to look thorough. No issue to link? Omit the `Closes` line and add the `status/no-issue` label — a `chore:` title does **not** exempt a PR from the hygiene check.

**Issues** are created from the forms in `.github/ISSUE_TEMPLATE/`. Titles are plain text — the conventional-commit prefixes above are for commits and PR titles only.

**Stacked PRs** each need their own link. Put the same `Closes #<issue>` on every PR in the stack — auto-close is off, so nothing races to close it — or split the work into sub-issues for a stack of four or more. Say which PR to merge first.

## Code Review Priorities

When reviewing a pull request in this repository, prioritise these, roughly in order:

- **Credential and wallet state.** Anything that creates, stores, mutates, or deletes a credential, or that changes onboarding, PIN, or biometric state. Corrupt wallet state is not recoverable for a holder in the field.
- **PII in logs and errors.** Personal data, tokens, credential attributes, and full request or response bodies must not reach a log line, an analytics event, or a user-visible error string.
- **iOS/Android divergence.** Flag changes that alter behaviour on one platform without the other, especially in native modules, permissions, and camera or biometric flows.
- **Accessibility.** `TouchableOpacity` and `Pressable` require `accessibilityLabel`, `accessibilityRole`, `hitSlop`, and `testID`. New user-facing text must be localised, and localised strings must not carry layout characters such as `\n`.
- **Error handling.** Errors should surface, not be swallowed. API hooks throw; service and UI hooks catch and surface. Prefer idempotency — deleting something absent should succeed, not throw.

Do not comment on:

- Formatting, import order, or anything Prettier and ESLint already enforce.
- Naming preferences, or restructuring that does not change behaviour, unless the current form is genuinely ambiguous.
- Test coverage percentages as a number, or missing tests for code that is not new.
- Generated files, lockfiles, and dependency bumps.

## Labels

See `docs/labels.md`. At most one `component/` and one `work/`; `status/` flags only while true. Workflow state, priority, and Bug/Feature/Task/Epic are board fields, not labels.
