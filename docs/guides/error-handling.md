# Error Handling Guide

Read before adding error handling to a hook, ViewModel or screen. When editing existing code, follow the pattern in the file you're in.

## Who does what

- **API hooks** (`api/hooks/`) return data and throw. No UI side effects.
- **Service hooks and ViewModels** catch and surface. An async ViewModel handler owns its errors; the Screen just calls it (see `docs/guides/mvvm.md`).
- Favour idempotency over erroring: deleting something that is already absent succeeds instead of throwing.

## Surfacing an error

Every error is shown as an `AppError`. `ensureAppError(error, AppEventCode.XXX)` (`app/src/errors/errorHandler.ts`) returns the error unchanged if it is already an `AppError`, and otherwise wraps it with the fallback event code.

**BCSC features: use a named alert from `useAlerts()`** (`app/src/hooks/useAlerts.tsx`). Each alert has its own copy and event code, so call the one that matches the failure.

- Error modals take the caught error: `serverErrorAlert(error)`, `failedToWriteToLocalStorageAlert(error)`, `unknownErrorModal(error)`.
- Informational alerts take no error: `forgetPairingsAlert()`. A few take an `onAction` callback instead: `cancelVerificationRequestAlert(onAction)`.
- `useAlerts()` calls `useBCSCStack()`, which needs `BCSCStackProvider`. `app/src/Root.tsx` supplies it only in BCSC mode, so do not use `useAlerts()` in BC Wallet features.

Example: `app/src/bcsc-theme/features/settings/useConfigureMediatorViewModel.ts` catches a failed mediator switch, logs it and calls `failedToSwitchMediatorAlert(error)`.

**Screen-specific copy: `emitErrorModal` from `useErrorAlert()`** (`app/src/contexts/ErrorAlertContext.tsx`):

```ts
const { emitErrorModal } = useErrorAlert()

emitErrorModal(t('Title'), t('Message'), ensureAppError(error, AppEventCode.XXX))
```

Example: `app/src/bcsc-theme/features/verify/useResidentialAddressModel.tsx` does this for a failed device authorization.

**BC Wallet features** use `useErrorAlert()` directly, as in `app/src/bcwallet-theme/features/person-flow/screens/PersonCredentialLoading.tsx`. `ErrorAlertProvider` wraps both modes in `app/App.tsx`. For an informational native alert use `emitAlert(title, description, { actions, event })` from the same hook.

## Errors a policy already handled

`BCSCApiClientContext` runs the matching client error policy (`app/src/bcsc-theme/api/clientErrorPolicies.ts`) and then sets `handled` on the `AppError`. The policy has already shown an alert or navigated away, so skip these in your catch block:

```ts
if (isHandledAppError(error)) {
  return
}
```

To act on one specific failure, branch with `isAppError(error, AppEventCode.XXX)`. It narrows the type; `error.appEvent` is that code.

## Native errors

Map `bcsc-core` rejections with `throwNativeBcscError(error)` or `mapNativeBcscError(error)` (`app/src/bcsc-theme/utils/native-error-map.ts`). Mapped native codes become their specific `AppError`; unmapped ones become `UNMAPPED_NATIVE_ERROR` with the raw code kept on `cause`. An `AppError` passes through unchanged.

The caller decides whether the failure is critical (surface it) or intentionally non-critical (log it and carry on).

## Multi-step flows

When a flow has several steps, record which one failed before surfacing. See "Error reports: record where and when a flow failed" in [`CONVENTIONS.md`](../../CONVENTIONS.md).

## Testing

Mock the surfacing hook and assert the call; assert it is not called when the error was handled.

- Named alert: mock `@/hooks/useAlerts` to return the alert as a `jest.fn()`, then `expect(alert).toHaveBeenCalledWith(error)` (`useConfigureMediatorViewModel.test.ts`).
- `emitErrorModal`: mock `@/contexts/ErrorAlertContext` so `useErrorAlert` returns a `jest.fn()` `emitErrorModal`, then check the arguments, and that it is not called for a handled error (`useResidentialAddressModel.test.ts`).
