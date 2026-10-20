import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { AppError, ErrorCategory, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import * as Bifold from '@bifold/core'
import { renderHook } from '@testing-library/react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import { extractTransferToken, useAccountTransferQRCodeStrategy } from './useAccountTransferQRCodeStrategy'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const mockAuthorizeDevice = jest.fn()
const mockVerifyAttestation = jest.fn()
const mockDeviceToken = jest.fn()
const mockUseApi = jest.mocked(useApi)

const mockUpdateTokens = jest.fn()
const mockUpdateUserInfo = jest.fn()
const mockUpdateDeviceCodes = jest.fn()

jest.mock('@/bcsc-theme/hooks/useSecureActions')
const mockUseSecureActions = jest.mocked(useSecureActions)

jest.mock('@/bcsc-theme/services/hooks/useRegistrationService')
const mockEnsureRegistered = jest.fn()

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
const mockUseBCSCApiClient = jest.mocked(useBCSCApiClient)

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

const mockAccount = {
  issuer: 'https://issuer.example.com',
  clientID: 'test-client-id',
}

const mockDeviceAuth = {
  device_code: 'test-device-code',
  user_code: 'ABCD1234',
  verified_email: 'test@example.com',
  expires_in: 3600,
}

const validQrValue = 'https://example.com/selfsetup.html?mock-attestation-token'

describe('extractTransferToken', () => {
  it('returns the query string of a selfsetup.html URL', () => {
    expect(extractTransferToken(validQrValue)).toBe('mock-attestation-token')
  })

  it('matches the path case-insensitively', () => {
    expect(extractTransferToken('https://example.com/static/SelfSetup.HTML?token')).toBe('token')
  })

  it.each([
    ['a URL on a different path', 'https://example.com/other.html?token'],
    ['a URL with no token', 'https://example.com/selfsetup.html'],
    ['a URL with an empty token', 'https://example.com/selfsetup.html?'],
    ['a string that is not a URL', 'not a url'],
  ])('returns null for %s', (_label, value) => {
    expect(extractTransferToken(value)).toBeNull()
  })
})

describe('useAccountTransferQRCodeStrategy', () => {
  const onSuccess = jest.fn()
  const onAlreadyVerified = jest.fn()
  let mockApiClient: { tokens: unknown }

  const setup = (alreadyVerifiedHandler?: () => void) =>
    renderHook(() => useAccountTransferQRCodeStrategy(onSuccess, alreadyVerifiedHandler)).result.current

  beforeEach(() => {
    jest.clearAllMocks()

    mockApiClient = { tokens: null }
    mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)
    mockVerifyAttestation.mockResolvedValue({ success: true })
    mockDeviceToken.mockResolvedValue({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    })

    mockUseApi.mockReturnValue({
      authorization: { authorizeDevice: mockAuthorizeDevice },
      deviceAttestation: { verifyAttestation: mockVerifyAttestation },
      token: { deviceToken: mockDeviceToken },
    } as any)

    mockUseSecureActions.mockReturnValue({
      updateTokens: mockUpdateTokens,
      updateUserInfo: mockUpdateUserInfo,
      updateDeviceCodes: mockUpdateDeviceCodes,
    } as any)

    mockUseBCSCApiClient.mockReturnValue(mockApiClient as any)

    jest
      .mocked(useRegistrationService)
      .mockReturnValue({ ensureRegistered: mockEnsureRegistered, cycleRegistration: jest.fn() } as any)

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: {} } as any, jest.fn()])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    jest.mocked(getAccount).mockResolvedValue(mockAccount as any)
    jest.mocked(createDeviceSignedJWT).mockResolvedValue('mock-jwt')
  })

  describe('matches', () => {
    it('matches a transfer QR', () => {
      expect(setup().matches(validQrValue)).toBe(true)
    })

    it('does not match other QR codes', () => {
      expect(setup().matches('https://example.com/pairingqrcode.html#ABCDEF')).toBe(false)
    })
  })

  describe('device registration', () => {
    it('registers the device when no device code exists', async () => {
      await setup().handle(validQrValue)

      expect(mockAuthorizeDevice).toHaveBeenCalled()
      expect(mockUpdateUserInfo).toHaveBeenCalledWith({ email: 'test@example.com', isEmailVerified: true })
      expect(mockUpdateDeviceCodes).toHaveBeenCalledWith({
        deviceCode: mockDeviceAuth.device_code,
        userCode: mockDeviceAuth.user_code,
        deviceCodeExpiresAt: expect.any(Date),
      })
    })

    it('does not register again when a device code already exists', async () => {
      jest.mocked(Bifold).useStore.mockReturnValue([{ bcscSecure: { deviceCode: 'existing-code' } } as any, jest.fn()])

      await setup().handle(validQrValue)

      expect(mockAuthorizeDevice).not.toHaveBeenCalled()
      expect(mockVerifyAttestation).toHaveBeenCalledWith(expect.objectContaining({ device_code: 'existing-code' }))
    })

    it('registers before attesting', async () => {
      let resolveRegistration!: () => void
      mockAuthorizeDevice.mockReturnValue(
        new Promise((resolve) => {
          resolveRegistration = () => resolve(mockDeviceAuth)
        })
      )

      const pending = setup().handle(validQrValue)
      await Promise.resolve()

      expect(mockVerifyAttestation).not.toHaveBeenCalled()

      resolveRegistration()
      await pending

      expect(mockVerifyAttestation).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalled()
    })

    describe('device account exists but is not registered (stuck account)', () => {
      const notRegisteredError = () =>
        new AppError('No account found. Please register first.', ErrorRegistry.ACCOUNT_NOT_REGISTERED, {
          track: false,
        })

      it('registers the device, retries the authorization once and stores the device code', async () => {
        mockEnsureRegistered.mockResolvedValue(undefined)
        mockAuthorizeDevice.mockRejectedValueOnce(notRegisteredError()).mockResolvedValueOnce(mockDeviceAuth)

        await setup().handle(validQrValue)

        expect(mockEnsureRegistered).toHaveBeenCalledTimes(1)
        expect(mockAuthorizeDevice).toHaveBeenCalledTimes(2)
        expect(mockUpdateDeviceCodes).toHaveBeenCalledWith(
          expect.objectContaining({ deviceCode: mockDeviceAuth.device_code })
        )
        expect(mockVerifyAttestation).toHaveBeenCalledWith(
          expect.objectContaining({ device_code: mockDeviceAuth.device_code })
        )
        expect(onSuccess).toHaveBeenCalled()
      })

      it('rethrows a handled registration failure, which shows no error modal and logs nothing', async () => {
        const registrationFailure = new AppError(
          'registration failed',
          { category: ErrorCategory.NETWORK, appEvent: AppEventCode.NO_INTERNET, statusCode: 2100 },
          { track: false }
        )
        registrationFailure.handled = true
        mockEnsureRegistered.mockRejectedValue(registrationFailure)
        mockAuthorizeDevice.mockRejectedValue(notRegisteredError())

        const strategy = setup()
        await expect(strategy.handle(validQrValue)).rejects.toBe(registrationFailure)

        expect(strategy.toErrorModal?.(registrationFailure)).toBeNull()
        expect(mockEnsureRegistered).toHaveBeenCalledTimes(1)
        expect(mockAuthorizeDevice).toHaveBeenCalledTimes(1)
        expect(mockLogger.error).not.toHaveBeenCalled()
        expect(onSuccess).not.toHaveBeenCalled()
      })
    })

    it('rethrows when registration fails and no device code is available', async () => {
      const networkError = new Error('network')
      mockAuthorizeDevice.mockRejectedValue(networkError)

      await expect(setup().handle(validQrValue)).rejects.toBe(networkError)

      expect(mockVerifyAttestation).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('already verified', () => {
    beforeEach(() => {
      jest.mocked(Bifold).useStore.mockReturnValue([{ bcscSecure: { verified: true } } as any, jest.fn()])
    })

    it('calls onAlreadyVerified and leaves the wallet untouched', async () => {
      await setup(onAlreadyVerified).handle(validQrValue)

      expect(onAlreadyVerified).toHaveBeenCalledTimes(1)
      expect(onSuccess).not.toHaveBeenCalled()
      expect(mockAuthorizeDevice).not.toHaveBeenCalled()
      expect(mockUpdateUserInfo).not.toHaveBeenCalled()
      expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
      expect(getAccount).not.toHaveBeenCalled()
      expect(createDeviceSignedJWT).not.toHaveBeenCalled()
      expect(mockVerifyAttestation).not.toHaveBeenCalled()
      expect(mockDeviceToken).not.toHaveBeenCalled()
      expect(mockUpdateTokens).not.toHaveBeenCalled()
      expect(mockApiClient.tokens).toBeNull()
    })

    it('still rejects a transfer QR with no token before checking verification', async () => {
      await expect(setup(onAlreadyVerified).handle('https://example.com/selfsetup.html')).rejects.toThrow(
        'Unable to extract transfer token from uri'
      )

      expect(onAlreadyVerified).not.toHaveBeenCalled()
    })

    it('runs the normal transfer when no onAlreadyVerified handler is provided', async () => {
      await setup().handle(validQrValue)

      expect(mockVerifyAttestation).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  describe('handle', () => {
    it('completes the full transfer flow and calls onSuccess', async () => {
      await setup().handle(validQrValue)

      expect(mockVerifyAttestation).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: mockAccount.clientID,
          device_code: mockDeviceAuth.device_code,
          attestation: 'mock-attestation-token',
          client_assertion: 'mock-jwt',
        })
      )
      expect(mockDeviceToken).toHaveBeenCalledWith({
        client_id: mockAccount.clientID,
        device_code: mockDeviceAuth.device_code,
        client_assertion: 'mock-jwt',
      })
      expect(mockApiClient.tokens).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      })
      expect(mockUpdateTokens).toHaveBeenCalledWith({
        refreshToken: 'mock-refresh-token',
        accessToken: 'mock-access-token',
      })
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('signs the device JWT for the account with a 1 minute expiry', async () => {
      await setup().handle(validQrValue)

      expect(createDeviceSignedJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          aud: mockAccount.issuer,
          iss: mockAccount.clientID,
          sub: mockAccount.clientID,
          exp: expect.any(Number),
          iat: expect.any(Number),
          jti: expect.any(String),
        })
      )
      const claims = jest.mocked(createDeviceSignedJWT).mock.calls[0][0] as { iat: number; exp: number }
      expect(claims.exp - claims.iat).toBe(60)
    })

    it('throws without calling the API when the URI has no token', async () => {
      await expect(setup().handle('https://example.com/selfsetup.html')).rejects.toThrow(
        'Unable to extract transfer token from uri'
      )

      expect(mockLogger.warn).toHaveBeenCalled()
      expect(mockAuthorizeDevice).not.toHaveBeenCalled()
      expect(mockVerifyAttestation).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('throws when getAccount returns null', async () => {
      jest.mocked(getAccount).mockResolvedValue(null as any)

      await expect(setup().handle(validQrValue)).rejects.toThrow('Local account not found')

      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('throws when attestation returns no response', async () => {
      mockVerifyAttestation.mockResolvedValue(null)

      await expect(setup().handle(validQrValue)).rejects.toThrow('Attestation was not accepted')

      expect(mockDeviceToken).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('propagates API errors without calling onSuccess or saving tokens', async () => {
      mockVerifyAttestation.mockRejectedValue(new Error('attestation failed'))

      await expect(setup().handle(validQrValue)).rejects.toThrow('attestation failed')

      expect(mockUpdateTokens).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('toErrorModal', () => {
    it('returns null for an error that was already handled elsewhere', () => {
      const handledError = new AppError('handled', ErrorRegistry.ACCOUNT_NOT_REGISTERED, { track: false })
      handledError.handled = true

      expect(setup().toErrorModal?.(handledError)).toBeNull()
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('wraps an unexpected error with the failing step and the account transfer copy', async () => {
      jest.mocked(getAccount).mockResolvedValue(null as any)
      const strategy = setup()
      const thrown = await Promise.resolve(strategy.handle(validQrValue)).catch((error: unknown) => error)

      const modal = strategy.toErrorModal?.(thrown)

      expect(modal?.title).toBe('BCSC.Scan.AccountTransferErrorTitle')
      expect(modal?.description).toBe('BCSC.Scan.AccountTransferErrorDescription')
      expect(modal?.error).toBeInstanceOf(AppError)
      expect(modal?.error.context).toMatchObject({
        accountTransferFailedDuring: 'getAccount',
        accountTransferRegisteredAccountDuringScan: true,
      })
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })

    it('reports that the device was not registered during the scan when it already had a device code', async () => {
      jest.mocked(Bifold).useStore.mockReturnValue([{ bcscSecure: { deviceCode: 'existing-code' } } as any, jest.fn()])
      mockVerifyAttestation.mockResolvedValue(null)
      const strategy = setup()
      const thrown = await Promise.resolve(strategy.handle(validQrValue)).catch((error: unknown) => error)

      const modal = strategy.toErrorModal?.(thrown)

      expect(modal?.error.context).toMatchObject({
        accountTransferFailedDuring: 'verifyAttestation',
        accountTransferRegisteredAccountDuringScan: false,
      })
    })
  })
})
