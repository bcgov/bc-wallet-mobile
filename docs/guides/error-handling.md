# Error Handling Guide

Read before adding error handling to a hook, ViewModel or screen. When editing existing code, follow the pattern in the file you're in.

## Who does what

- **API hooks** (`api/hooks/`) return data and throw. No UI side effects.
- **Service hooks and ViewModels** catch and surface. An async ViewModel handler owns its errors; the Screen just calls it (see `docs/guides/mvvm.md`).
- **Exactly one layer presents a given failure.** Either the service hook surfaces it or the ViewModel does, never both. See "One owner per failure" below.
- Favour idempotency over erroring: deleting something that is already absent succeeds instead of throwing.

## Surfacing an error

Error modals take an `AppError`. `ensureAppError(error, AppEventCode.XXX)` (`app/src/errors/errorHandler.ts`) returns the error unchanged if it is already an `AppError`, and otherwise wraps it with the fallback event code.

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

## One owner per failure

The layer that shows the alert owns the failure. The rule:

- If a service hook surfaces the error, it sets `error.handled = true` and rethrows. It never resolves normally after alerting, so a caller cannot mistake the failure for success and navigate on. Examples: `useEvidenceService.tsx` (`handleEvidenceApiError`, then `throw error`), `useAuthorizationService.tsx` (`handleAuthorizationError`, then `throw error`) and `useRegistrationService.tsx` (alert, `appError.handled = true`, `throw appError`), all under `app/src/bcsc-theme/services/hooks/`.
- If a service hook does not surface it, it just throws and the ViewModel surfaces it.
- Callers treat rejection as the failure signal and skip handled errors, so nothing is shown twice:

```ts
if (isHandledAppError(error)) {
  return
}
```

A client error policy is one instance of this. `BCSCApiClientContext` runs the matching policy (`app/src/bcsc-theme/api/clientErrorPolicies.ts`) and then sets `handled` on the `AppError`, even when the policy only suppresses the global alert.

To act on one specific failure, branch with `isAppError(error, AppEventCode.XXX)`. It narrows the type; `error.appEvent` is that code. Check it before `isHandledAppError` when a suppressing policy leaves that failure for your screen to show, as `app/src/bcsc-theme/features/services/ServiceLoginScreen.tsx` does for an expired pairing code.

## Native errors

Map `bcsc-core` rejections with `throwNativeBcscError(error)` or `mapNativeBcscError(error)` (`app/src/bcsc-theme/utils/native-error-map.ts`). Mapped native codes become their specific `AppError`; unmapped ones become `UNMAPPED_NATIVE_ERROR` with the raw code kept on `cause`. An `AppError` passes through unchanged. A `decodePayload` / `decodeLoginChallenge` rejection uses `toDecodeAppError(error, fallback)` instead (see "Server keys" in [`CONVENTIONS.md`](../../CONVENTIONS.md)).

The caller decides whether the failure is critical (surface it) or intentionally non-critical (log it and carry on).

**A user cancelling is not an error.** `E_DEVICE_AUTH_CANCELLED` is deliberately left out of the map (`native-error-map.ts`), so mapping it would turn Cancel into `UNMAPPED_NATIVE_ERROR`. Handle cancellation before mapping and show no alert. Only Android's `performDeviceAuthentication` rejects with that code. `unlockWithDeviceSecurity` resolves `{ success: false }` on cancel on both platforms, and `useAuthentication.tsx` returns quietly in that case. There is no shared constant or helper for the code; compare `error.code` after `isBcscNativeError(error)` (from `react-native-bcsc-core`) if you need to detect it.

## Multi-step flows

When a flow has several steps, record which one failed before surfacing. See "Error reports: record where and when a flow failed" in [`CONVENTIONS.md`](../../CONVENTIONS.md).

## Testing

Mock the surfacing hook and assert the call; assert it is not called when the error was handled.

- Named alert: mock `@/hooks/useAlerts` to return the alert as a `jest.fn()`, then `expect(alert).toHaveBeenCalledWith(error)` (`useConfigureMediatorViewModel.test.ts`).
- `emitErrorModal`: mock `@/contexts/ErrorAlertContext` so `useErrorAlert` returns a `jest.fn()` `emitErrorModal`, then check the arguments, and that it is not called for a handled error (`useResidentialAddressModel.test.ts`).
