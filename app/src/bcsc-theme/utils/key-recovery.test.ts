/**
 * Unit tests for the 401-triggered key-recovery helper in ./key-recovery.ts.
 * These cover the conservative-realignment flow described in the
 * v3-account-reset incident:
 *
 *   - happy path: server returns a kid that matches a local rsa\d+ alias
 *     → setActiveKeyAlias is called for the match and other local kids
 *     not in the server set are pruned via deleteKey
 *   - safety guard: empty serverKids must NOT prune or reassign
 *   - no-match: server kids exist but none align locally → no mutation
 *   - orphan-is-keychain-newest (iOS-shaped regression): the only
 *     unmatched local kid happens to be the keychain-newest. The JS layer
 *     must still ask native to prune it — the native self-delete guard
 *     was relaxed to "refuse only when deleting would leave zero keys"
 *     precisely so this case succeeds.
 *   - native delete refusal is non-fatal: if native throws (e.g.
 *     E_KEY_DELETE_REFUSED_LAST), the prune loop swallows it and recovery
 *     still reports success because setActiveKeyAlias already landed.
 */

jest.mock('react-native-bcsc-core', () => ({
  getAllKeys: jest.fn(),
  setActiveKeyAlias: jest.fn(),
  deleteKey: jest.fn(),
}))

import { deleteKey, getAllKeys, setActiveKeyAlias } from 'react-native-bcsc-core'
import { performKeyRecovery } from './key-recovery'

const mockedGetAllKeys = getAllKeys as jest.MockedFunction<typeof getAllKeys>
const mockedSetActive = setActiveKeyAlias as jest.MockedFunction<typeof setActiveKeyAlias>
const mockedDeleteKey = deleteKey as jest.MockedFunction<typeof deleteKey>

const makeLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }) as any

const CLIENT_ID = 'client-abc'
const REG_TOKEN = 'rat-xyz'

const makeApiClient = (jwks: { keys: { kid: string }[] } | undefined, opts: { throws?: boolean } = {}) => {
  const get = jest.fn(async () => {
    if (opts.throws) {
      throw new Error('network down')
    }
    return { data: { client_id: CLIENT_ID, jwks } }
  })
  return {
    endpoints: { registration: 'https://example.test/device/register' },
    get,
  } as any
}

describe('performKeyRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('matches a local kid and prunes other non-server kids (happy path)', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'rsa1' }] })
    mockedGetAllKeys.mockResolvedValue([
      { id: 'rsa1', algorithm: 'RSA', size: 4096 } as any,
      { id: 'rsa2', algorithm: 'RSA', size: 4096 } as any,
    ])
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedDeleteKey.mockResolvedValue(undefined as any)
    const logger = makeLogger()

    const ok = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(ok).toBe(true)
    expect(apiClient.get).toHaveBeenCalledWith(
      `${apiClient.endpoints.registration}/${CLIENT_ID}`,
      expect.objectContaining({
        skipBearerAuth: true,
        headers: { Authorization: `Bearer ${REG_TOKEN}` },
      })
    )
    expect(mockedSetActive).toHaveBeenCalledWith('rsa1')
    expect(mockedDeleteKey).toHaveBeenCalledTimes(1)
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
  })

  it('preserves local kids that ARE in the server set (no prune)', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'rsa1' }, { kid: 'rsa2' }] })
    mockedGetAllKeys.mockResolvedValue([
      { id: 'rsa1', algorithm: 'RSA', size: 4096 } as any,
      { id: 'rsa2', algorithm: 'RSA', size: 4096 } as any,
    ])
    mockedSetActive.mockResolvedValue(undefined as any)
    const logger = makeLogger()

    const ok = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(ok).toBe(true)
    // First-listed local kid that intersects wins; the other server kid
    // remains untouched (not deleted).
    expect(mockedSetActive).toHaveBeenCalledWith('rsa1')
    expect(mockedDeleteKey).not.toHaveBeenCalled()
  })

  it('refuses to reassign or prune when server returns empty jwks', async () => {
    const apiClient = makeApiClient({ keys: [] })
    mockedGetAllKeys.mockResolvedValue([{ id: 'rsa1', algorithm: 'RSA', size: 4096 } as any])
    const logger = makeLogger()

    const ok = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(ok).toBe(false)
    expect(mockedSetActive).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('refusing to prune'))
  })

  it('returns false (and does not mutate) when no local kid matches', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'rsa9' }] })
    mockedGetAllKeys.mockResolvedValue([
      { id: 'rsa1', algorithm: 'RSA', size: 4096 } as any,
      { id: 'rsa2', algorithm: 'RSA', size: 4096 } as any,
    ])
    const logger = makeLogger()

    const ok = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(ok).toBe(false)
    expect(mockedSetActive).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no local key matches server kids'))
  })

  it('returns false when the registration probe throws', async () => {
    const apiClient = makeApiClient(undefined, { throws: true })
    const logger = makeLogger()

    const ok = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(ok).toBe(false)
    expect(mockedGetAllKeys).not.toHaveBeenCalled()
    expect(mockedSetActive).not.toHaveBeenCalled()
    expect(mockedDeleteKey).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('recovery probe failed'))
  })

  it('prunes the unmatched local kid even when it is the keychain-newest', async () => {
    // Regression test for the iOS native self-delete-refusal bug. Pre-fix,
    // the native deleteKey on iOS refused any alias whose kSecAttrCreationDate
    // was the newest, which blocked exactly the case where a stale post-reset
    // alias was sitting in the keychain as the most-recent entry. The fix
    // relaxed the native guard to "refuse only when this would leave zero
    // keys", and this test pins the behaviour: JS must still call deleteKey
    // on the unmatched newer alias.
    const apiClient = makeApiClient({ keys: [{ kid: 'rsa1' }] })
    mockedGetAllKeys.mockResolvedValueOnce([
      { id: 'rsa1', algorithm: 'RSA', size: 4096, created: 1000 } as any,
      { id: 'rsa2', algorithm: 'RSA', size: 4096, created: 2000 } as any, // keychain-newest
    ])
    // Post-prune verification re-fetches; pretend rsa2 has been removed.
    mockedGetAllKeys.mockResolvedValueOnce([{ id: 'rsa1', algorithm: 'RSA', size: 4096, created: 1000 } as any])
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedDeleteKey.mockResolvedValue(undefined as any)
    const logger = makeLogger()

    const ok = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(ok).toBe(true)
    expect(mockedSetActive).toHaveBeenCalledWith('rsa1')
    expect(mockedDeleteKey).toHaveBeenCalledTimes(1)
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
    // No post-prune mismatch error should fire since the verification mock
    // reports rsa1 as the sole (and therefore newest) key after prune.
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('swallows per-key prune failures (incl. native E_KEY_DELETE_REFUSED_LAST) and still reports success', async () => {
    const apiClient = makeApiClient({ keys: [{ kid: 'rsa1' }] })
    mockedGetAllKeys.mockResolvedValue([
      { id: 'rsa1', algorithm: 'RSA', size: 4096 } as any,
      { id: 'rsa2', algorithm: 'RSA', size: 4096 } as any,
      { id: 'rsa3', algorithm: 'RSA', size: 4096 } as any,
    ])
    mockedSetActive.mockResolvedValue(undefined as any)
    mockedDeleteKey.mockImplementation(async (alias: string) => {
      if (alias === 'rsa2') {
        // Shape mirrors what the native module rejects with — confirms the
        // prune loop treats the native last-line-of-defence guard as a
        // soft warning rather than a recovery-blocking failure.
        const err: Error & { code?: string } = new Error(
          "Refusing to delete 'rsa2': would leave the keystore with no private keys"
        )
        err.code = 'E_KEY_DELETE_REFUSED_LAST'
        throw err
      }
      return undefined as any
    })
    const logger = makeLogger()

    const ok = await performKeyRecovery(apiClient, CLIENT_ID, REG_TOKEN, logger)

    expect(ok).toBe(true)
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa2')
    expect(mockedDeleteKey).toHaveBeenCalledWith('rsa3')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`failed to prune 'rsa2'`))
  })
})
