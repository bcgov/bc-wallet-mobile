/**
 * Credential definition record class that parses the credential definition ID into its components.
 * @class CredentialDefinitionRecord
 */
export class CredentialDefinitionRecord {
  credDefId: string
  issuerDid: string
  schemaSeqNo: number
  tag: string

  /**
   * @param credDefId - The credential definition ID in the format "issuerDid:3:CL:schemaSeqNo:tag"
   * @throws Error if the credential definition ID is not in the expected format
   */
  constructor(credDefId: string) {
    const parts = credDefId.split(':')

    if (parts.length !== 5) {
      throw new Error('[CredentialDefinitionRecord] Credential Definition ID is not in the expected format')
    }

    const [issuerDid, , , schemaSeqNo, tag] = parts

    this.credDefId = credDefId
    this.issuerDid = issuerDid
    this.schemaSeqNo = Number(schemaSeqNo)
    this.tag = tag
  }
}

/**
 * This class represents a credential schema record, which parses the schema ID into its components.
 * @class CredentialSchemaRecord
 */
export class CredentialSchemaRecord {
  schemaId: string
  issuerDid: string
  schemaName: string
  schemaVersion: string

  /**
   * @param schemaId - The schema ID in the format "issuerDid:2:schemaName:schemaVersion"
   * @throws Error if the schema ID is not in the expected format
   */
  constructor(schemaId: string) {
    const parts = schemaId.split(':')

    if (parts.length !== 4) {
      throw new Error('[CredentialSchemaRecord] Schema ID is not in the expected format')
    }

    const [issuerDid, , schemaName, schemaVersion] = parts

    this.schemaId = schemaId
    this.issuerDid = issuerDid
    this.schemaName = schemaName
    this.schemaVersion = schemaVersion
  }
}

/**
 * Credential identity class that combines a credential definition record and a credential schema record.
 * @class CredentialIdentity
 */
export class CredentialIdentity {
  credDefId: string
  schemaId: string
  issuerDid: string
  schemaIssuerDid: string
  schemaSeqNo: number
  schemaName: string
  schemaVersion: string
  tag: string

  /**
   * @param credDefId - The credential definition ID in the format "issuerDid:3:CL:schemaSeqNo:tag"
   * @param schemaId - The schema ID in the format "issuerDid:2:schemaName:schemaVersion"
   * @throws Error if the credential definition ID or schema ID is not in the expected format
   */
  constructor(credDefId: string, schemaId: string) {
    const credential = new CredentialDefinitionRecord(credDefId)
    const schema = new CredentialSchemaRecord(schemaId)

    this.credDefId = credential.credDefId
    this.schemaId = schema.schemaId
    this.issuerDid = credential.issuerDid
    this.schemaIssuerDid = schema.issuerDid
    this.schemaSeqNo = credential.schemaSeqNo
    this.schemaName = schema.schemaName
    this.schemaVersion = schema.schemaVersion
    this.tag = credential.tag
  }
}

// CREDENTIAL IDENTITY RECORDS

// Digital Services Card Credentials (Person credentials)
export const DigitalServicesCardCredentialIdentityDEV = new CredentialIdentity(
  'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV',
  'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0'
)
export const DigitalServicesCardCredentialIdentityQA = new CredentialIdentity(
  'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:PersonQA',
  'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0'
)
export const DigitalServicesCardCredentialIdentitySIT = new CredentialIdentity(
  '7xjfawcnyTUcduWVysLww5:3:CL:28075:PersonSIT',
  '7xjfawcnyTUcduWVysLww5:2:Person:1.0'
)
export const DigitalServicesCardCredentialIdentityPROD = new CredentialIdentity(
  'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
  'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0'
)
