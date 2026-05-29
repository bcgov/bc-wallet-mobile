import { AccountIDCredentialConfig, CredentialRestrictionEnvironment } from '@/constants'
import { AutoCredentialRule } from '@/services/auto-credential'
import { DidCommProofExchangeRecord } from '@credo-ts/didcomm'
import { BCAgent } from '@utils/bc-agent-modules'

/**
 * Finds which DigitalServicesCard environment config matches the cred def IDs present in
 * the incoming proof's restrictions, and returns its invitation URL.
 *
 * This mirrors the `invitationUrlFromRestrictions` pattern used by the
 * AttestationMonitor — the issuer URL is derived from the proof itself so the
 * correct environment is always selected automatically.
 */
const getDigitalServicesCardInvitationUrl = async (
  proof: DidCommProofExchangeRecord,
  agent: BCAgent
): Promise<string> => {
  const format = await agent.didcomm.proofs.getFormatData(proof.id)
  const requestFormat = (format.request?.anoncreds ?? format.request?.indy) as
    | {
        requested_attributes?: Record<string, { restrictions?: { cred_def_id?: string }[] }>
        requested_predicates?: Record<string, { restrictions?: { cred_def_id?: string }[] }>
      }
    | undefined

  if (!requestFormat) {
    throw new Error('Could not read proof request format to determine DigitalServicesCard issuer URL')
  }

  const allRestrictions = [
    ...Object.values(requestFormat.requested_attributes ?? {}).flatMap((a) => a.restrictions ?? []),
    ...Object.values(requestFormat.requested_predicates ?? {}).flatMap((p) => p.restrictions ?? []),
  ]

  for (const env of Object.values(AccountIDCredentialConfig)) {
    for (const restriction of allRestrictions) {
      if (
        restriction.cred_def_id &&
        (env as CredentialRestrictionEnvironment).credDefIDs.includes(restriction.cred_def_id)
      ) {
        return (env as CredentialRestrictionEnvironment).invitationUrl
      }
    }
  }

  throw new Error('No matching DigitalServicesCard issuer found for the proof request restrictions')
}

/**
 * All DigitalServicesCard cred def IDs across all environments, flattened into a single
 * array for use as the `triggerCredDefIds` of the AutoCredentialRule.
 */
const allDigitalServicesCardCredDefIds = (): string[] =>
  Object.values(AccountIDCredentialConfig).flatMap((env) => [...(env as CredentialRestrictionEnvironment).credDefIDs])

/**
 * Builds the AutoCredentialRule for the DigitalServicesCard just-in-time workflow
 */
export const buildDigitalServicesCardCredentialRule = (): AutoCredentialRule => ({
  triggerCredDefIds: allDigitalServicesCardCredDefIds(),
  getInvitationUrl: getDigitalServicesCardInvitationUrl,
  autoAcceptIssuerProofRequest: true,
  autoAcceptCredentialOffer: true,
})
