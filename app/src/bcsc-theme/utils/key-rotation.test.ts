jest.mock('react-native-bcsc-core', () => ({
  createNewKeyPair: jest.fn(),
  deleteKey: jest.fn(),
  getAllKeysWithPublicInfo: jest.fn(),
  setToken: jest.fn(),
  TokenType: { Access: 0, Refresh: 1, Registration: 2 },
}))

jest.mock('./key-recovery', () => ({
  ...jest.requireActual('./key-recovery'),
  reRegisterNewestKey: jest.fn(),
}))

import { Platform } from 'react-native'
import { createNewKeyPair, deleteKey, getAllKeysWithPublicInfo, setToken, TokenType } from 'react-native-bcsc-core'
import { reRegisterNewestKey } from './key-recovery'
import {
  KEY_ROTATION_MAX_AGE_DAYS,
  KEY_ROTATION_RETRY_BACKOFF_DAYS,
  keyAgeDays,
  keyCreatedAtMs,
  rotateSigningKey,
} from './key-rotation'

const mockedCreateNewKeyPair = createNewKeyPair as jest.MockedFunction<typeof createNewKeyPair>
const mockedDeleteKey = deleteKey as jest.MockedFunction<typeof deleteKey>
const mockedGetAllKeysWithPublicInfo = getAllKeysWithPublicInfo as jest.MockedFunction<typeof getAllKeysWithPublicInfo>
const mockedSetToken = setToken as jest.MockedFunction<typeof setToken>
const mockedReRegisterNewestKey = reRegisterNewestKey as jest.MockedFunction<typeof reRegisterNewestKey>

const makeLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }) as any

const CLIENT_ID = 'client-abc'
const REG_TOKEN = 'rat-xyz'

/** Distinct, decodable "modulus" values for test fixtures. */
const n = (seed: number) => Buffer.from([0xaa, seed]).toString('base64')

const makeApiClient = () => ({ endpoints: { registration: 'https://example.test/device/register' } }) as any

describe('keyCreatedAtMs', () => {
  const originalOS = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => originalOS })
  })

  it('treats iOS `created` as SECONDS and converts to ms', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios' })
    expect(keyCreatedAtMs(1000)).toBe(1000 * 1000)
  })

  it('treats Android `created` as already-MS and passes it through', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android' })
    expect(keyCreatedAtMs(1000)).toBe(1000)
  })

  it('returns null for undefined input', () => {
    expect(keyCreatedAtMs(undefined)).toBeNull()
  })
})

describe('keyAgeDays', () => {
  it('computes whole-day age from a ms timestamp', () => {
    const now = Date.parse('2026-01-10T00:00:00.000Z')
    const createdAtMs = Date.parse('2026-01-01T00:00:00.000Z')
    expect(keyAgeDays(createdAtMs, now)).toBe(9)
  })
})

describe('constants', () => {
  it('cadence and backoff match the locked decisions', () => {
    expect(KEY_ROTATION_MAX_AGE_DAYS).toBe(365)
    expect(KEY_ROTATION_RETRY_BACKOFF_DAYS).toBe(7)
  })
})

describe('rotateSigningKey', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('happy path: generates, PUTs, confirms via modulus, prunes previous keys, and returns rotated', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(1), n(2)] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
    ])
    mockedDeleteKey.mockResolvedValue(undefined)
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rotated', newRegistrationAccessToken: undefined })
    expect(mockedCreateNewKeyPair).toHaveBeenCalled()
    expect(mockedReRegisterNewestKey).toHaveBeenCalledWith(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)
    // Only the superseded key is pruned, never the new one.
    expect(mockedDeleteKey).toHaveBeenCalledTimes(1)
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa1')
  })

  it('persists a rotated registration_access_token via native setToken BEFORE confirm/rollback', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({
      success: true,
      newRegistrationAccessToken: 'rotated-token',
      serverKeyNs: [n(2)],
    })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([{ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 }])
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.newRegistrationAccessToken).toBe('rotated-token')
    expect(mockedSetToken).toHaveBeenCalledWith(TokenType.Registration, 'rotated-token')
    // setToken must have been invoked before the prune enumeration runs (before/rollback ordering).
    expect(mockedSetToken.mock.invocationCallOrder[0]).toBeLessThan(
      mockedGetAllKeysWithPublicInfo.mock.invocationCallOrder[0]
    )
  })

  it('persists a rotated registration_access_token even when the PUT itself failed (rollback)', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: false, newRegistrationAccessToken: 'rotated-token' })
    mockedDeleteKey.mockResolvedValue(undefined)
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rolled_back', newRegistrationAccessToken: 'rotated-token' })
    expect(mockedSetToken).toHaveBeenCalledWith(TokenType.Registration, 'rotated-token')
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
  })

  it('createNewKeyPair throws -> failed, no PUT attempted', async () => {
    mockedCreateNewKeyPair.mockRejectedValue(new Error('keychain unavailable'))
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'failed' })
    expect(mockedReRegisterNewestKey).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('PUT success:false -> rolls back the new key -> rolled_back', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: false })
    mockedDeleteKey.mockResolvedValue(undefined)
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rolled_back', newRegistrationAccessToken: undefined })
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
    expect(mockedGetAllKeysWithPublicInfo).not.toHaveBeenCalled()
  })

  it('echo definitively missing the new modulus -> rolls back', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(1)] })
    mockedDeleteKey.mockResolvedValue(undefined)
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rolled_back', newRegistrationAccessToken: undefined })
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
    expect(mockedGetAllKeysWithPublicInfo).not.toHaveBeenCalled()
  })

  it('echo undecodable/empty -> keeps the new key WITHOUT pruning, returns rotated', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [] })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rotated', newRegistrationAccessToken: undefined })
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(mockedGetAllKeysWithPublicInfo).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=rotated_unconfirmed_no_prune'))
  })

  it('echo entirely undecodable garbage -> same as empty: rotated without pruning', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: ['not-valid-base64!!!'] })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('rotated')
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('rollback delete throws -> failed, no crash', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: false })
    mockedDeleteKey.mockRejectedValue(new Error('E_KEYSTORE_ERROR'))
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'failed', newRegistrationAccessToken: undefined })
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=failed_rollback_delete'))
  })

  it('a prune failure of an old key is non-fatal — still reports rotated', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(2)] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
    ])
    mockedDeleteKey.mockRejectedValue(new Error('E_KEYSTORE_ERROR'))
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('rotated')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=failed_prune_delete'))
  })

  it('a prune enumeration failure is non-fatal — still reports rotated', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(2)] })
    mockedGetAllKeysWithPublicInfo.mockRejectedValue(new Error('keystore unavailable'))
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('rotated')
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=failed_prune_enumerate'))
  })
})
