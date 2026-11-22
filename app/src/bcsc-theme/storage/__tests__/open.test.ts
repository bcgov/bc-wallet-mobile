import { AccountSecurityMethod } from 'react-native-bcsc-core'
import { createTestEnv } from './test-env'

const nativeAccount = {
  id: 'account-1',
  issuer: 'https://idsit.gov.bc.ca/device/',
  clientID: 'client-1',
  securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
  nickname: 'Bryce',
}

describe('storage.open', () => {
  it('stamps a fresh install with the latest version and loads defaults', async () => {
    const env = createTestEnv()
    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.device.plain.getString('meta/version')).toBe('3')
    const state = env.storage.store.getState()
    expect(state.preferences.autoLockTime).toBe(5)
    expect(state.account.profile).toBeUndefined()
  })

  it('wipes keychain leftovers on a fresh install', async () => {
    const env = createTestEnv({ keychain: { 'bcsc.leftover': 'x' } })
    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.device.keychain.has('bcsc.leftover')).toBe(false)
  })

  it('imports the native account into the profile (m0002)', async () => {
    const env = createTestEnv({ native: { account: { status: 'ok', value: nativeAccount } } })
    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.storage.store.getState().account.profile).toEqual({
      accountId: 'account-1',
      clientId: 'client-1',
      issuer: nativeAccount.issuer,
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
      nickname: 'Bryce',
    })
  })

  it('returns locked while the device is locked, then opens after it unlocks', async () => {
    const env = createTestEnv({ native: { account: { status: 'locked' } } })
    expect(await env.storage.open()).toEqual({ status: 'locked' })
    env.device.native.account = { status: 'ok', value: nativeAccount }
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'ok' })
  })

  it('never treats an unreadable native account as a fresh install', async () => {
    const env = createTestEnv({ native: { account: { status: 'unreadable', reason: 'decode' } } })
    expect(await env.storage.open()).toEqual({ status: 'not-ready', reason: 'legacy-unreadable' })
    expect(env.device.plain.getString('meta/version')).toBeUndefined()
  })

  it('stops at m0002 on an unreadable native record', async () => {
    const env = createTestEnv({
      native: { account: { status: 'ok', value: nativeAccount }, tokens: { status: 'unreadable', reason: 'io' } },
    })
    expect(await env.storage.open()).toEqual({ status: 'migration-failed', step: 'move-native-data', attempts: 1 })
  })

  it('refuses to write a key that loaded unreadable', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.keychain.set('account/tokens', '{not json')
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'unreadable', keys: ['account/tokens'] })
    await expect(env.storage.store.getState().account.setTokens({ refreshToken: 'r' })).rejects.toThrow(
      'Refusing to write unreadable key account/tokens'
    )
  })

  it('reports a missing encryption key on a finished store as not ready', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.keychain.delete('meta/encryption-key')
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'not-ready', reason: 'key-missing' })
  })

  it('reports a wrong encryption key as not ready', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.keychain.set('meta/encryption-key', 'a-different-key-of-32-characters')
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'not-ready', reason: 'wrong-key' })
  })

  it('blocks with please-update on a newer storage version', async () => {
    const env = createTestEnv({ plain: { 'meta/version': '99' } })
    expect(await env.storage.open()).toEqual({ status: 'newer-version' })
  })

  it('reads a null property in a stored value as absent', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.secure?.store.set(
      'account/profile',
      JSON.stringify({
        accountId: 'account-1',
        clientId: 'client-1',
        issuer: nativeAccount.issuer,
        securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
        nickname: null,
        displayName: null,
      })
    )
    env.restart()

    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.storage.store.getState().account.profile).toEqual({
      accountId: 'account-1',
      clientId: 'client-1',
      issuer: nativeAccount.issuer,
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    })
  })

  it('falls back to defaults for unreadable preferences', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.plain.set('preferences', '{not json')
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.storage.store.getState().preferences.autoLockTime).toBe(5)
    expect(env.logger.warn).toHaveBeenCalledWith('storage key unreadable, using initial value: preferences')
  })

  it('blocks on an unreadable app key', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.plain.set('app', '{"analyticsOptIn":"yes"}')
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'unreadable', keys: ['app'] })
  })

  it('blocks when a key sits in the other MMKV instance', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.plain.set('contacts', '{"pinned":[],"alternateNames":{}}')
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'unreadable', keys: ['contacts'] })
  })
})

describe('slice actions', () => {
  it('save to the backend, then to the store', async () => {
    const env = createTestEnv()
    await env.storage.open()
    await env.storage.store.getState().preferences.setAutoLockTime(10)
    expect(env.storage.store.getState().preferences.autoLockTime).toBe(10)
    expect(JSON.parse(env.device.plain.getString('preferences') ?? '{}').autoLockTime).toBe(10)
  })

  it('keep the store unchanged when the backend write fails', async () => {
    const env = createTestEnv()
    await env.storage.open()
    env.device.keychainLocked = true
    const plainSet = env.device.plain.set
    env.device.plain.set = () => {
      throw new Error('disk full')
    }
    await expect(env.storage.store.getState().preferences.setAutoLockTime(15)).rejects.toThrow('disk full')
    expect(env.storage.store.getState().preferences.autoLockTime).toBe(5)
    env.device.plain.set = plainSet
  })

  it('run updates to one key in order', async () => {
    const env = createTestEnv()
    await env.storage.open()
    const { contacts } = env.storage.store.getState()
    await Promise.all([contacts.setPinned(['a']), contacts.setAlternateName('a', 'Alice')])
    expect(env.storage.store.getState().contacts).toMatchObject({ pinned: ['a'], alternateNames: { a: 'Alice' } })
  })

  it('merge token updates and save them in the keychain', async () => {
    const env = createTestEnv({ native: { account: { status: 'ok', value: nativeAccount } } })
    await env.storage.open()
    await env.storage.store.getState().account.setTokens({ refreshToken: 'refresh-1' })
    await env.storage.store.getState().account.setTokens({ accessToken: 'access-1' })
    expect(env.storage.store.getState().account.tokens).toEqual({ refreshToken: 'refresh-1', accessToken: 'access-1' })
    expect(env.dump().keychain['account/tokens']).toEqual({ refreshToken: 'refresh-1', accessToken: 'access-1' })
  })

  it('import only the bookmarked saved services (m0002)', async () => {
    const env = createTestEnv({
      native: {
        account: { status: 'ok', value: nativeAccount },
        savedServices: {
          status: 'ok',
          value: [
            { clientRefId: 's1', clientName: 'Service 1', bookmarked: true },
            { clientRefId: 's2', clientName: 'Service 2', bookmarked: false },
          ],
        },
      },
    })
    await env.storage.open()
    expect(env.storage.store.getState().savedServices.ids).toEqual(['s1'])
    await env.storage.store.getState().savedServices.setBookmarked('s1', false)
    expect(env.dump().encrypted.savedServices).toEqual({ ids: [] })
  })
})

describe('storage.wipe', () => {
  it('leaves a device that opens as a fresh install', async () => {
    const env = createTestEnv({
      native: { account: { status: 'ok', value: nativeAccount } },
      async: { BCSC: { installId: 'install-1', analyticsOptIn: true } },
    })
    await env.storage.open()
    await env.storage.wipe()
    expect(env.storage.store.getState().account.profile).toBeUndefined()
    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.storage.store.getState().app.installId).toBeUndefined()
    expect(env.device.async.has('BCSC')).toBe(false)
  })

  it('is finished by the next open() when interrupted', async () => {
    const env = createTestEnv({ native: { account: { status: 'ok', value: nativeAccount } } })
    await env.storage.open()
    env.device.plain.set('meta/wipe-in-progress', '1')
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.storage.store.getState().account.profile).toBeUndefined()
  })
})

describe('storage.clearKeychain', () => {
  const openWithTokens = async () => {
    const env = createTestEnv({ native: { account: { status: 'ok', value: nativeAccount } } })
    await env.storage.open()
    await env.storage.store.getState().account.setTokens({ refreshToken: 'refresh-1' })
    return env
  }

  it('keeps the encrypted store readable after a relaunch, and the tokens deleted', async () => {
    const env = await openWithTokens()
    await env.storage.clearKeychain()
    expect(env.device.keychain.has('account/tokens')).toBe(false)
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'ok' })
    expect(env.storage.store.getState().account.profile?.accountId).toBe('account-1')
  })

  it('is needed: clearing the keychain alone leaves the store unreadable', async () => {
    const env = await openWithTokens()
    env.device.keychain.clear()
    env.restart()
    expect(await env.storage.open()).toEqual({ status: 'not-ready', reason: 'key-missing' })
  })

  it('clears nothing while the key cannot be read', async () => {
    const env = await openWithTokens()
    env.device.keychainLocked = true
    await expect(env.storage.clearKeychain()).rejects.toThrow('encryption key is locked')
    env.device.keychainLocked = false
    expect(env.device.keychain.has('meta/encryption-key')).toBe(true)
    expect(env.device.keychain.has('account/tokens')).toBe(true)
  })
})
