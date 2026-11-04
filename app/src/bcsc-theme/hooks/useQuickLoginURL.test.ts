import * as useBCSCApiClient from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import * as tokens from '@/bcsc-theme/utils/push-notification-tokens'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import * as Bifold from '@bifold/core'
import { mockAppError } from '@mocks/helpers/error'
import { renderHook } from '@testing-library/react-native'
import * as BcscCore from 'react-native-bcsc-core'

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  createNavigatorFactory: jest.fn(),
}))
jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('@bcsc-theme/utils/push-notification-tokens')
jest.mock('@/hooks/useAlerts')

const failure = (step: string, technicalMessage: string, appEvent = AppEventCode.LOGIN_SERVER_ERROR) =>
  expect.objectContaining({
    appEvent,
    technicalMessage: expect.stringContaining(technicalMessage),
    context: expect.objectContaining({
      failure_flow: 'quick_login',
      failure_step: step,
      failure_elapsed_ms: expect.any(Number),
    }),
  })

describe('useQuickLoginURL', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)
  })

  it('should return error when no initiate login uri', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)

    useClientMock.useBCSCApiClient.mockReturnValue({ fetchJwk: jest.fn() } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test' })

    expect(result).toEqual({ success: false, error: failure('service_config', 'login unavailable') })
  })

  it('should return error when no client access token', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)

    useClientMock.useBCSCApiClient.mockReturnValue({ fetchJwk: jest.fn() } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: failure('access_token', 'access token') })
  })

  it('should return error when no notification tokens available', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const fetchJwkMock = jest.fn()
    bcscCoreMock.getAccount = jest.fn()
    tokensMock.getNotificationTokens = jest.fn()

    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true }, fetchJwk: fetchJwkMock } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: failure('notification_tokens', 'notification tokens') })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(fetchJwkMock).toHaveBeenCalledTimes(1)
  })

  it('should return error when no account available', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const fetchJwkMock = jest.fn()
    bcscCoreMock.getAccount = jest.fn()
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)

    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true }, fetchJwk: fetchJwkMock } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: failure('account', 'account') })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(fetchJwkMock).toHaveBeenCalledTimes(1)
  })

  it('should return error and show alert when no jwk available', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    // fetchJwk resolves to null on exhaustion/empty-keys — see BCSCApiClient.fetchJwk's fail-closed path
    const fetchJwkMock = jest.fn().mockResolvedValue(null)
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)
    const mockAlerts = { missingJwkAlert: jest.fn() }

    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true }, fetchJwk: fetchJwkMock } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, handled: true })
    expect(mockAlerts.missingJwkAlert).toHaveBeenCalled()

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(fetchJwkMock).toHaveBeenCalledTimes(1)
  })

  it('should return error and show alert when jwk fetch rejects with missing-jwk app error', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const mockError = mockAppError(AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK)
    const fetchJwkMock = jest.fn().mockRejectedValue(mockError)
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)
    const mockAlerts = { missingJwkAlert: jest.fn() }

    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true }, fetchJwk: fetchJwkMock } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, handled: true })
    expect(mockAlerts.missingJwkAlert).toHaveBeenCalled()

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(fetchJwkMock).toHaveBeenCalledTimes(1)
  })

  it('should return error when failed to create quick login JWT', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const fetchJwkMock = jest.fn().mockResolvedValue(true)
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)
    bcscCoreMock.createQuickLoginJWT = jest.fn().mockRejectedValue(new Error('failed jwt'))

    useClientMock.useBCSCApiClient.mockReturnValue({ tokens: { access_token: true }, fetchJwk: fetchJwkMock } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: failure('sign_jwt', 'failed jwt') })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(fetchJwkMock).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.createQuickLoginJWT).toHaveBeenCalledTimes(1)
  })

  it('should attach the failed step and the JWK fetch cause to the missing jwk alert', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)
    const mockAlerts = { missingJwkAlert: jest.fn() }

    useClientMock.useBCSCApiClient.mockReturnValue({
      tokens: { access_token: true },
      fetchJwk: jest.fn().mockResolvedValue(null),
      lastJwkFetchError: new Error('timeout of 15000ms exceeded'),
    } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

    const hook = renderHook(() => useQuickLoginURL())
    await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(mockAlerts.missingJwkAlert).toHaveBeenCalledWith(
      failure('jwks', 'timeout of 15000ms', AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK)
    )
  })

  it('should keep the native error code when signing fails', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    bcscCoreMock.getAccount = jest.fn().mockResolvedValue(true)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)
    bcscCoreMock.createQuickLoginJWT = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('No keys available'), { code: 'E_NO_KEYS_FOUND' }))

    useClientMock.useBCSCApiClient.mockReturnValue({
      tokens: { access_token: true },
      fetchJwk: jest.fn().mockResolvedValue(true),
    } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: failure('sign_jwt', 'E_NO_KEYS_FOUND: No keys available') })
  })

  it('should report the step when reading the account rejects', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    bcscCoreMock.getAccount = jest.fn().mockRejectedValue(new Error('storage read failed'))
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue(true)

    useClientMock.useBCSCApiClient.mockReturnValue({
      tokens: { access_token: true },
      fetchJwk: jest.fn().mockResolvedValue(true),
    } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: false, error: failure('account', 'storage read failed') })
  })

  it('should return the quick login URL', async () => {
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const bcscCoreMock = jest.mocked(BcscCore)
    const tokensMock = jest.mocked(tokens)

    const fetchJwkMock = jest.fn().mockResolvedValue('jwk')
    bcscCoreMock.getAccount = jest.fn().mockResolvedValue({ clientID: 'client-id', issuer: 'issuer' } as any)
    tokensMock.getNotificationTokens = jest.fn().mockResolvedValue({ fcmDeviceToken: 'fcm', deviceToken: 'apns' })
    bcscCoreMock.createQuickLoginJWT = jest.fn().mockResolvedValue('test-jwt')

    useClientMock.useBCSCApiClient.mockReturnValue({
      tokens: { access_token: 'access-token' },
      fetchJwk: fetchJwkMock,
    } as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const hook = renderHook(() => useQuickLoginURL())
    const result = await hook.result.current({ client_ref_id: 'test', initiate_login_uri: 'https://example.com' })

    expect(result).toEqual({ success: true, url: `https://example.com?login_hint=${encodeURIComponent('test-jwt')}` })

    expect(tokensMock.getNotificationTokens).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalledTimes(1)
    expect(fetchJwkMock).toHaveBeenCalledTimes(1)
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
