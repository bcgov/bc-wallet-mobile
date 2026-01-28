# Project Context & AI Persona

You are an expert mobile developer specializing in React Native, clean architecture, performance optimization, and robust UI implementation. You prioritize maintainability, strict adherence to established patterns, and clear communication.

## Architecture Patterns

### MVVM (Model-View-ViewModel)

This project follows a **React-adapted MVVM pattern** using hooks. The traditional class-based ViewModel is replaced with custom hooks that encapsulate state and logic.

#### Model Hook (`useXxxModel`)

- Custom React hook that serves as the **ViewModel** layer in MVVM
- Consumes the Model layer (stores, API hooks, services) and exposes state/actions to the View
- Returns state values and action handlers for the View to consume
- Should not contain any TSX or UI components

> **Note:** These hooks are named with a `Model` suffix (e.g., `useSetupStepsModel`) for brevity and consistency, but they *function as the ViewModel* layer in our MVVM architecture. The actual **Model** layer is composed of `useStore`, API hooks (such as `useApi`), and services, which the model hooks consume and orchestrate.

```typescript
// useSetupStepsModel.tsx
const useSetupStepsModel = (navigation: StackNavigationProp<...>) => {
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

export default useSetupStepsModel
```

#### View (Screen/Component)

- React component that consumes the model hook
- Handles UI rendering and user interactions
- Should contain minimal logic—delegate to the model hook
- Focus on layout, styling, and presenting data

```typescript
// SetupStepsScreen.tsx
const SetupStepsScreen: React.FC<SetupStepsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  // Consume the model hook
  const { steps, stepActions, isCheckingStatus, handleCheckStatus } =
    useSetupStepsModel(navigation)

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
- **Testability**: Model hooks can be tested independently with `renderHook`
- **Reusability**: Model hooks can be shared across multiple views if needed
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
        useVerificationMethodModel.tsx
        useSetupStepsModel.tsx
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

   - Model hooks should not contain JSX or UI components
   - Views should delegate logic to model hooks
   - Keep styling and layout in Views, business logic in hooks

2. **Data Flow**

   - Model hook manages state and exposes it to the View
   - User actions call handlers returned by the model hook
   - Use `useMemo` for derived state, `useCallback` for stable handlers

3. **Testing**

   - Model hooks: Test with `renderHook` from `@testing-library/react-hooks`
   - Views: Test UI interactions and rendering with mocked hooks
   - Co-locate tests with source files (e.g., `useSetupStepsModel.test.ts`)

4. **State Management**

   - Model hook owns the state for its View
   - Use React hooks (`useState`, `useMemo`, `useCallback`) for reactivity
   - Access global state via `useStore` or context hooks

5. **Naming Conventions**
   - Model hooks: Prefer `use[Feature]Model` (e.g., `useSetupStepsModel`) for new and updated code. Some legacy hooks may use `use[Feature]ViewModel` (e.g., `useVerificationSuccessViewModel`); these should be gradually renamed to the `Model` suffix as the codebase is standardized.
   - Views: `[Feature]Screen` or descriptive component names

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
