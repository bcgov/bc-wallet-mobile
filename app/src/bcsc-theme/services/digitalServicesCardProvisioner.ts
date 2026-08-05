import { DIGITAL_SERVICES_CARD_CREDENTIAL_IDENTITY_RECORDS } from '@/constants'
import { AutoCredentialRule } from '@/services/auto-credential'
import { AnonCredsProofRequestRestriction } from '@credo-ts/anoncreds'
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
 * All DigitalServicesCard proof restrictions across all environments, flattened into a single
 * array for use as the `triggerRestrictions` of the AutoCredentialRule.
 */
export const allDigitalServicesCardProofRestrictions = (): AnonCredsProofRequestRestriction[] => {
  const triggerRestrictions: AnonCredsProofRequestRestriction[] = []

  DIGITAL_SERVICES_CARD_CREDENTIAL_IDENTITY_RECORDS.map((identity) => {
    // 1. Add a restriction for the credential definition ID
    triggerRestrictions.push({
      cred_def_id: identity.credDefId,
    })

    //2. Add a restriction for the schema ID
    triggerRestrictions.push({
      schema_id: identity.schemaId,
    })

    // 3. Add a restriction for schema shape (issuer DID, schema name, schema version)
    triggerRestrictions.push({
      schema_name: identity.schemaName,
      schema_version: identity.schemaVersion,
      issuer_did: identity.issuerDid,
    })
  })

  return triggerRestrictions
}

/**
 * Builds the AutoCredentialRule for the DigitalServicesCard just-in-time workflow
 */
export const buildDigitalServicesCardCredentialRule = (): AutoCredentialRule => ({
  triggerRestrictions: allDigitalServicesCardProofRestrictions(),
  getInvitationUrl: getDigitalServicesCardInvitationUrl,
  autoAcceptIssuerProofRequest: true,
  autoAcceptCredentialOffer: true,
})
