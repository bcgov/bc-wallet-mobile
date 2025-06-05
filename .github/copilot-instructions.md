# GitHub Copilot Instructions

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

The scope should be the name of the component or module affected (e.g., `auth`, `wallet`, `credentials`, etc.).

### Examples

- `feat(auth): implement biometric authentication`
- `fix(credentials): resolve issue with credential verification`
- `docs(readme): update installation instructions`
- `style(ui): adjust padding on credential cards`
- `refactor(api): simplify connection handling logic`
- `test(wallet): add unit tests for wallet creation`

### Pull Request Titles

Pull request titles should follow the same conventional commit format to maintain consistency between commits and PRs.

## General Guidance

- Keep descriptions concise and under 72 characters when possible
- Use the imperative mood ("add" not "added" or "adds")
- Do not capitalize the first letter of the description
- No period at the end of the description
- Use the body to explain what and why vs. how
