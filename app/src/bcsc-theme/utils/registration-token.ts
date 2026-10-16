import { jwtDecode } from 'jwt-decode'
import BCSCApiClient from '../api/client'
import { fetchRegistrationView } from './key-recovery'

export const REGISTRATION_CONFIRMATION_TIMEOUT_MS = 5000

export type RegistrationConfirmation =
  | { status: 'confirmed' | 'client_id_mismatch'; newRegistrationAccessToken?: string }
  | { status: 'request_failed'; httpStatus?: number }

/** HTTP status carried on an AppError's context; undefined for network errors, timeouts and non-HTTP errors. */
export const getErrorHttpStatus = (error: unknown): number | undefined => {
  const httpStatus = (error as { context?: { http_status?: unknown } } | null)?.context?.http_status
  return typeof httpStatus === 'number' ? httpStatus : undefined
}

/**
 * Client ID the registration access token was issued for (its `aud`). Returns undefined when `aud`
 * is missing, malformed or multi-valued. Never throws. These tokens carry no `exp`, so expiry is not checked.
 */
export const getRegistrationTokenClientId = (registrationAccessToken?: string): string | undefined => {
  if (!registrationAccessToken) {
    return undefined
  }

  try {
    const { aud } = jwtDecode(registrationAccessToken)
    const candidate = Array.isArray(aud) && aud.length === 1 ? aud[0] : aud
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined
  } catch {
    return undefined
  }
}

/**
 * Asks the server for the registration `clientId` using the token (GET /device/register/{clientId}) and reports
 * whether the registration it describes is that client ID. Bounded by a timeout; never throws.
 */
export const confirmRegistrationClientId = async (
  apiClient: BCSCApiClient,
  clientId: string,
  registrationAccessToken: string
): Promise<RegistrationConfirmation> => {
  try {
    const { data } = await fetchRegistrationView(
      apiClient,
      clientId,
      registrationAccessToken,
      REGISTRATION_CONFIRMATION_TIMEOUT_MS
    )

    const rotated = data?.registration_access_token
    const newRegistrationAccessToken = typeof rotated === 'string' && rotated.length > 0 ? rotated : undefined

    return {
      status: data?.client_id === clientId ? 'confirmed' : 'client_id_mismatch',
      newRegistrationAccessToken,
    }
  } catch (error) {
    return { status: 'request_failed', httpStatus: getErrorHttpStatus(error) }
  }
}
