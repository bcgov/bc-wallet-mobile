/**
 * Unit tests for the modulus-matching key-recovery flow (issue #4166).
 *
 * Matching is done purely on RSA modulus BYTES (see jwk-modulus.ts) — kid is never used for
 * matching, because device kids drift across migrations and the server verifies a signature
 * by trying ALL stored keys, so only the modulus determines validity. A kid-string match can
 * both activate the wrong key AND prune the right one (see the regression test below).
 *
 * Covers:
 *   - happy path: server jwks contains a modulus that matches a local key (by bytes, not kid)
 *     → recovered + setActiveKeyAlias(match) + non-matching local keys pruned
 *   - regression: a local alias string-equals a server kid, but its modulus does NOT match —
 *     a different local key holds the matching modulus. Modulus wins; the kid-coincident key
 *     is pruned.
 *   - no match: no local key's modulus is in the server set → no_match, zero mutation
 *   - empty/all-undecodable server jwks → failed, no local-key fetch, no mutation
 *   - hard post-prune gate: if pruning a newer unmatched key is rejected, recovery reports
 *     'failed' (not 'recovered') because the matched key isn't unambiguously newest afterward
 *   - a prune failure for an OLDER (non-newest) unmatched key is tolerated — still 'recovered'
 *   - a rotated registration_access_token from the GET is surfaced regardless of outcome
 *   - reRegisterNewestKey: PUTs client_id+scope with the Bearer reg token, returns any rotated
 *     token, and never deletes a key
 */

jest.mock('react-native-bcsc-core', () => ({
  getAllKeys: jest.fn(),
  getAllKeysWithPublicInfo: jest.fn(),
  setActiveKeyAlias: jest.fn(),
  deleteKey: jest.fn(),
  getAccount: jest.fn(),
  getDynamicClientRegistrationBody: jest.fn(),
}))

jest.mock('./push-notification-tokens', () => ({
  getNotificationTokens: jest.fn().mockResolvedValue({ fcmDeviceToken: 'fcm-token', deviceToken: 'device-token' }),
}))

import {
  deleteKey,
  getAccount,
  getAllKeys,
  getAllKeysWithPublicInfo,
  getDynamicClientRegistrationBody,
  setActiveKeyAlias,
} from 'react-native-bcsc-core'
import { performKeyRecovery, reRegisterNewestKey } from './key-recovery'

const mockedGetAllKeys = getAllKeys as jest.MockedFunction<typeof getAllKeys>
const mockedGetAllKeysWithPublicInfo = getAllKeysWithPublicInfo as jest.MockedFunction<typeof getAllKeysWithPublicInfo>
const mockedSetActive = setActiveKeyAlias as jest.MockedFunction<typeof setActiveKeyAlias>
const mockedDeleteKey = deleteKey as jest.MockedFunction<typeof deleteKey>
const mockedGetAccount = getAccount as jest.MockedFunction<typeof getAccount>
const mockedGetDCRBody = getDynamicClientRegistrationBody as jest.MockedFunction<
  typeof getDynamicClientRegistrationBody
>

const makeLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }) as any

const CLIENT_ID = 'client-abc'
const REG_TOKEN = 'rat-xyz'

/** Distinct, decodable "modulus" values for test fixtures — the exact encoding doesn't matter
 * here (cross-encoding tolerance is covered by jwk-modulus.test.ts); only distinctness does. */
const n = (seed: number) => Buffer.from([0xaa, seed]).toString('base64')

const makeApiClient = (
  jwks: { keys: { kid?: string; n?: string }[] } | undefined,
  opts: { throws?: boolean; registrationAccessToken?: string } = {}
) => {
  const get = jest.fn(async () => {
    if (opts.throws) {
      throw new Error('network down')
    }
    return { data: { client_id: CLIENT_ID, jwks, registration_access_token: opts.registrationAccessToken } }
  })
  const put = jest.fn(async () => ({ data: { registration_access_token: opts.registrationAccessToken } }))
  return {
    endpoints: { registration: 'https://example.test/device/register' },
    get,
    put,
  } as any
}

describe('performKeyRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('matches a local key on modulus (not kid) and prunes non-server-matching keys (happy path)', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid-1', n: n(1) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
    ] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedDeleteKey.mockResolvedValue(undefined as any)
    mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: 1000 } as any])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'recovered', newRegistrationAccessToken: undefined })
    expect(apiClient.get).toHaveBeenCalledWith(
      `${apiClient.endpoints.registration}/${CLIENT_ID}`,
      expect.objectContaining({
        skipBearerAuth: true,
        // silent background probe: a failure must not fire the client's global onError handler
        skipOnErrorHandler: true,
        headers: { Authorization: `Bearer ${REG_TOKEN}` },
      })
    )
    expect(mockedSetActive).toHaveBeenCalledWith('rsa1')
    expect(mockedDeleteKey).toHaveBeenCalledTimes(1)
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
    // No post-prune mismatch error should fire since the verification mock reports rsa1 as the
    // sole (and therefore newest) key after prune.
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('never deletes a local key whose OWN modulus fails to decode — treats "unknown" as distinct from "confirmed absent"', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: n(1) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 3000 }, // matched, newest
      { id: 'rsa_corrupt', n: 'not-valid-base64!!!', e: 'AQAB', created: 500 }, // undecodable, older
    ] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedGetAllKeys.mockResolvedValue([
      { id: 'rsa1', created: 3000 } as any,
      { id: 'rsa_corrupt', created: 500 } as any,
    ])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    // rsa_corrupt is left in place rather than deleted, and since it isn't the newest key it
    // doesn't block the post-prune gate either — recovery still succeeds.
    expect(result.status).toBe('recovered')
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`local key 'rsa_corrupt' has an undecodable modulus; skipping`)
    )
  })

  it('an undecodable local key that IS the keychain-newest still blocks the post-prune gate (never deleted, but recovery correctly reports failed)', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: n(1) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }, // matched
      { id: 'rsa_corrupt', n: 'not-valid-base64!!!', e: 'AQAB', created: 2000 }, // undecodable, newer
    ] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    // rsa_corrupt was never deleted, so it's still present and still keychain-newest.
    mockedGetAllKeys.mockResolvedValue([
      { id: 'rsa1', created: 1000 } as any,
      { id: 'rsa_corrupt', created: 2000 } as any,
    ])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    // The safety fix (never delete on "can't tell") composes correctly with the hard post-prune
    // gate: recovery is honestly reported as failed rather than falsely 'recovered', since the
    // undecodable key is still the one that would actually get used for signing.
    expect(result.status).toBe('failed')
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=post_prune_active_mismatch'))
  })

  it('preserves local keys whose modulus IS in the server set (recent-previous versions, no prune)', async () => {
    const apiClient = makeApiClient({
      keys: [
        { kid: 'a', n: n(1) },
        { kid: 'b', n: n(2) },
      ],
    })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
    ] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedGetAllKeys.mockResolvedValue([{ id: 'rsa2', created: 2000 } as any])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('recovered')
    // Newest-created local match wins.
    expect(mockedSetActive).toHaveBeenCalledWith('rsa2')
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('regression: a local alias string-equals a server kid but its modulus differs — the OTHER local key holding the matching modulus wins, and the kid-coincident key is pruned', async () => {
    // Server holds kid 'rsa1' — but with a DIFFERENT modulus than local alias 'rsa1' actually holds.
    const apiClient = makeApiClient({ keys: [{ kid: 'rsa1', n: n(9) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }, // kid-coincident, WRONG modulus
      { id: 'rsa7', n: n(9), e: 'AQAB', created: 3000 }, // different alias, matches server modulus
    ] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedDeleteKey.mockResolvedValue(undefined as any)
    mockedGetAllKeys.mockResolvedValue([{ id: 'rsa7', created: 3000 } as any])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('recovered')
    expect(mockedSetActive).toHaveBeenCalledWith('rsa7')
    expect(mockedSetActive).not.toHaveBeenCalledWith('rsa1')
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa1')
    expect(mockedDeleteKey).not.toHaveBeenCalledWith('rsa7')
  })

  it('returns no_match (and mutates nothing) when no local key modulus is in the server set', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: n(99) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 },
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 },
    ] as any)
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'no_match', newRegistrationAccessToken: undefined })
    expect(mockedSetActive).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=failed_no_match'))
  })

  it('returns failed (no local-key fetch, no mutation) when server jwks is empty', async () => {
    const apiClient = makeApiClient({ keys: [] })
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'failed', newRegistrationAccessToken: undefined })
    expect(mockedGetAllKeysWithPublicInfo).not.toHaveBeenCalled()
    expect(mockedSetActive).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event=failed_empty_jwks'))
  })

  it('treats an all-undecodable server jwks the same as empty (failed, no local-key fetch)', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: 'not-valid-base64!!!' }] })
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('failed')
    expect(mockedGetAllKeysWithPublicInfo).not.toHaveBeenCalled()
  })

  it('fails recovery when pruning a newer unmatched key is rejected (hard post-prune gate)', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: n(1) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }, // matched
      { id: 'rsa2', n: n(2), e: 'AQAB', created: 2000 }, // unmatched AND newer — prune will be rejected
    ] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedDeleteKey.mockRejectedValue(new Error("Refusing to delete 'rsa2': would leave no private keys"))
    // Prune was rejected, so rsa2 is still present and still the keychain-newest.
    mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: 1000 } as any, { id: 'rsa2', created: 2000 } as any])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('failed')
    // The match + activation attempt still happened — it's the post-prune verification that fails.
    expect(mockedSetActive).toHaveBeenCalledWith('rsa1')
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=post_prune_active_mismatch'))
  })

  it('reports failed when the post-prune verification call itself throws', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: n(1) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([{ id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedGetAllKeys.mockRejectedValue(new Error('keystore unavailable'))
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('failed')
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=post_prune_verification_failed'))
  })

  it('reports failed (not recovered) when the post-prune keystore enumerates as empty', async () => {
    // Pins a stricter-than-original behaviour: reporting zero remaining keys must never be
    // read as "success by default" just because there's no non-matching newest to compare against.
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: n(1) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([{ id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedGetAllKeys.mockResolvedValue([])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('failed')
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=post_prune_active_mismatch'))
  })

  it('tolerates a prune failure of an OLDER (non-newest) unmatched key — still recovered, native error code surfaced via describeError', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'server-kid', n: n(1) }] })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([
      { id: 'rsa1', n: n(1), e: 'AQAB', created: 3000 }, // matched, newest
      { id: 'rsa_old', n: n(2), e: 'AQAB', created: 500 }, // unmatched, oldest — prune will fail
    ] as any)
    mockedSetActive.mockResolvedValue(undefined as any)
    // Shaped like a real native-module rejection ({code, message}, not an Error instance) so
    // this also pins describeError actually surfacing the native code in the log, rather than
    // it being lost to an "[object Object]" string.
    mockedDeleteKey.mockRejectedValue({
      code: 'E_KEY_DELETE_REFUSED_LAST',
      message: "Refusing to delete 'rsa_old': would leave the keystore with no private keys",
    })
    // Even though the prune failed, rsa1 is still (and was always) the newest remaining key.
    mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', created: 3000 } as any, { id: 'rsa_old', created: 500 } as any])
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('recovered')
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`failed to prune 'rsa_old': E_KEY_DELETE_REFUSED_LAST: Refusing to delete`)
    )
  })

  it('surfaces a rotated registration_access_token from the GET response regardless of match outcome', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'x', n: n(99) }] }, { registrationAccessToken: 'rotated-token' })
    mockedGetAllKeysWithPublicInfo.mockResolvedValue([{ id: 'rsa1', n: n(1), e: 'AQAB', created: 1000 }] as any)
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result.status).toBe('no_match')
    expect(result.newRegistrationAccessToken).toBe('rotated-token')
  })

  it('returns failed when the registration probe throws', async () => {
    const apiClient = makeApiClient(undefined, { throws: true })
    const logger = makeLogger()

    const result = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(result).toEqual({ status: 'failed', newRegistrationAccessToken: undefined })
    expect(mockedGetAllKeysWithPublicInfo).not.toHaveBeenCalled()
    expect(mockedSetActive).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('event=failed_probe'))
  })
})

describe('reRegisterNewestKey', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('PUTs client_id + scope with the Bearer reg token and returns a rotated token; never deletes a key', async () => {
    mockedGetAccount.mockResolvedValue({ nickname: 'My Phone' } as any)
    mockedGetDCRBody.mockResolvedValue(JSON.stringify({ client_name: 'My Phone', jwks: { keys: [{ n: n(1) }] } }))
    const apiClient = makeApiClient(undefined, { registrationAccessToken: 'rotated-put-token' })

    const result = await reRegisterNewestKey(apiClient, CLIENT_ID, REG_TOKEN, makeLogger())

    expect(result).toEqual({ success: true, newRegistrationAccessToken: 'rotated-put-token' })
    expect(apiClient.put).toHaveBeenCalledWith(
      `${apiClient.endpoints.registration}/${CLIENT_ID}`,
      expect.objectContaining({
        client_id: CLIENT_ID,
        scope: 'openid profile email address offline_access',
      }),
      expect.objectContaining({
        skipBearerAuth: true,
        // silent background re-registration: a failure must not fire the global onError handler
        skipOnErrorHandler: true,
        headers: { Authorization: `Bearer ${REG_TOKEN}` },
      })
    )
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('returns failed (without throwing) when the native DCR body is null', async () => {
    mockedGetAccount.mockResolvedValue(null)
    mockedGetDCRBody.mockResolvedValue(null)
    const apiClient = makeApiClient(undefined)

    const result = await reRegisterNewestKey(apiClient, CLIENT_ID, REG_TOKEN, makeLogger())

    expect(result).toEqual({ success: false })
    expect(apiClient.put).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('returns failed (without throwing) when the PUT request fails', async () => {
    mockedGetAccount.mockResolvedValue({ nickname: 'My Phone' } as any)
    mockedGetDCRBody.mockResolvedValue(JSON.stringify({ client_name: 'My Phone' }))
    const apiClient = makeApiClient(undefined)
    apiClient.put.mockRejectedValue(new Error('server unavailable'))

    const result = await reRegisterNewestKey(apiClient, CLIENT_ID, REG_TOKEN, makeLogger())

    expect(result).toEqual({ success: false })
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('returns failed (without throwing) when the DCR body cannot be parsed as JSON', async () => {
    mockedGetAccount.mockResolvedValue({ nickname: 'My Phone' } as any)
    mockedGetDCRBody.mockResolvedValue('not valid json {{{')
    const apiClient = makeApiClient(undefined)

    const result = await reRegisterNewestKey(apiClient, CLIENT_ID, REG_TOKEN, makeLogger())

    expect(result).toEqual({ success: false })
    expect(apiClient.put).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })
})
