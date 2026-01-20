# Developer Notes

## Patches

Local patches for configuring the app against the BCSC dev environment. These are **not committed to main**.

| Patch                                    | Description                                                  |
| ---------------------------------------- | ------------------------------------------------------------ |
| `0001-chore-android-app-to-bcsc-dev`     | Android: BCSC package ID, Firebase config, app icons         |
| `0002-chore-ios-app-to-bcsc-dev`         | iOS: BCSC bundle ID, Firebase config, app icon, URL schemes  |
| `0003-chore-android-slim-bcsc-dev` | Version numbers (4.0.0/3654) + bundle IDs for API validation |

### Apply / Revert

```bash
# Apply a patch
git apply patch/<patch-name>.patch

# Revert a patch
git apply -R patch/<patch-name>.patch
```

### Full BCSC Dev Setup

```bash
# Apply all
git apply patch/0001-chore-android-app-to-bcsc-dev.patch
git apply patch/0002-chore-ios-app-to-bcsc-dev.patch
git apply patch/0003-chore-android-slim-bcsc-dev.patch

# Revert all (reverse order)
git apply -R patch/0003-chore-android-slim-bcsc-dev.patch
git apply -R patch/0002-chore-ios-app-to-bcsc-dev.patch
git apply -R patch/0001-chore-android-app-to-bcsc-dev.patch
```

---

## Project Clean Commands

```bash
yarn clean                                          # JS/Node
cd app/android && ./gradlew clean                   # Android
rm -rf ~/Library/Developer/Xcode/DerivedData        # iOS (all projects)
```

---

## Code Cleanliness & Etiquette

### MVVM Pattern

Separate business logic from views using **model hooks** in the `_models/` folder.

```tsx
// ❌ Avoid: Business logic in the view
const MyScreen = () => {
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const validate = () => { /* validation logic */ }
  const submit = async () => { /* API calls, dispatch, navigation */ }
  return <View>...</View>
}

// ✅ Prefer: Extract to a model hook
// _models/useMyScreenModel.tsx
const useMyScreenModel = ({ navigation }) => {
  const [formState, setFormState] = useState({})
  const [formErrors, setFormErrors] = useState({})
  const handleChange = useCallback((field, value) => { ... }, [])
  const handleSubmit = useCallback(async () => { ... }, [])
  return { formState, formErrors, handleChange, handleSubmit }
}

// MyScreen.tsx - thin view layer
const MyScreen = ({ navigation }) => {
  const { formState, formErrors, handleChange, handleSubmit } = useMyScreenModel({ navigation })
  return <View>...</View>
}
```

See: `app/src/bcsc-theme/features/verify/_models/useResidentialAddressModel.tsx`

### Context Pattern

Use context + provider + hook pattern for shared state. Always include a guard in the hook.

```tsx
const MyContext = createContext<MyContextType | null>(null)

export const MyProvider = ({ children }) => {
  const value = useMemo(() => ({ ... }), [deps])
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>
}

export const useMyContext = () => {
  const context = useContext(MyContext)
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider')
  }
  return context
}
```

See: `app/src/bcsc-theme/contexts/BCSCAccountContext.tsx`

### System Checks (Strategy Pattern)

Implement `SystemCheckStrategy` for startup checks. Each check has `runCheck()`, `onFail()`, `onSuccess()`.

```ts
export class MySystemCheck implements SystemCheckStrategy {
  runCheck(): boolean { return /* condition */ }
  onFail(): void { /* dispatch error banner */ }
  onSuccess(): void { /* clear banner */ }
}
```

See: `app/src/services/system-checks/ServerStatusSystemCheck.ts`

### General Guidelines

- **Functional components only** - no class components
- **Typed props** - use TypeScript interfaces for all props
- **JSDoc comments** - document public functions and complex logic
- **useCallback/useMemo** - wrap handlers and computed values
- **Translations** - use `t('Key')` from `useTranslation()`, never hardcode strings

---
