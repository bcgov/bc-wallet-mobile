import { isAxiosAppError } from '@/errors/appError'

export type DigitalServiceCardAccountProblem = 'suspended' | 'deactivated'

/**
 * Detects a 400 `{error: "unauthorized_client", error_description: "suspended"|"deactivated"}`
 * response from the Person Credential endpoint (`/credentials/v1/person`). Suspend/deactivate has no push
 * notification or ID token signal.
 */
export const getDigitalServiceCardAccountProblem = (error: unknown): DigitalServiceCardAccountProblem | undefined => {
  if (!isAxiosAppError(error, 400)) {
    return undefined
  }
  const data = error.cause.response?.data as { error?: unknown; error_description?: unknown } | undefined
  if (data?.error !== 'unauthorized_client') {
    return undefined
  }
  const description = data.error_description
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
