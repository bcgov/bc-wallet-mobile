export class CredentialIdentity {
  credDefId: string
  schemaId: string
  issuerDid: string
  schemaSeqNo: string
  schemaName: string
  schemaVersion: string
  tag: string

  constructor(credDefId: string, schemaId: string) {
    const [credIssuerDid, , , schemaSeqNo, tag] = credDefId.split(':')
    const [schemaIssuerDid, , schemaName, schemaVersion] = schemaId.split(':')

    if (credIssuerDid !== schemaIssuerDid) {
      throw new Error(
        `Issuer DID mismatch between credential definition and schema: ${credIssuerDid} !== ${schemaIssuerDid}`
      )
    }

    this.credDefId = credDefId
    this.schemaId = schemaId
    this.issuerDid = credIssuerDid
    this.schemaSeqNo = schemaSeqNo
    this.schemaName = schemaName
    this.schemaVersion = schemaVersion
    this.tag = tag
  }
}

// Digital Services Card Credentials (Person credentials)
export const DigitalServicesCardCredentialDEV = new CredentialIdentity(
  'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV',
  'XpgeQa93eZvGSZBZef3PHn:2:PersonDEV:1.0'
)
export const DigitalServicesCardCredentialQA = new CredentialIdentity(
  'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:PersonQA',
  'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0'
)
export const DigitalServicesCardCredentialSIT = new CredentialIdentity(
  '7xjfawcnyTUcduWVysLww5:3:CL:28075:PersonSIT',
  '7xjfawcnyTUcduWVysLww5:2:Person:1.0'
)
export const DigitalServicesCardCredentialPROD = new CredentialIdentity(
  'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
  'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person'
)
