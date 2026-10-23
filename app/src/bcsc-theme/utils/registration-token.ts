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

// IAS 401 `error_description` prefixes that prove the stored client ID can never refresh with this token. Every
// other 401 (bad signature, expired or future-dated assertion) can hit a working client ID, so must not trigger a switch.
const UNUSABLE_CLIENT_ID_MESSAGES = ['Could not find client', 'Client does not own the presented refresh token']

/** Whether the error's server text (AppError.technicalMessage) says the client ID is unknown or doesn't own the refresh token. */
export const isUnusableClientIdError = (error: unknown): boolean => {
  const technicalMessage = (error as { technicalMessage?: unknown } | null)?.technicalMessage
  return typeof technicalMessage === 'string' && UNUSABLE_CLIENT_ID_MESSAGES.some((m) => technicalMessage.startsWith(m))
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
