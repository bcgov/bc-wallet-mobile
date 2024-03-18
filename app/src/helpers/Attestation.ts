import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import { CredentialExchangeRecord, ProofExchangeRecord } from '@aries-framework/core'
import { BifoldAgent } from '@hyperledger/aries-bifold-core'

export const attestationCredDefIds = [
  'NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet',
  'RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet',
  'XqaRXJt4sXE6TRpfGpVbGw:3:CL:655:bcwallet',
]

// proof requests can vary wildly but we'll know attestation requests
// must contain the cred def id as a restriction
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

// When we get an attestation proof request:
// 1. Do we have any attestation credentials?
// NO: We need to start the attestation workflow
// YES: Do the credentials satisfy the proof request?
// NO: We need to start the attestation workflow
// YES: Accept the proof request

// '523bb280-7aaf-45b6-91b9-9cae8509d024'
export const doWeNeedToGetAnAttestationCredential = async (agent: BifoldAgent, proofId: string): Promise<boolean> => {
  const proof = await agent?.proofs.getById(proofId)
  const isAttestation = await isProofRequestingAttestation(proof, agent, attestationCredDefIds)

  if (!isAttestation) {
    return false
  }

  const credentials = await getAvailableAttestationCredentials(agent, attestationCredDefIds)

  if (credentials.length === 0) {
    return true
  }

  // Does the credential satisfy the proof request?
  // YES? return false
  // NO? return true

  return true
}

//   const fullCredentials = useCredentials().records

export const hasCredentialsForProof = async (agent: BifoldAgent, proof: ProofExchangeRecord) => {
  try {
    const format = await agent.proofs.getFormatData(proof.id)
    const hasAnonCreds = format.request?.anoncreds !== undefined
    const hasIndy = format.request?.indy !== undefined
    const credentials = await agent.proofs.getCredentialsForRequest({
      proofRecordId: proof.id,
      proofFormats: {
        // FIXME: AFJ will try to use the format, even if the value is undefined (but the key is present)
        // We should ignore the key, if the value is undefined. For now this is a workaround.
        ...(hasIndy
          ? {
              indy: {
                // Setting `filterByNonRevocationRequirements` to `false` returns all
                // credentials even if they are revokable (and revoked).
                filterByNonRevocationRequirements: true,
              },
            }
          : {}),

        ...(hasAnonCreds
          ? {
              anoncreds: {
                // Setting `filterByNonRevocationRequirements` to `false` returns all
                // credentials even if they are revokable (and revoked).
                filterByNonRevocationRequirements: true,
              },
            }
          : {}),
      },
    })

    if (!credentials || !format) {
      throw new Error('Requested credentials could not be found ')
    }

    return true
  } catch (err: unknown) {
    console.error('Error retrieving credentials for proof', err)
  }
}
