import { getCredentialDefinitionIdForRecord } from '@bifold/core'
import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'

/**
 * Checks if the given credential has a credential definition ID that matches any of the provided credential definition IDs.
 *
 * @param credential - Optional credential record to check.
 * @param credentialDefinitionIds - An array of credential definition IDs to check against.
 * @returns A boolean indicating whether the credential has a matching credential definition ID.
 */
export function hasCredentialDefinitionId(
  credential: DidCommCredentialExchangeRecord | undefined,
  credentialDefinitionIds: string[]
): boolean {
  if (!credential) {
    return false
  }

  const credentialDefinitionId = getCredentialDefinitionIdForRecord(credential)

  if (!credentialDefinitionId) {
    return false
  }

  return credentialDefinitionIds.includes(credentialDefinitionId)
}
