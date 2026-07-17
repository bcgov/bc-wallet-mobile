import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'
import { hasCredentialDefinitionId } from './credential-utils'

describe('hasCredentialDefinitionId', () => {
  it('should return false when credential is undefined', () => {
    expect(hasCredentialDefinitionId(undefined, ['cred-def-id-1'])).toBe(false)
  })

  it('should return false when the record has no anoncreds metadata', () => {
    const credential = {
      metadata: { get: jest.fn().mockReturnValue(undefined) },
    } as unknown as DidCommCredentialExchangeRecord

    expect(hasCredentialDefinitionId(credential, ['cred-def-id-1'])).toBe(false)
  })

  it('should return false when the credential definition ID does not match any provided IDs', () => {
    const credential = {
      metadata: { get: jest.fn().mockReturnValue({ credentialDefinitionId: 'cred-def-id-other' }) },
    } as unknown as DidCommCredentialExchangeRecord

    expect(hasCredentialDefinitionId(credential, ['cred-def-id-1', 'cred-def-id-2'])).toBe(false)
  })

  it('should return false when the provided ID list is empty', () => {
    const credential = {
      metadata: { get: jest.fn().mockReturnValue({ credentialDefinitionId: 'cred-def-id-1' }) },
    } as unknown as DidCommCredentialExchangeRecord

    expect(hasCredentialDefinitionId(credential, [])).toBe(false)
  })

  it('should return true when the credential definition ID matches a provided ID', () => {
    const credential = {
      metadata: { get: jest.fn().mockReturnValue({ credentialDefinitionId: 'cred-def-id-2' }) },
    } as unknown as DidCommCredentialExchangeRecord

    expect(hasCredentialDefinitionId(credential, ['cred-def-id-1', 'cred-def-id-2'])).toBe(true)
  })
})
