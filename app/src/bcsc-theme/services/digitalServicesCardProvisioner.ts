import { AutoFetchCredentialConfig } from '@/constants'
import { AppError, ErrorRegistry } from '@/errors'
import { isAxiosAppError } from '@/errors/appError'
import { AutoCredentialRule } from '@/services/auto-credential'
import { Platform } from 'react-native'
import { getBundleId } from 'react-native-device-info'
import { getBCSCApiClient } from '../contexts/BCSCApiClientContext'

interface CreatePersonCredentialResponse {
  invitation_url: string
  has_active_credential?: boolean
}

/**
 * Re-throws a 400 `{error: "unauthorized_client", error_description: "suspended"|"deactivated"}`
 * response from `/credentials/v1/person` as a distinguishable AppError, so
 * PersonCredentialLoading can route to the account-unavailable screen instead of
 * its generic failure handling. See #3389 — suspend/unsuspend has no push
 * notification or ID token signal; this API error is the only place it surfaces.
 */
const rethrowIfAccountUnavailable = (err: unknown): never => {
  if (isAxiosAppError(err, 400)) {
    const description = (err.cause.response?.data as { error_description?: unknown } | undefined)?.error_description
    if (typeof description === 'string') {
      const reason = description.toLowerCase()
      if (reason.includes('suspended')) {
        throw AppError.fromErrorDefinition(ErrorRegistry.AUTO_CRED_ACCOUNT_SUSPENDED, { cause: err.cause })
      }
      if (reason.includes('deactivated')) {
        throw AppError.fromErrorDefinition(ErrorRegistry.AUTO_CRED_ACCOUNT_DEACTIVATED, { cause: err.cause })
      }
    }
  }
  throw err
}

/**
 * Mint a Person Credential issuer invitation via the BCSC-initiated flow.
 * The invitation is single-use and issued fresh per request, so this hits
 * `POST /credentials/v1/person` every time AutoCredentialMonitor decides a
 * Person Credential is missing. Environment selection is implicit — the
 * request goes to whichever IAS the currently-configured BCSC client points at,
 * and IAS mints an invitation whose cred def matches that env.
 */
const getDigitalServicesCardInvitationUrl = async (): Promise<string> => {
  const apiClient = getBCSCApiClient()
  if (!apiClient) {
    throw new Error('BCSC client not ready — cannot request Person Credential invitation')
  }
  try {
    const response = await apiClient.post<CreatePersonCredentialResponse>(apiClient.endpoints.credential, {
      source_os: Platform.OS,
      source_application: getBundleId(),
    })
    return response.data.invitation_url
  } catch (err) {
    return rethrowIfAccountUnavailable(err)
  }
}

/**
 * All DigitalServicesCard cred def IDs across all environments, flattened into a single
 * array for use as the `triggerCredDefIds` of the AutoCredentialRule.
 */
const allDigitalServicesCardCredDefIds = (): string[] =>
  Object.values(AutoFetchCredentialConfig).flatMap((env) => [...env.credDefIDs])

/**
 * Builds the AutoCredentialRule for the DigitalServicesCard just-in-time workflow
 */
export const buildDigitalServicesCardCredentialRule = (): AutoCredentialRule => ({
  triggerCredDefIds: allDigitalServicesCardCredDefIds(),
  getInvitationUrl: getDigitalServicesCardInvitationUrl,
  autoAcceptIssuerProofRequest: true,
  autoAcceptCredentialOffer: true,
})
