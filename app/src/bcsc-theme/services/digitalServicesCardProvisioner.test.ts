import { AutoFetchCredentialConfig } from '@/constants'
import { getBCSCApiClient } from '@bcsc-theme/contexts/BCSCApiClientContext'
import { buildDigitalServicesCardCredentialRule } from '@bcsc-theme/services/digitalServicesCardProvisioner'
import { Platform } from 'react-native'
import { getBundleId } from 'react-native-device-info'

jest.mock('@bcsc-theme/contexts/BCSCApiClientContext', () => ({
  getBCSCApiClient: jest.fn(),
}))

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(),
}))

const mockedGetBCSCApiClient = getBCSCApiClient as jest.Mock
const mockedGetBundleId = getBundleId as jest.Mock

describe('digitalServicesCardProvisioner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Platform.OS = 'ios'
    mockedGetBundleId.mockReturnValue('ca.bc.gov.iddev.servicescard')
  })

  describe('buildDigitalServicesCardCredentialRule', () => {
    it('flattens every cred def ID from AutoFetchCredentialConfig into triggerCredDefIds', () => {
      const rule = buildDigitalServicesCardCredentialRule()
      const expected = Object.values(AutoFetchCredentialConfig).flatMap((env) => [...env.credDefIDs])
      expect(rule.triggerCredDefIds).toEqual(expect.arrayContaining(expected))
      expect(rule.triggerCredDefIds).toHaveLength(expected.length)
    })

    it('defaults autoAcceptIssuerProofRequest and autoAcceptCredentialOffer to true', () => {
      const rule = buildDigitalServicesCardCredentialRule()
      expect(rule.autoAcceptIssuerProofRequest).toBe(true)
      expect(rule.autoAcceptCredentialOffer).toBe(true)
    })
  })

  describe('getInvitationUrl (via rule)', () => {
    it('throws when the BCSC api client is not ready', async () => {
      mockedGetBCSCApiClient.mockReturnValue(null)
      const rule = buildDigitalServicesCardCredentialRule()
      await expect(rule.getInvitationUrl({} as any, {} as any)).rejects.toThrow(/client not ready/i)
    })

    it('POSTs to the credential endpoint with source_os + source_application and returns invitation_url', async () => {
      const post = jest.fn().mockResolvedValue({ data: { invitation_url: 'https://issuer.example?c_i=abc' } })
      mockedGetBCSCApiClient.mockReturnValue({
        endpoints: { credential: '/credentials/v1/person' },
        post,
      })

      const rule = buildDigitalServicesCardCredentialRule()
      const url = await rule.getInvitationUrl({} as any, {} as any)

      expect(post).toHaveBeenCalledWith('/credentials/v1/person', {
        source_os: 'ios',
        source_application: 'ca.bc.gov.iddev.servicescard',
      })
      expect(url).toBe('https://issuer.example?c_i=abc')
    })
  })
})
