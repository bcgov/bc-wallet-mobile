import { CredentialIdentityRecord } from './credential-repository'

describe('Credential Repository', () => {
  describe('CredentialIdentity', () => {
    it('parses a valid credential definition ID and schema ID', () => {
      const identity = new CredentialIdentityRecord(
        'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV',
        'XpgeQa93eZvGSZBZef3PHn:2:PersonDEV:1.0'
      )

      expect(identity.credDefId).toBe('XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV')
      expect(identity.schemaId).toBe('XpgeQa93eZvGSZBZef3PHn:2:PersonDEV:1.0')
      expect(identity.issuerDid).toBe('XpgeQa93eZvGSZBZef3PHn')
      expect(identity.schemaSeqNo).toBe('28075')
      expect(identity.tag).toBe('PersonDEV')
      expect(identity.schemaName).toBe('PersonDEV')
      expect(identity.schemaVersion).toBe('1.0')
    })

    it('throws when the credential definition ID does not have 5 parts', () => {
      expect(() => new CredentialIdentityRecord('too:few:parts', 'XpgeQa93eZvGSZBZef3PHn:2:PersonDEV:1.0')).toThrow(
        '[CredentialIdentity] Credential Definition ID is not in the expected format'
      )
    })

    it('throws when the schema ID does not have 4 parts', () => {
      expect(
        () => new CredentialIdentityRecord('XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV', 'too:many:parts:here:now')
      ).toThrow('[CredentialIdentity] Schema ID is not in the expected format')
    })
  })
})
