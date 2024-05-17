import {
  AnonCredsCredentialInfo,
  AnonCredsPredicateType,
  AnonCredsRequestedAttributeMatch,
  AnonCredsRequestedPredicateMatch,
} from '@credo-ts/anoncreds'
import { CredentialExchangeRecord, ProofExchangeRecord, GetCredentialsForProofRequestReturn } from '@credo-ts/core'
import { BifoldAgent } from '@hyperledger/aries-bifold-core'
import { Attribute, Predicate } from '@hyperledger/aries-oca/build/legacy'

export type Fields = Record<string, AnonCredsRequestedAttributeMatch[] | AnonCredsRequestedPredicateMatch[]>

export type ProofCredentialItems = ProofCredentialAttributes & ProofCredentialPredicates

export type ProofCredentialAttributes = {
  altCredentials?: string[]
  credExchangeRecord?: CredentialExchangeRecord
  credId: string
  credDefId?: string
  proofCredDefId?: string
  schemaId?: string
  proofSchemaId?: string
  credName: string
  attributes?: Attribute[]
}

export type ProofCredentialPredicates = {
  altCredentials?: string[]
  credExchangeRecord?: CredentialExchangeRecord
  credId: string
  credDefId?: string
  proofCredDefId?: string
  schemaId?: string
  proofSchemaId?: string
  credName: string
  predicates?: Predicate[]
}

/**
 * Evaluate if given attribute value satisfies the predicate.
 * @param attribute Credential attribute value
 * @param pValue Predicate value
 * @param pType Predicate type ({@link AnonCredsPredicateType})
 * @returns `true`if predicate is satisfied, otherwise `false`
 */
const evaluateOperation = (attribute: number, pValue: number, pType: AnonCredsPredicateType): boolean => {
  if (pType === '>=') {
    return attribute >= pValue
  }

  if (pType === '>') {
    return attribute > pValue
  }

  if (pType === '<=') {
    return attribute <= pValue
  }
  if (pType === '<') {
    return attribute < pValue
  }

  return false
}

/**
 * Retrieve current credentials info filtered by `credentialDefinitionId` if given.
 * @param credDefId Credential Definition Id
 * @returns Array of `AnonCredsCredentialInfo`
 */
export const getCredentialInfo = (credId: string, fields: Fields): AnonCredsCredentialInfo[] => {
  const credentialInfo: AnonCredsCredentialInfo[] = []

  Object.keys(fields).forEach((proofKey) => {
    credentialInfo.push(...fields[proofKey].map((attr) => attr.credentialInfo))
  })

  return !credId ? credentialInfo : credentialInfo.filter((cred) => cred.credentialId === credId)
}

/**
 * Given proof credential items, evaluate and return its predicates,
 * setting `satisfied` property.
 * @param proofCredentialsItems
 * @returns Array of evaluated predicates
 */
export const evaluatePredicates =
  (fields: Fields, credId?: string) =>
  (proofCredentialItems: ProofCredentialItems): Predicate[] => {
    const predicates = proofCredentialItems.predicates
    if (!predicates || predicates.length == 0) {
      return []
    }

    if ((credId && credId != proofCredentialItems.credId) || !proofCredentialItems.credId) {
      return []
    }

    const credentialAttributes = getCredentialInfo(proofCredentialItems.credId, fields).map((ci) => ci.attributes)

    return predicates.map((predicate: Predicate) => {
      const { pType, pValue, name: field } = predicate
      let satisfied = false

      if (field) {
        const attribute = credentialAttributes.find((attr) => attr[field] != undefined)?.[field]
        if (attribute && pValue) {
          satisfied = evaluateOperation(Number(attribute), Number(pValue), pType as AnonCredsPredicateType)
        }
      }

      return { ...predicate, satisfied }
    })
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
