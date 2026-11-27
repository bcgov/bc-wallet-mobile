import { getCredentialDefinitionIdForRecord } from '@bifold/core'
import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'

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
