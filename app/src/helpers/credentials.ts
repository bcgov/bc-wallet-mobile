import {
  AnonCredsCredentialInfo,
  AnonCredsPredicateType,
  AnonCredsRequestedAttributeMatch,
  AnonCredsRequestedPredicateMatch,
} from '@aries-framework/anoncreds'
import { CredentialExchangeRecord } from '@aries-framework/core'
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
