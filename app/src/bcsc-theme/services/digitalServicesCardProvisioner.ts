import { AutoFetchCredentialConfig } from '@/constants'
import { AutoCredentialRule } from '@/services/auto-credential'
import { Platform } from 'react-native'
import { getBundleId } from 'react-native-device-info'
import { getBCSCApiClient } from '../contexts/BCSCApiClientContext'

interface CreatePersonCredentialResponse {
  invitation_url: string
  has_active_credential?: boolean
}

/**
 * Mint a Person Credential issuer invitation via the BCSC-initiated flow.
 * The invitation is single-use and issued fresh per request, so this hits
 * `POST /credentials/v1/person` every time AutoCredentialMonitor decides a
 * Person Credential is missing. Environment selection is implicit — the
 * request goes to whichever IAS the currently-configured BCSC client points at,
 * and IAS mints an invitation whose cred def matches that env.
 *
 * A 400 `{error: "unauthorized_client", error_description: "suspended"|"deactivated"}`
 * (suspended/deactivated account, #3389) is handled by the api client's
 * onError policy (personCredentialAccountUnavailableErrorPolicy), which shows the
 * account-problem modal synchronously before this call's promise rejects.
 */
const getDigitalServicesCardInvitationUrl = async (): Promise<string> => {
  const apiClient = getBCSCApiClient()
  if (!apiClient) {
    throw new Error('BCSC client not ready — cannot request Person Credential invitation')
  }
  const response = await apiClient.post<CreatePersonCredentialResponse>(apiClient.endpoints.credential, {
    source_os: Platform.OS,
    source_application: getBundleId(),
  })
  return response.data.invitation_url
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
