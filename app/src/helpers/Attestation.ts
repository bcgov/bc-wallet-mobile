import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import {
  CredentialExchangeRecord,
  ProofExchangeRecord,
  GetCredentialsForProofRequestReturn,
} from '@aries-framework/core'
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

export interface AttestationCredentialFormat {
  attributes: {
    attestationInfo: []
  }
}

/**
 * Determine the format of the proof request
 *
 * Setting `filterByNonRevocationRequirements` to `false` returns all credentials
 * even if they are revokable and revoked.
 *
 * @param agent
 * @param proofId
 * @param filterByNonRevocationRequirements
 * @returns The Anoncreds or Indy proof format object
 */
const formatForProofWithId = async (agent: BifoldAgent, proofId: string, filterByNonRevocationRequirements = false) => {
  const format = await agent.proofs.getFormatData(proofId)
  const proofIsAnoncredsFormat = format.request?.anoncreds !== undefined
  const proofIsIndycredsFormat = format.request?.indy !== undefined
  const proofFormats = {
    // FIXME: AFJ will try to use the format, even if the value is undefined (but the key is present)
    // We should ignore the key, if the value is undefined. For now this is a workaround.
    ...(proofIsIndycredsFormat
      ? {
          indy: {
            filterByNonRevocationRequirements,
          },
        }
      : {}),

    ...(proofIsAnoncredsFormat
      ? {
          anoncreds: {
            filterByNonRevocationRequirements,
          },
        }
      : {}),
  }

  if (!proofFormats) {
    throw new Error('Unable to lookup proof request format')
  }

  return proofFormats
}

/**
 * This function checks if the proof request is asking for an attestation
 *
 * This is a basic check to see if a proof request is asking for an attestation
 * based on the credential definition ID in the proof request.
 *
 * @param proof The proof request
 * @param agent The AFJ agent
 * @returns True if the proof request is asking for an attestation
 */
export const isProofRequestingAttestation = async (
  proof: ProofExchangeRecord,
  agent: BifoldAgent
): Promise<boolean> => {
  const format = (await agent.proofs.getFormatData(proof.id)) as unknown as AttestationProofRequestFormat
  const formatToUse = format.request?.anoncreds ? 'anoncreds' : 'indy'

  return !!format.request?.[formatToUse]?.requested_attributes?.attestationInfo?.restrictions?.some((rstr) =>
    attestationCredDefIds.includes(rstr.cred_def_id)
  )
}

/**
 * This function retrieves all available attestation credentials
 *
 * @param agent The AFJ agent
 * @param attestationCredDefIds Cred def IDs for used attestation
 * @returns All available attestation credentials
 */
export const getAvailableAttestationCredentials = async (agent: BifoldAgent): Promise<CredentialExchangeRecord[]> => {
  const credentials = await agent.credentials.getAll()

  return credentials.filter((record) => {
    const credDefId = record.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId
    return !record.revocationNotification && credDefId && attestationCredDefIds.includes(credDefId)
  })
}

/**
 * Check if existing credentials satisfy the proof request
 *
 * Detailed check if we have the necessary credentials to fulfill the
 * proof request in the required format.
 *
 * @param agent The AFJ agent
 * @param proof The proof request
 * @param filterByNonRevocationRequirements Whether to filter by non-revocation requirements
 * @returns Credentials that match the given proof request
 * @throws {Error} Will throw an error if a problem looking up data occurs
 */
export const credentialsMatchForProof = async (
  agent: BifoldAgent,
  proof: ProofExchangeRecord,
  filterByNonRevocationRequirements = true
): Promise<GetCredentialsForProofRequestReturn> => {
  const proofFormats = await formatForProofWithId(agent, proof.id, filterByNonRevocationRequirements)
  const credentials = await agent.proofs.getCredentialsForRequest({
    proofRecordId: proof.id,
    proofFormats,
  })

  if (!credentials) {
    throw new Error('Unable to lookup credentials for proof request')
  }

  return credentials
}

/**
 * This function checks if we need to get an attestation credential
 *
 * In-depth check to see if we need to get an attestation credential done by
 * checking if the proof request is asking for an attestation and if we have
 * the necessary credentials to fulfill the request.
 *
 * @param agent The AFJ agent
 * @param proofId The proof request ID
 * @returns True if we need to get an attestation credential
 * @throws {Error} Will throw an error if a problem looking up data occurs
 */
export const attestationCredentialRequired = async (agent: BifoldAgent, proofId: string): Promise<boolean> => {
  agent.config.logger.info('Attestation: fetching proof by id')
  const proof = await agent?.proofs.getById(proofId)
  agent.config.logger.info('Attestation: second check if proof is requesting attestation')
  const isAttestation = await isProofRequestingAttestation(proof, agent)

  if (!isAttestation) {
    return false
  }

  agent.config.logger.info('Attestation: checking if credentials match for proof request')
  const credentials = await credentialsMatchForProof(agent, proof)

  if (!credentials) {
    return true
  }

  // TODO:(jl) Should we be checking the length of the attributes matches some
  // expected length in the proof request?
  const format = (credentials.proofFormats.anoncreds ?? credentials.proofFormats.indy) as AttestationCredentialFormat
  if (format) {
    return format.attributes.attestationInfo.length === 0
  }

  return false
}
