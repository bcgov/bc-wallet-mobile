# MVVM Guide

Read before building a new screen or feature. New work uses MVVM. When editing existing code, follow the pattern in the file you're in; migrate to MVVM only when the issue asks for it. Reference implementation: `app/src/bcsc-theme/features/service-notice/`.

## Layout

A feature lives in `app/src/bcsc-theme/features/<feature>/`, with tests beside the code:

```
features/service-notice/
  ServiceNoticeScreen.tsx          View
  ServiceNoticeScreen.test.tsx
  useServiceNoticeViewModel.ts     ViewModel
  useServiceNoticeViewModel.test.ts
```

Components stay inside their feature until a second feature needs them; then move them to `bcsc-theme/components/`.

## Layers

```
api hooks  →  service hooks  →  ViewModel  →  Screen
store / contexts / state/<domain> hooks  ↗
```

| Layer                          | Job                                                                                                                     | Must not                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **API hook** (`api/hooks/`)    | Call one IAS endpoint; return data, throw on failure.                                                                   | Show UI, navigate, or swallow errors.                            |
| **Service hook** (`services/`) | Compose API calls and store writes into one operation.                                                                  | Render or navigate.                                              |
| **ViewModel**                  | Read store, contexts, services and derived-state hooks; expose display values and handlers. May translate and navigate. | Contain JSX, components, styles or theme values.                 |
| **Screen**                     | Call its ViewModel once and render: layout, theme, styles, `testID`s, accessibility props.                              | Read the store, call services or APIs, or decide business rules. |

Conclusions computed from state (`isExpired`, a phase, which notice to show) belong in `bcsc-theme/state/<domain>/`, not the ViewModel. The ViewModel calls the `use<Concept>` hook and passes the result through. Use the `app-state` skill before adding one.

## ViewModel shape

- Name it `use<Feature>ViewModel`. It takes only what it can't read itself, typically `navigation`.
- Return a flat object of display values and handlers: `headerText`, `sections`, `isLoading`, `handleContactUs`. Handlers are `handle<Action>`.
- Memoize derived values with `useMemo` and handlers with `useCallback` so the Screen re-renders only on real change.
- Async handlers own their errors: catch, then surface them with a `useAlerts()` alert or `emitErrorModal` (see Implementation rules in `AGENTS.md`). The Screen calls the handler and renders the result.

## Testing

- ViewModel: `renderHook`, mocking its store, context, service and navigation inputs. Cover every handler and every branch of each returned value.
- Screen: mock the ViewModel module (`jest.mock('./use<Feature>ViewModel', ...)`) and assert rendering, `testID`s and that controls call the handlers. Business logic is tested in the ViewModel, not here.
