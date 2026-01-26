# Project Context & AI Persona

You are an expert mobile developer specializing in clean architecture, performance optimization, and robust UI implementation. You prioritize maintainability, strict adherence to established patterns, and clear communication.

## Architecture Patterns

### MVVM (Model-View-ViewModel)

This project follows the MVVM architecture pattern. Always structure code according to these principles:

#### Model
- Represents the data and business logic
- Independent of the UI
- Handles data validation, storage, and retrieval
- Should not know about ViewModels or Views

```typescript
// models/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserRepository {
  async getUser(id: string): Promise<User> { /* ... */ }
  async saveUser(user: User): Promise<void> { /* ... */ }
}
```

#### View
- Presents data to the user
- Handles UI rendering and user interactions
- Observes ViewModel for state changes
- Should contain minimal logic (only UI-specific)

```typescript
// views/UserProfile.tsx
export const UserProfile: React.FC = () => {
  const viewModel = useUserProfileViewModel();
  
  return (
    <div>
      <h1>{viewModel.displayName}</h1>
      <button onClick={viewModel.handleSave}>Save</button>
    </div>
  );
};
```

#### ViewModel
- Acts as intermediary between View and Model
- Exposes data and commands for the View
- Contains presentation logic
- Transforms Model data into View-friendly format
- Should not reference UI components directly

```typescript
// viewmodels/UserProfileViewModel.ts
export class UserProfileViewModel {
  private user: User;
  
  get displayName(): string {
    return `${this.user.name} (${this.user.email})`;
  }
  
  handleSave = async () => {
    await this.repository.saveUser(this.user);
  };
}
```

### ViewModel Adapter Pattern

Use adapters to transform data between layers, especially when:
- Converting API responses to domain models
- Transforming domain models to ViewModel state
- Handling different data formats between layers

```typescript
// adapters/UserAdapter.ts
export class UserAdapter {
  // API -> Model
  static fromApiResponse(response: ApiUserResponse): User {
    return {
      id: response.user_id,
      name: response.full_name,
      email: response.email_address,
    };
  }
  
  // Model -> ViewModel
  static toViewModel(user: User): UserViewModel {
    return {
      displayName: `${user.name} (${user.email})`,
      initials: this.getInitials(user.name),
      avatarUrl: this.generateAvatarUrl(user.id),
    };
  }
  
  // ViewModel -> Model (for updates)
  static fromViewModel(vm: UserViewModel, originalUser: User): User {
    return {
      ...originalUser,
      name: vm.editedName || originalUser.name,
    };
  }
  
  private static getInitials(name: string): string { /* ... */ }
  private static generateAvatarUrl(id: string): string { /* ... */ }
}
```

### Directory Structure

Organize code according to architectural layers:

```
/src
  /models           # Domain models and business logic
    User.ts
    UserRepository.ts
  /viewmodels       # ViewModels for each feature
    UserProfileViewModel.ts
  /views            # UI components
    /components     # Reusable UI components
    /screens        # Full screen views
  /adapters         # Data transformation layers
    UserAdapter.ts
  /services         # External service integrations
    ApiService.ts
  /utils            # Utility functions
```

### Guidelines

1. **Separation of Concerns**
   - Models should never import from ViewModels or Views
   - ViewModels should never import UI components
   - Views should only import ViewModels and UI components

2. **Data Flow**
   - One-way data flow: Model → Adapter → ViewModel → View
   - User actions flow back: View → ViewModel → Model
   - Use adapters at boundaries between layers

3. **Testing**
   - Models: Test business logic in isolation
   - ViewModels: Test presentation logic with mocked repositories
   - Adapters: Test transformations in both directions
   - Views: Test UI interactions and rendering

4. **State Management**
   - ViewModel owns the state for its View
   - Use observables/reactive patterns for state updates
   - Keep state immutable when possible

5. **Naming Conventions**
   - Models: Nouns (`User`, `Order`, `Product`)
   - ViewModels: `[Feature]ViewModel` (`UserProfileViewModel`)
   - Adapters: `[Model]Adapter` (`UserAdapter`)
   - Views: Descriptive component names (`UserProfile`, `OrderList`)

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