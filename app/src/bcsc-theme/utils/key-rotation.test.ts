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
import {
  createNewKeyPair,
  deleteKey,
  getAllKeysWithPublicInfo,
  KeyPublicInfo,
  setToken,
  TokenType,
} from 'react-native-bcsc-core'
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

// Shared so repeated makeApiClient() calls stay deep-equal for toHaveBeenCalledWith(makeApiClient(), ...) assertions.
const mockedClearTokens = jest.fn()
const makeApiClient = () =>
  ({
    endpoints: { registration: 'https://example.test/device/register' },
    clearTokens: mockedClearTokens,
  }) as any

/** Two pre-rotation keys, steady state, for the retention tests below. */
const twoKeyFixture = (): KeyPublicInfo[] => [
  { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
  { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
]

/**
 * In-memory keystore so multi-rotation tests can assert the key count at every mutation.
 * `undeletableIds` models a delete that always fails; `unregisteredIds` excludes a key's
 * modulus from the echoed server jwks (models a key the server never actually accepted).
 */
const makeFakeKeystore = (initial: KeyPublicInfo[], undeletableIds: string[] = [], unregisteredIds: string[] = []) => {
  const keys = [...initial]
  let maxHeld = keys.length
  let seq = keys.length

  mockedGetAllKeysWithPublicInfo.mockImplementation(async () => [...keys])
  mockedCreateNewKeyPair.mockImplementation(async () => {
    seq++
    const key = { id: `rsa${seq}`, n: n(seq), e: 'AQAB', created: seq * 1000 }
    keys.push(key)
    maxHeld = Math.max(maxHeld, keys.length)
    return key
  })
  mockedDeleteKey.mockImplementation(async (id: string) => {
    if (undeletableIds.includes(id)) {
      throw new Error('E_KEYSTORE_ERROR')
    }
    const i = keys.findIndex((k) => k.id === id)
    if (i === -1) {
      throw new Error('E_KEY_NOT_FOUND')
    }
    keys.splice(i, 1)
  })
  mockedReRegisterNewestKey.mockImplementation(async () => ({
    success: true,
    serverKeyNs: keys.filter((k) => !unregisteredIds.includes(k.id)).map((k) => k.n),
  }))

  return { ids: () => keys.map((k) => k.id), maxHeld: () => maxHeld }
}

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
    // Pruning runs on a confirmed rotation (#4601); default to one key so a test that reaches
    // that branch without its own fixture doesn't inherit a stale one from `clearMocks`.
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([{ id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }])
    mockedDeleteKey.mockResolvedValue(undefined)
  })

  it('redacts client_id to a short suffix in the triggered-event log line', async () => {
    mockedCreateNewKeyPair.mockRejectedValue(new Error('unused — only checking the trigger log'))
    const logger = makeLogger()
    const longClientId = 'client-abcdefgh12345678'

    await rotateSigningKey(makeApiClient(), longClientId, REG_TOKEN, logger)

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/^\[rotateSigningKey] event=triggered client_id=…\w{8}$/)
    )
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining(longClientId))
  })

  it('happy path: generates, PUTs, confirms via modulus, prunes down to the newest two keys, and returns rotated', async () => {
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa0', n: n(0), e: 'AQAB', created: 500 },
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
    ])
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(1), n(2)] })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rotated', confirmed: true, newRegistrationAccessToken: undefined })
    expect(result.confirmed).toBe(true)
    expect(mockedCreateNewKeyPair).toHaveBeenCalled()
    expect(mockedReRegisterNewestKey).toHaveBeenCalledWith(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)
    // Pruning runs AFTER confirm, once enumeration can see the new key; keeps the newest two
    // ('rsa1','rsa2') and deletes the one before that ('rsa0').
    expect(mockedDeleteKey).toHaveBeenCalledTimes(1)
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa0')
    expect(mockedDeleteKey.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockedCreateNewKeyPair.mock.invocationCallOrder[0]
    )
    expect(logger.info).toHaveBeenCalledWith("[rotateSigningKey] event=pruned active='rsa2' pruned=1 prune_failures=0")
  })

  describe('key retention across rotations (fake keystore)', () => {
    it('a confirmed rotation from two keys ends at the newest two — the new key and the one it replaced, never itself', async () => {
      const keystore = makeFakeKeystore(twoKeyFixture())
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rotated')
      expect(result.confirmed).toBe(true)
      // Unit-level proxy for AC1 (a response encrypted to the previous key still opens after
      // rotation) — the actual decrypt is native, kid-aware (#4600), and not testable here.
      expect(mockedDeleteKey).toHaveBeenCalledTimes(1)
      expect(mockedDeleteKey).toHaveBeenCalledWith('rsa1')
      expect(mockedDeleteKey).not.toHaveBeenCalledWith('rsa2')
      expect(mockedDeleteKey).not.toHaveBeenCalledWith('rsa3')
      expect(keystore.ids()).toEqual(['rsa2', 'rsa3'])
    })

    it('keeps the registered key over a newer unregistered one', async () => {
      const keystore = makeFakeKeystore(twoKeyFixture(), [], ['rsa2'])
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rotated')
      expect(result.confirmed).toBe(true)
      // rsa2 is newer than rsa1 but was never accepted server-side; picking by timestamp alone
      // would keep it and delete the still-registered rsa1 — the bug this fixes (#4601).
      expect(keystore.ids()).toEqual(['rsa1', 'rsa3'])
      expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
      expect(mockedDeleteKey).not.toHaveBeenCalledWith('rsa1')
    })

    it('falls back to the newest local key by created when none match the server set', async () => {
      const keystore = makeFakeKeystore(twoKeyFixture())
      mockedReRegisterNewestKey.mockResolvedValueOnce({ success: true, serverKeyNs: [n(3)] })
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rotated')
      expect(result.confirmed).toBe(true)
      // IAS's last-N merge may have aged every older key out of the echo; falls back to
      // newest-by-created rather than pruning down to just the new key.
      expect(keystore.ids()).toEqual(['rsa2', 'rsa3'])
      expect(mockedDeleteKey).toHaveBeenCalledWith('rsa1')
    })

    it('the first rotation from a single key ends at both keys, nothing deleted', async () => {
      const keystore = makeFakeKeystore([{ id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }])
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rotated')
      expect(result.confirmed).toBe(true)
      expect(keystore.ids()).toEqual(['rsa1', 'rsa2'])
      expect(mockedDeleteKey).not.toHaveBeenCalled()
    })

    it('three consecutive confirmed rotations hold two keys at rest after each', async () => {
      const keystore = makeFakeKeystore([{ id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }])
      const logger = makeLogger()

      for (let i = 0; i < 3; i++) {
        const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)
        expect(result.status).toBe('rotated')
        expect(result.confirmed).toBe(true)
        expect(keystore.ids().length).toBeLessThanOrEqual(2)
      }

      expect(keystore.ids()).toEqual(['rsa3', 'rsa4'])
      // Pruning runs after generate, so once steady state is reached each rotation is
      // momentarily at three keys until its own prune completes.
      expect(keystore.maxHeld()).toBe(3)
    })

    it('a permanently undeletable key leaves the device one over the two-key bound after a confirmed rotation', async () => {
      const keystore = makeFakeKeystore(twoKeyFixture(), ['rsa1'])
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rotated')
      expect(result.confirmed).toBe(true)
      expect(keystore.ids()).toEqual(['rsa1', 'rsa2', 'rsa3'])
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=failed_prune_delete'))
    })

    it('an unconfirmed rotation leaves three keys; the next confirmed rotation prunes back to two, keeping the still-registered key', async () => {
      // rsa2 comes from the unconfirmed rotation and is never accepted server-side (modelled via
      // unregisteredIds) — the point being that "newest of the other two" (rsa2) must NOT win
      // over "still in the server's jwks" (rsa1) just because it's more recent (#4601).
      const keystore = makeFakeKeystore([{ id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }], [], ['rsa2'])
      mockedReRegisterNewestKey.mockResolvedValueOnce({ success: true, serverKeyNs: [] })
      const logger = makeLogger()

      const result1 = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result1.status).toBe('rotated')
      expect(result1.confirmed).toBe(false)
      expect(keystore.ids()).toEqual(['rsa1', 'rsa2'])
      expect(mockedDeleteKey).not.toHaveBeenCalled()

      const result2 = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result2.status).toBe('rotated')
      expect(result2.confirmed).toBe(true)
      expect(keystore.ids()).toEqual(['rsa1', 'rsa3'])
      expect(mockedDeleteKey).toHaveBeenCalledTimes(1)
      expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
      expect(mockedDeleteKey).not.toHaveBeenCalledWith('rsa1')
    })

    describe('failure paths delete nothing', () => {
      it('createNewKeyPair throws -> failed, unconfirmed, no PUT attempted, pre-rotation keys untouched', async () => {
        const keystore = makeFakeKeystore(twoKeyFixture())
        mockedCreateNewKeyPair.mockRejectedValue(new Error('keychain unavailable'))
        const logger = makeLogger()

        const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

        expect(result).toEqual({ status: 'failed', confirmed: false })
        expect(mockedReRegisterNewestKey).not.toHaveBeenCalled()
        expect(keystore.ids()).toEqual(['rsa1', 'rsa2'])
      })

      it.each([
        ['PUT failure', { success: false }],
        ['echo mismatch', { success: true, serverKeyNs: [n(99)] }],
      ])('%s -> rolls back the new key, pre-rotation keys untouched', async (_label, putResult) => {
        const keystore = makeFakeKeystore(twoKeyFixture())
        mockedReRegisterNewestKey.mockResolvedValueOnce(putResult)
        const logger = makeLogger()

        const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

        expect(result.status).toBe('rolled_back')
        expect(result.confirmed).toBe(false)
        expect(keystore.ids()).toEqual(['rsa1', 'rsa2'])
      })

      it('unknown verdict (undecodable/empty echo) -> keeps the new key without pruning, pre-rotation keys untouched', async () => {
        const keystore = makeFakeKeystore(twoKeyFixture())
        mockedReRegisterNewestKey.mockResolvedValueOnce({ success: true, serverKeyNs: [] })
        const logger = makeLogger()

        const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

        expect(result).toEqual({ status: 'rotated', confirmed: false, newRegistrationAccessToken: undefined })
        expect(keystore.ids()).toEqual(['rsa1', 'rsa2', 'rsa3'])
        expect(mockedDeleteKey).not.toHaveBeenCalled()
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=rotated_unconfirmed_no_prune'))
      })
    })
  })

  it('persists a rotated registration_access_token via native setToken BEFORE confirm/rollback', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({
      success: true,
      newRegistrationAccessToken: 'rotated-token',
      serverKeyNs: [n(2)],
    })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.newRegistrationAccessToken).toBe('rotated-token')
    expect(mockedSetToken).toHaveBeenCalledWith(TokenType.Registration, 'rotated-token')
    // setToken must have been invoked before the confirmed-branch prune enumerates.
    expect(mockedSetToken.mock.invocationCallOrder[0]).toBeLessThan(
      mockedGetAllKeysWithPublicInfo.mock.invocationCallOrder[0]
    )
  })

  it('setToken throws while persisting the rotated registration_access_token -> logs failure but still returns the token and continues rotation', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({
      success: true,
      newRegistrationAccessToken: 'rotated-token',
      serverKeyNs: [n(2)],
    })
    mockedSetToken.mockRejectedValue(new Error('keystore unavailable'))
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    // The best-effort native persist failed, but the caller-side fallback still carries the token,
    // and the failure doesn't abort confirm/prune — rotation completes normally.
    expect(result).toEqual({ status: 'rotated', confirmed: true, newRegistrationAccessToken: 'rotated-token' })
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=failed_persist_reg_token'))
  })

  it('persists a rotated registration_access_token even when the PUT itself failed (rollback)', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: false, newRegistrationAccessToken: 'rotated-token' })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rolled_back', confirmed: false, newRegistrationAccessToken: 'rotated-token' })
    expect(mockedSetToken).toHaveBeenCalledWith(TokenType.Registration, 'rotated-token')
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
    // setToken persists the rotated reg token before rollback deletes the unregistered new key.
    expect(mockedSetToken.mock.invocationCallOrder[0]).toBeLessThan(mockedDeleteKey.mock.invocationCallOrder[0])
  })

  it('echo entirely undecodable garbage -> same as empty: rotated without pruning the new key, unconfirmed', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: ['not-valid-base64!!!'] })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('rotated')
    expect(result.confirmed).toBe(false)
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('undecodable local newKey.n with a decodable server echo -> rotated, unconfirmed, no prune (not a rollback)', async () => {
    // newKey.n itself fails to decode — a parsing surprise on our side, not evidence the server
    // rejected the key. This must NOT roll back: confirmModulusRegistered treats it as 'unknown',
    // same as an undecodable server echo.
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: 'not-valid-base64!!!', e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(1)] })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'rotated', confirmed: false, newRegistrationAccessToken: undefined })
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(mockedClearTokens).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=rotated_unconfirmed_no_prune'))
  })

  it('rollback delete throws -> failed, unconfirmed, no crash', async () => {
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: false })
    mockedDeleteKey.mockRejectedValue(new Error('E_KEYSTORE_ERROR'))
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'failed', confirmed: false, newRegistrationAccessToken: undefined })
    expect(result.confirmed).toBe(false)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=failed_rollback_delete'))
  })

  it('a prune failure of the previous key on a confirmed rotation is non-fatal — still reports rotated', async () => {
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa0', n: n(0), e: 'AQAB', created: 500 },
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
    ])
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(2)] })
    mockedDeleteKey.mockRejectedValue(new Error('E_KEYSTORE_ERROR'))
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('rotated')
    expect(result.confirmed).toBe(true)
    expect(mockedCreateNewKeyPair).toHaveBeenCalled()
    expect(mockedDeleteKey.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockedCreateNewKeyPair.mock.invocationCallOrder[0]
    )
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=failed_prune_delete'))
  })

  it('a prune enumeration failure on a confirmed rotation is non-fatal — still reports rotated', async () => {
    mockedGetAllKeysWithPublicInfo.mockRejectedValue(new Error('keystore unavailable'))
    mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
    mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(2)] })
    const logger = makeLogger()

    const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('rotated')
    expect(result.confirmed).toBe(true)
    expect(mockedCreateNewKeyPair).toHaveBeenCalled()
    expect(mockedGetAllKeysWithPublicInfo.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockedCreateNewKeyPair.mock.invocationCallOrder[0]
    )
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=failed_prune_enumerate'))
  })

  describe('clearTokens (rotation switches the JWE decryption key)', () => {
    it('clears the token cache on a confirmed rotation', async () => {
      mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
      mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(2)] })
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rotated')
      expect(mockedClearTokens).toHaveBeenCalledTimes(1)
    })

    it('clears the token cache on an unconfirmed (undecodable echo) rotation too', async () => {
      mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
      mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [] })
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rotated')
      expect(mockedClearTokens).toHaveBeenCalledTimes(1)
    })

    it('does NOT clear the token cache when rolled back (PUT failed) — the old key is still newest', async () => {
      mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
      mockedReRegisterNewestKey.mockResolvedValue({ success: false })
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rolled_back')
      expect(mockedClearTokens).not.toHaveBeenCalled()
    })

    it('does NOT clear the token cache when rolled back (echo definitively missing)', async () => {
      mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
      mockedReRegisterNewestKey.mockResolvedValue({ success: true, serverKeyNs: [n(1)] })
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('rolled_back')
      expect(mockedClearTokens).not.toHaveBeenCalled()
    })

    it('does NOT clear the token cache on failed (createNewKeyPair throws)', async () => {
      mockedCreateNewKeyPair.mockRejectedValue(new Error('keychain unavailable'))
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('failed')
      expect(mockedClearTokens).not.toHaveBeenCalled()
    })

    it('DOES clear the token cache on failed (rollback delete throws) — the unregistered new key survives and is still newest', async () => {
      mockedCreateNewKeyPair.mockResolvedValue({ id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 })
      mockedReRegisterNewestKey.mockResolvedValue({ success: false })
      mockedDeleteKey.mockRejectedValue(new Error('E_KEYSTORE_ERROR'))
      const logger = makeLogger()

      const result = await rotateSigningKey(makeApiClient(), CLIENT_ID, REG_TOKEN, logger)

      expect(result.status).toBe('failed')
      expect(mockedClearTokens).toHaveBeenCalledTimes(1)
    })
  })
})
