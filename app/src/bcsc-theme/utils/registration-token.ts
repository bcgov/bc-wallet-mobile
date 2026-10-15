import { jwtDecode } from 'jwt-decode'
import BCSCApiClient from '../api/client'

export const REGISTRATION_CONFIRMATION_TIMEOUT_MS = 5000

export type RegistrationConfirmation =
  | { status: 'confirmed' | 'client_id_mismatch'; newRegistrationAccessToken?: string }
  | { status: 'request_failed'; httpStatus?: number }

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
    const { data } = await apiClient.get<{ client_id?: unknown; registration_access_token?: unknown }>(
      `${apiClient.endpoints.registration}/${clientId}`,
      {
        skipBearerAuth: true,
        // A rejected probe must not raise the global error popup this check exists to stop.
        skipOnErrorHandler: true,
        headers: { Authorization: `Bearer ${registrationAccessToken}` },
        timeout: REGISTRATION_CONFIRMATION_TIMEOUT_MS,
      }
    )

    const rotated = data?.registration_access_token
    const newRegistrationAccessToken = typeof rotated === 'string' && rotated.length > 0 ? rotated : undefined

    return {
      status: data?.client_id === clientId ? 'confirmed' : 'client_id_mismatch',
      newRegistrationAccessToken,
    }
  } catch (error) {
    const httpStatus = (error as { context?: { http_status?: unknown } } | null)?.context?.http_status
    return { status: 'request_failed', httpStatus: typeof httpStatus === 'number' ? httpStatus : undefined }
  }
}
