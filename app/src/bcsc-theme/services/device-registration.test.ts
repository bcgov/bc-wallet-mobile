import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { seedAccount, seedBCSCStore, seedTokens } from '@/bcsc-theme/storage/testing'
import { AppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import type { BifoldLogger } from '@bifold/core'
import { clearRegistration, setAccount, setRegistration, setToken } from 'react-native-bcsc-core'
import {
  clearDeviceRegistration,
  fillInDeviceRegistration,
  keepDeviceRegistrationInMemory,
  readDeviceRegistration,
  readStoredDeviceRegistration,
  saveDeviceRegistration,
} from './device-registration'

jest.mock('react-native-bcsc-core')

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as BifoldLogger

const ISSUER = 'https://idsit.gov.bc.ca/device/'
// Realistic values, so the no-leak checks below cannot pass just because the values are short
const CLIENT_ID = 'b5a1c3d2-7e44-4f0a-9d21-3c8a6f1e5b70'
const TOKEN = 'eyJhbGciOiJSUzI1NiJ9.registration-access-token.signature'

const registeredAccount = { id: 'account-1', issuer: ISSUER, clientID: CLIENT_ID }
const unregisteredAccount = { id: 'account-1', issuer: ISSUER }
const registration = { clientId: CLIENT_ID, issuer: ISSUER, registrationAccessToken: TOKEN }

const writeError = () => new Error('keychain write failed')

// Swaps the store's setRegistration for one that rejects, keeping the rest of the account slice
const failRegistrationWrites = (error: Error) => {
  const setRegistrationMock = jest.fn().mockRejectedValue(error)
  seedBCSCStore({ account: { setRegistration: setRegistrationMock } })
  return setRegistrationMock
}

/** Everything the logger was given, at every level, with error arguments reduced to their messages. */
const allLoggedText = () =>
  [logger.info, logger.warn, logger.error]
    .flatMap((fn) => (fn as jest.Mock).mock.calls)
    .map((args) => JSON.stringify(args, (_key, value) => (value instanceof Error ? value.message : value)))
    .join('\n')

describe('device registration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    seedAccount(registeredAccount)
    seedTokens({ registrationAccessToken: TOKEN })
  })

  describe('readStoredDeviceRegistration', () => {
    it('reads the client ID, issuer and token from the stored registration', () => {
      expect(readStoredDeviceRegistration()).toEqual(registration)
    })

    it('holds nothing when there is no account, even with a registration left over', () => {
      seedBCSCStore({ account: { profile: undefined, registration } })

      expect(readStoredDeviceRegistration()).toEqual({})
    })

    it('holds only the issuer for an account that has not registered yet', () => {
      seedAccount(unregisteredAccount)
      seedBCSCStore({ account: { registration: undefined } })

      expect(readStoredDeviceRegistration()).toEqual({
        clientId: undefined,
        issuer: ISSUER,
        registrationAccessToken: undefined,
      })
    })

    it.each([
      ['client ID', { ...registration, clientId: '' }, 'clientId'],
      ['token', { ...registration, registrationAccessToken: '' }, 'registrationAccessToken'],
    ] as const)('reads a blank %s as none', (_label, stored, field) => {
      seedBCSCStore({ account: { registration: stored } })

      expect(readStoredDeviceRegistration()[field]).toBeUndefined()
    })

    it("falls back to the account's issuer when the registration has none", () => {
      seedBCSCStore({ account: { registration: { ...registration, issuer: '' } } })

      expect(readStoredDeviceRegistration().issuer).toBe(ISSUER)
    })
  })

  describe('readDeviceRegistration', () => {
    it('returns the registration when the device holds all of it', () => {
      expect(readDeviceRegistration()).toEqual(registration)
    })

    it.each([
      ['no account', { profile: undefined }],
      ['no client ID', { registration: { issuer: ISSUER, registrationAccessToken: TOKEN } }],
      ['no token', { registration: { clientId: CLIENT_ID, issuer: ISSUER } }],
      ['no registration', { registration: undefined }],
    ])('returns null when the device holds %s: a client ID and its token are only usable together', (_label, seed) => {
      seedBCSCStore({ account: seed })

      expect(readDeviceRegistration()).toBeNull()
    })

    it('returns null when neither the registration nor the account has an issuer', () => {
      seedAccount({ ...registeredAccount, issuer: '' })
      seedBCSCStore({ account: { registration: { ...registration, issuer: '' } } })

      expect(readDeviceRegistration()).toBeNull()
    })
  })

  describe('saveDeviceRegistration', () => {
    it('saves the client ID, issuer and token together in the store', async () => {
      seedBCSCStore({ account: { registration: undefined } })

      await saveDeviceRegistration(registration, logger)

      expect(getBCSCState().account.registration).toEqual(registration)
      // Never through the native account and token records, which is how the two came to disagree
      expect(setRegistration).not.toHaveBeenCalled()
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
      const setRegistrationMock = jest.fn()
      seedBCSCStore({ account: { setRegistration: setRegistrationMock } })

      const error = await saveDeviceRegistration(partial, logger).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).appEvent).toBe(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
      expect(setRegistrationMock).not.toHaveBeenCalled()
    })

    it('rejects with ACCOUNT_NOT_FOUND when there is no account, before any write', async () => {
      seedAccount(null)
      const setRegistrationMock = jest.fn()
      seedBCSCStore({ account: { setRegistration: setRegistrationMock } })

      await expect(saveDeviceRegistration(registration, logger)).rejects.toMatchObject({
        appEvent: AppEventCode.ACCOUNT_NOT_FOUND,
      })
      expect(setRegistrationMock).not.toHaveBeenCalled()
    })

    it('maps a failed write to STORAGE_WRITE_ERROR, keeping the cause and the previous registration', async () => {
      const previous = { ...registration, registrationAccessToken: 'previous-token' }
      seedBCSCStore({ account: { registration: previous } })
      const rejection = writeError()
      failRegistrationWrites(rejection)

      const error = await saveDeviceRegistration(registration, logger).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).appEvent).toBe(AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE)
      expect((error as AppError).cause).toBe(rejection)
      expect(getBCSCState().account.registration).toEqual(previous)
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('previous one is still in place'), rejection)
    })

    it('logs the outcome, never the client ID or the token', async () => {
      await saveDeviceRegistration(registration, logger)
      failRegistrationWrites(writeError())
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
      seedBCSCStore({ account: { registration: { issuer: ISSUER, registrationAccessToken: TOKEN } } })

      await fillInDeviceRegistration({ clientId: CLIENT_ID, issuer: ISSUER }, logger)

      expect(getBCSCState().account.registration).toEqual(registration)
    })

    it('saves no token when there is none stored: a v3 upgrade may have none', async () => {
      seedBCSCStore({ account: { registration: undefined } })

      await fillInDeviceRegistration({ clientId: CLIENT_ID, issuer: ISSUER }, logger)

      expect(getBCSCState().account.registration).toEqual({ clientId: CLIENT_ID, issuer: ISSUER })
    })

    it('rejects with ACCOUNT_NOT_FOUND when there is no account', async () => {
      seedAccount(null)

      await expect(fillInDeviceRegistration({ clientId: CLIENT_ID, issuer: ISSUER }, logger)).rejects.toMatchObject({
        appEvent: AppEventCode.ACCOUNT_NOT_FOUND,
      })
      expect(getBCSCState().account.registration).toBeUndefined()
    })

    it('maps a failed write', async () => {
      failRegistrationWrites(writeError())

      await expect(fillInDeviceRegistration({ clientId: CLIENT_ID, issuer: ISSUER }, logger)).rejects.toMatchObject({
        appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE,
      })
      expect(allLoggedText()).not.toContain(CLIENT_ID)
    })
  })

  describe('clearDeviceRegistration', () => {
    it('clears the client ID and the token together, keeping the account', async () => {
      await clearDeviceRegistration(logger)

      expect(getBCSCState().account.registration).toBeUndefined()
      expect(getBCSCState().account.profile).toBeDefined()
      expect(readStoredDeviceRegistration()).toEqual({
        clientId: undefined,
        issuer: ISSUER,
        registrationAccessToken: undefined,
      })
      expect(clearRegistration).not.toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('[DeviceRegistration] Registration cleared')
    })

    it('maps a failed write, so the caller does not go on as if it were cleared', async () => {
      failRegistrationWrites(writeError())

      await expect(clearDeviceRegistration(logger)).rejects.toMatchObject({
        appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE,
      })
      expect(getBCSCState().account.registration).toEqual(registration)
      expect(logger.info).not.toHaveBeenCalledWith('[DeviceRegistration] Registration cleared')
    })
  })

  describe('keepDeviceRegistrationInMemory', () => {
    it('makes the registration readable for the rest of the session', () => {
      const rotated = { ...registration, registrationAccessToken: 'rotated-token' }

      keepDeviceRegistrationInMemory(rotated)

      expect(readDeviceRegistration()).toEqual(rotated)
    })
  })
})
