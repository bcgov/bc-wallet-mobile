import { AutoFetchCredentialConfig } from '@/constants'
import { AppError, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { getBCSCApiClient } from '@bcsc-theme/contexts/BCSCApiClientContext'
import { buildDigitalServicesCardCredentialRule } from '@bcsc-theme/services/digitalServicesCardProvisioner'
import { Platform } from 'react-native'
import { getBundleId } from 'react-native-device-info'

/** Minimal stand-in for an axios 400 response with an IAS-style OAuth error body. */
const accountUnavailableAxiosError = (errorDescription: string) => ({
  isAxiosError: true,
  name: 'AxiosError',
  message: errorDescription,
  response: {
    status: 400,
    data: { error: 'unauthorized_client', error_description: errorDescription },
  },
})

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

    it('rethrows a suspended-account 400 as AUTO_CRED_ACCOUNT_SUSPENDED', async () => {
      const cause = accountUnavailableAxiosError('suspended')
      const post = jest
        .fn()
        .mockRejectedValue(AppError.fromErrorDefinition(ErrorRegistry.UNKNOWN_SERVER_ERROR, { cause, track: false }))
      mockedGetBCSCApiClient.mockReturnValue({ endpoints: { credential: '/credentials/v1/person' }, post })

      const rule = buildDigitalServicesCardCredentialRule()
      let caught: unknown
      try {
        await rule.getInvitationUrl({} as any, {} as any)
      } catch (err) {
        caught = err
      }

      expect(caught).toBeInstanceOf(AppError)
      expect((caught as AppError).appEvent).toBe(AppEventCode.AUTO_CRED_ACCOUNT_SUSPENDED)
      expect((caught as AppError).cause).toBe(cause)
    })

    it('rethrows a deactivated-account 400 as AUTO_CRED_ACCOUNT_DEACTIVATED', async () => {
      const cause = accountUnavailableAxiosError('deactivated')
      const post = jest
        .fn()
        .mockRejectedValue(AppError.fromErrorDefinition(ErrorRegistry.UNKNOWN_SERVER_ERROR, { cause, track: false }))
      mockedGetBCSCApiClient.mockReturnValue({ endpoints: { credential: '/credentials/v1/person' }, post })

      const rule = buildDigitalServicesCardCredentialRule()
      let caught: unknown
      try {
        await rule.getInvitationUrl({} as any, {} as any)
      } catch (err) {
        caught = err
      }

      expect(caught).toBeInstanceOf(AppError)
      expect((caught as AppError).appEvent).toBe(AppEventCode.AUTO_CRED_ACCOUNT_DEACTIVATED)
    })

    it('rethrows an unrelated 400 unchanged', async () => {
      const cause = accountUnavailableAxiosError('some_other_reason')
      const original = AppError.fromErrorDefinition(ErrorRegistry.UNKNOWN_SERVER_ERROR, { cause, track: false })
      const post = jest.fn().mockRejectedValue(original)
      mockedGetBCSCApiClient.mockReturnValue({ endpoints: { credential: '/credentials/v1/person' }, post })

      const rule = buildDigitalServicesCardCredentialRule()
      await expect(rule.getInvitationUrl({} as any, {} as any)).rejects.toBe(original)
    })
  })
})
