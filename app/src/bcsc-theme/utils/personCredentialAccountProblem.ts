import { isAxiosAppError } from '@/errors/appError'

export type PersonCredentialAccountProblem = 'suspended' | 'deactivated'

/**
 * Detects a 400 `{error: "unauthorized_client", error_description: "suspended"|"deactivated"}`
 * response from `POST /credentials/v1/person` (#3389). Suspend/deactivate has no push
 * notification or ID token signal — this API error is the only place it surfaces. Shared by
 * `personCredentialAccountUnavailableErrorPolicy` (navigates to the account-problem screen) and
 * `AutoCredentialMonitor` (declines the now-unsatisfiable triggering proof request).
 *
 * Lives outside digitalServicesCardProvisioner.ts to avoid a circular import: that file pulls in
 * BCSCApiClientContext, which itself imports clientErrorPolicies.
 */
export const getPersonCredentialAccountProblem = (error: unknown): PersonCredentialAccountProblem | undefined => {
  if (!isAxiosAppError(error, 400)) {
    return undefined
  }
  const description = (error.cause.response?.data as { error_description?: unknown } | undefined)?.error_description
  if (typeof description !== 'string') {
    return undefined
  }
  const reason = description.toLowerCase()
  if (reason.includes('suspended')) {
    return 'suspended'
  }
  if (reason.includes('deactivated')) {
    return 'deactivated'
  }
  return undefined
}
