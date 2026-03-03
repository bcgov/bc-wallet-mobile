import * as useApi from '@/bcsc-theme/api/hooks/useApi'
import * as useBCSCApiClient from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import * as tokens from '@/bcsc-theme/utils/push-notification-tokens'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { mockAppError } from '@mocks/helpers/error'
import * as Bifold from '@bifold/core'
import { renderHook } from '@testing-library/react-native'
import * as BcscCore from 'react-native-bcsc-core'

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('@bcsc-theme/utils/push-notification-tokens')
jest.mock('@/hooks/useAlerts')

describe('useQuickLoginURL', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)
  })

  it('should return error when no initiate login uri', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: jest.fn() } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({} as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test' })

    expect(result).toEqual({ success: false, error: expect.stringContaining('login unavailable') })
  })

  it('should return error when no client access token', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: jest.fn() } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({} as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: expect.stringContaining('access token') })
  })

  it('should return error when no notification tokens available', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const getFirstJwkMock = jest.fn()
    bcscCoreMock.getAccount = jest.fn()
    tokensMock.getNotificationTokens = jest.fn()

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: getFirstJwkMock } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true } } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: expect.stringContaining('notification tokens') })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(getFirstJwkMock).toHaveBeenCalledTimes(1)
  })

  it('should return error when no account available', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const getFirstJwkMock = jest.fn()
    bcscCoreMock.getAccount = jest.fn()
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: getFirstJwkMock } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true } } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: expect.stringContaining('account') })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(getFirstJwkMock).toHaveBeenCalledTimes(1)
  })

  it('should return error and show alert when no jwk available', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const mockError = mockAppError(AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK)
    const getFirstJwkMock = jest.fn().mockRejectedValue(mockError)
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)
    const mockAlerts = { missingJwkAlert: jest.fn() }

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: getFirstJwkMock } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true } } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: expect.stringContaining('Error creating quick login URL') })
    expect(mockAlerts.missingJwkAlert).toHaveBeenCalled()

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(getFirstJwkMock).toHaveBeenCalledTimes(1)
  })

  it('should return error when failed to create quick login JWT', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const getFirstJwkMock = jest.fn().mockResolvedValue(true)
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)
    bcscCoreMock.createQuickLoginJWT = jest.fn().mockRejectedValue(new Error('failed jwt'))

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: getFirstJwkMock } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true } } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: expect.stringContaining('failed jwt') })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(getFirstJwkMock).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.createQuickLoginJWT).toHaveBeenCalledTimes(1)
  })

  it('should return the quick login URL', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const getFirstJwkMock = jest.fn().mockResolvedValue('jwk')
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue({ clientID: 'client-id', issuer: 'issuer' } as any)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue({ fcmDeviceToken: 'fcm', deviceToken: 'apns' })
    bcscCoreMock.createQuickLoginJWT = jest.fn().mockResolvedValue('test-jwt')

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: getFirstJwkMock } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: 'access-token' } } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: true, url: `https://example.com?login_hint=${encodeURIComponent('test-jwt')}` })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(getFirstJwkMock).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.createQuickLoginJWT).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.createQuickLoginJWT).toHaveBeenCalledWith(
      'access-token',
      'client-id',
      'issuer',
      'test',
      'jwk',
      'fcm',
      'apns'
    )
  })
})
