import * as useApi from '@/bcsc-theme/api/hooks/useApi'
import * as useBCSCApiClient from '@/bcsc-theme/hooks/useBCSCApiClient'
import * as BcscCore from 'react-native-bcsc-core'
import * as tokens from '@/bcsc-theme/utils/push-notification-tokens'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import * as Bifold from '@bifold/core'
import { renderHook } from '@testing-library/react-native'

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('@bcsc-theme/utils/push-notification-tokens')

describe('useQuickLoginURL', () => {
  beforeEach(() => {
    jest.resetAllMocks()
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

  it('should return error when no jwk available', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const getFirstJwkMock = jest.fn()
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: getFirstJwkMock } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true } } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: expect.stringContaining('JWK') })

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
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue({ fcmDeviceToken: 'fcm', apnsToken: 'apns' })
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
