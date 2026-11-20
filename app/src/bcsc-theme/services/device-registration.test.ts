import { AppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import type { BifoldLogger } from '@bifold/core'
import {
  clearRegistration,
  getAccount,
  getToken,
  setAccount,
  setRegistration,
  setToken,
  TokenType,
} from 'react-native-bcsc-core'
import {
  clearDeviceRegistration,
  fillInDeviceRegistration,
  readDeviceRegistration,
  readStoredDeviceRegistration,
  saveDeviceRegistration,
} from './device-registration'

jest.mock('react-native-bcsc-core')

const mockGetAccount = jest.mocked(getAccount)
const mockGetToken = jest.mocked(getToken)
const mockSetRegistration = jest.mocked(setRegistration)
const mockClearRegistration = jest.mocked(clearRegistration)

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as BifoldLogger

const ISSUER = 'https://idsit.gov.bc.ca/device/'
// Realistic values, so the no-leak checks below cannot pass just because the values are short
const CLIENT_ID = 'b5a1c3d2-7e44-4f0a-9d21-3c8a6f1e5b70'
const TOKEN = 'eyJhbGciOiJSUzI1NiJ9.registration-access-token.signature'

const registeredAccount = {
  id: 'account-1',
  issuer: ISSUER,
  clientID: CLIENT_ID,
  securityMethod: 'app_pin_no_device_authn',
}
const unregisteredAccount = { id: 'account-1', issuer: ISSUER, securityMethod: 'app_pin_no_device_authn' }
const registration = { clientId: CLIENT_ID, issuer: ISSUER, registrationAccessToken: TOKEN }

const nativeError = (code: string) => Object.assign(new Error(`native ${code}`), { code })

/** Everything the logger was given, at every level, with error arguments reduced to their messages. */
const allLoggedText = () =>
  [logger.info, logger.warn, logger.error]
    .flatMap((fn) => (fn as jest.Mock).mock.calls)
    .map((args) => JSON.stringify(args, (_key, value) => (value instanceof Error ? value.message : value)))
    .join('\n')

describe('device registration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAccount.mockResolvedValue(registeredAccount as any)
    mockGetToken.mockResolvedValue({ token: TOKEN } as any)
    mockSetRegistration.mockReset().mockResolvedValue(undefined)
    mockClearRegistration.mockReset().mockResolvedValue(undefined)
  })

  describe('readStoredDeviceRegistration', () => {
    it('reads the client ID and issuer from the account and the token from secure storage', async () => {
      await expect(readStoredDeviceRegistration()).resolves.toEqual(registration)

      expect(mockGetAccount).toHaveBeenCalledTimes(1)
      expect(mockGetToken).toHaveBeenCalledWith(TokenType.Registration)
    })

    it('holds nothing when there is no account, and does not read a token that needs one', async () => {
      mockGetAccount.mockResolvedValue(null)

      await expect(readStoredDeviceRegistration()).resolves.toEqual({})

      expect(mockGetToken).not.toHaveBeenCalled()
    })

    it('holds only the issuer for an account that has not registered yet', async () => {
      mockGetAccount.mockResolvedValue(unregisteredAccount as any)
      mockGetToken.mockResolvedValue(null)

      await expect(readStoredDeviceRegistration()).resolves.toEqual({
        clientId: undefined,
        issuer: ISSUER,
        registrationAccessToken: undefined,
      })
    })

    it.each([
      ['client ID', { ...registeredAccount, clientID: '' }, { token: TOKEN }, 'clientId'],
      ['issuer', { ...registeredAccount, issuer: '' }, { token: TOKEN }, 'issuer'],
      ['token', registeredAccount, { token: '' }, 'registrationAccessToken'],
    ] as const)('reads a blank %s as none', async (_label, account, token, field) => {
      mockGetAccount.mockResolvedValue(account as any)
      mockGetToken.mockResolvedValue(token as any)

      const stored = await readStoredDeviceRegistration()

      expect(stored[field]).toBeUndefined()
    })

    it('uses an account the caller already read instead of reading it again', async () => {
      await expect(readStoredDeviceRegistration(registeredAccount as any)).resolves.toEqual(registration)

      expect(mockGetAccount).not.toHaveBeenCalled()
    })

    it('takes a null account from the caller as no account, without reading it again', async () => {
      await expect(readStoredDeviceRegistration(null)).resolves.toEqual({})

      expect(mockGetAccount).not.toHaveBeenCalled()
      expect(mockGetToken).not.toHaveBeenCalled()
    })

    it('rejects when the token cannot be read, rather than reporting a registration with no token', async () => {
      const readError = nativeError('E_STORAGE_ERROR')
      mockGetToken.mockRejectedValue(readError)

      await expect(readStoredDeviceRegistration()).rejects.toBe(readError)
    })
  })

  describe('readDeviceRegistration', () => {
    it('returns the registration when the device holds all of it', async () => {
      await expect(readDeviceRegistration()).resolves.toEqual(registration)
    })

    it.each([
      ['no account', null, { token: TOKEN }],
      ['no client ID', unregisteredAccount, { token: TOKEN }],
      ['no issuer', { ...registeredAccount, issuer: '' }, { token: TOKEN }],
      ['no token', registeredAccount, null],
    ])('returns null when the device holds %s: a client ID and its token are only usable together', async (...args) => {
      const [, account, token] = args
      mockGetAccount.mockResolvedValue(account as any)
      mockGetToken.mockResolvedValue(token as any)

      await expect(readDeviceRegistration()).resolves.toBeNull()
    })

    it('uses an account the caller already read', async () => {
      await expect(readDeviceRegistration(registeredAccount as any)).resolves.toEqual(registration)

      expect(mockGetAccount).not.toHaveBeenCalled()
    })
  })

  describe('saveDeviceRegistration', () => {
    it('saves the client ID, issuer and token in one native call', async () => {
      await saveDeviceRegistration(registration, logger)

      expect(mockSetRegistration).toHaveBeenCalledTimes(1)
      expect(mockSetRegistration).toHaveBeenCalledWith(CLIENT_ID, ISSUER, TOKEN)
      // Never as an account save plus a token save, which is how the two came to disagree
      expect(setAccount).not.toHaveBeenCalled()
      expect(setToken).not.toHaveBeenCalled()
    })

    it.each([
      ['client ID', { ...registration, clientId: '' }],
      ['issuer', { ...registration, issuer: '' }],
      ['token', { ...registration, registrationAccessToken: '' }],
      ['client ID (absent from the response)', { ...registration, clientId: undefined as unknown as string }],
      [
        'token (absent from the response)',
        { ...registration, registrationAccessToken: undefined as unknown as string },
      ],
    ])('never saves part of a registration: rejects one with no %s before any write', async (_label, partial) => {
      const error = await saveDeviceRegistration(partial, logger).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).appEvent).toBe(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
      expect(mockSetRegistration).not.toHaveBeenCalled()
    })

    it.each([
      ['E_TOKEN_SAVE_FAILED', AppEventCode.TOKEN_SAVE_FAILED],
      ['E_SAVE_ACCOUNT_FAILED', AppEventCode.NATIVE_STORAGE_WRITE_FAILED],
      ['E_ACCOUNT_NOT_FOUND', AppEventCode.ACCOUNT_NOT_FOUND],
      ['E_INVALID_PARAMETERS', AppEventCode.NATIVE_INVALID_PARAMETERS],
    ])('maps a native %s rejection, keeping the native error as the cause', async (code, appEvent) => {
      const rejection = nativeError(code)
      mockSetRegistration.mockRejectedValue(rejection)

      const error = await saveDeviceRegistration(registration, logger).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).appEvent).toBe(appEvent)
      expect((error as AppError).cause).toBe(rejection)
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('previous one is still in place'), rejection)
    })

    it('logs the outcome, never the client ID or the token', async () => {
      await saveDeviceRegistration(registration, logger)
      mockSetRegistration.mockRejectedValue(nativeError('E_TOKEN_SAVE_FAILED'))
      await saveDeviceRegistration(registration, logger).catch(() => undefined)
      await saveDeviceRegistration({ ...registration, issuer: '' }, logger).catch(() => undefined)

      expect(logger.info).toHaveBeenCalledWith('[DeviceRegistration] Registration saved')
      const logged = allLoggedText()
      expect(logged).not.toContain(CLIENT_ID)
      expect(logged).not.toContain(TOKEN)
    })
  })

  describe('fillInDeviceRegistration', () => {
    it('saves the client ID and issuer and leaves the stored token as it is', async () => {
      await fillInDeviceRegistration({ clientId: CLIENT_ID, issuer: ISSUER }, logger)

      // null, not the token: this is not a new registration, and a v3 upgrade may have no token to save
      expect(mockSetRegistration).toHaveBeenCalledWith(CLIENT_ID, ISSUER, null)
    })

    it('maps a native rejection', async () => {
      mockSetRegistration.mockRejectedValue(nativeError('E_SAVE_ACCOUNT_FAILED'))

      await expect(fillInDeviceRegistration({ clientId: CLIENT_ID, issuer: ISSUER }, logger)).rejects.toMatchObject({
        appEvent: AppEventCode.NATIVE_STORAGE_WRITE_FAILED,
      })
      expect(allLoggedText()).not.toContain(CLIENT_ID)
    })
  })

  describe('clearDeviceRegistration', () => {
    it('clears the client ID and the token in one native call', async () => {
      await clearDeviceRegistration(logger)

      expect(mockClearRegistration).toHaveBeenCalledTimes(1)
      expect(logger.info).toHaveBeenCalledWith('[DeviceRegistration] Registration cleared')
    })

    it.each([
      ['E_SAVE_ACCOUNT_FAILED', AppEventCode.NATIVE_STORAGE_WRITE_FAILED],
      ['E_TOKEN_DELETE_ERROR', AppEventCode.TOKEN_DELETE_FAILED],
    ])('maps a native %s rejection, so the caller does not go on as if it were cleared', async (code, appEvent) => {
      mockClearRegistration.mockRejectedValue(nativeError(code))

      await expect(clearDeviceRegistration(logger)).rejects.toMatchObject({ appEvent })
      expect(logger.info).not.toHaveBeenCalledWith('[DeviceRegistration] Registration cleared')
    })
  })
})
