import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import { CredentialExchangeRecord, ProofExchangeRecord } from '@aries-framework/core'
import { BifoldAgent } from '@hyperledger/aries-bifold-core'

export const attestationCredDefIds = [
  'NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet',
  'RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet',
  'XqaRXJt4sXE6TRpfGpVbGw:3:CL:655:bcwallet',
]

// proof requests can vary wildly but we'll know attestation requests must contain the cred def id as a restriction
interface IndyRequest {
  indy: {
    requested_attributes?: {
      attestationInfo?: {
        names: string[]
        restrictions: { cred_def_id: string }[]
      }
    }
  }
}

// same as above
interface AnonCredsRequest {
  anoncreds: {
    requested_attributes?: {
      attestationInfo?: {
        names: string[]
        restrictions: { cred_def_id: string }[]
      }
    }
  }
}

export interface AttestationProofRequestFormat {
  request: IndyRequest & AnonCredsRequest
}

export const isProofRequestingAttestation = async (
  proof: ProofExchangeRecord,
  agent: BifoldAgent,
  attestationCredDefIds: string[]
): Promise<boolean> => {
  const format = (await agent.proofs.getFormatData(proof.id)) as unknown as AttestationProofRequestFormat
  const formatToUse = format.request?.anoncreds ? 'anoncreds' : 'indy'
  return !!format.request?.[formatToUse]?.requested_attributes?.attestationInfo?.restrictions?.some((rstr) =>
    attestationCredDefIds.includes(rstr.cred_def_id)
  )
}

export const getAvailableAttestationCredentials = async (
  agent: BifoldAgent,
  attestationCredDefIds: string[]
): Promise<CredentialExchangeRecord[]> => {
  const credentials = await agent.credentials.getAll()
  return credentials.filter((record) => {
    const credDefId = record.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId
    return !record.revocationNotification && credDefId && attestationCredDefIds.includes(credDefId)
  })
}
