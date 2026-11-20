import { AccountSecurityMethod } from 'react-native-bcsc-core'
import { m0002 } from '../migrations/0002-move-native-data'
import { m0003 } from '../migrations/0003-delete-legacy-data'
import { LegacyNotReadyError } from '../migrations/types'
import { createTestEnv } from './test-env'

const account = {
  id: 'account-1',
  issuer: 'https://idsit.gov.bc.ca/device/',
  clientID: 'client-1',
  securityMethod: AccountSecurityMethod.DeviceAuth,
}

describe('m0002', () => {
  it('copies native records into encrypted MMKV and the keychain', async () => {
    const env = createTestEnv({
      native: {
        account: { status: 'ok', value: account },
        tokens: { status: 'ok', value: { refresh: 'refresh-1' } },
        accountFlags: { status: 'ok', value: { isEmailVerified: true, notShowDeviceAuthenticationPrepAgain: true } },
        savedServices: {
          status: 'ok',
          value: [
            { clientRefId: 's1', bookmarked: true },
            { clientRefId: 's2', bookmarked: false },
          ],
        },
      },
    })
    await env.storage.open()
    const ctx = env.migrationContext()
    await m0002.up(ctx)
    await m0002.verify(ctx)
    const dump = env.dump()
    expect(dump.encrypted['account/profile']).toEqual({
      accountId: 'account-1',
      clientId: 'client-1',
      issuer: account.issuer,
      securityMethod: AccountSecurityMethod.DeviceAuth,
    })
    expect(dump.encrypted['verification/flags']).toEqual({ isEmailVerified: true })
    expect(dump.encrypted.savedServices).toEqual({ ids: ['s1'] })
    expect(dump.keychain['account/tokens']).toEqual({ refreshToken: 'refresh-1' })
  })

  it('imports iOS records, whose missing fields arrive as null, without the nulls', async () => {
    // iOS builds these from Swift dictionaries, so a nil nickname reaches JS as null
    const iosAccount = { ...account, nickname: null, displayName: null, didPostNicknameToServer: false }
    const credential = {
      issuer: account.issuer,
      subject: 'subject-1',
      label: 'BC Services Card',
      created: 1700000000,
      bcscEvent: 'Authorization',
      bcscReason: 'Approved',
      cardExpiry: null,
    }
    const env = createTestEnv({
      native: {
        account: { status: 'ok', value: iosAccount as never },
        credential: { status: 'ok', value: credential as never },
        authorizationRequest: { status: 'ok', value: { deviceCode: 'device-1', address: { region: null } } as never },
      },
    })

    expect(await env.storage.open()).toEqual({ status: 'ok' })

    const { account: stored, verification } = env.storage.store.getState()
    expect(stored.profile).toEqual({
      accountId: 'account-1',
      clientId: 'client-1',
      issuer: account.issuer,
      securityMethod: AccountSecurityMethod.DeviceAuth,
      didPostNicknameToServer: false,
    })
    expect(stored.credential).not.toHaveProperty('cardExpiry')
    expect(verification.request).toEqual({ deviceCode: 'device-1', address: {} })
  })

  it('fails its verify, and keeps the native originals, when an imported value would not load', async () => {
    const env = createTestEnv({
      native: { account: { status: 'ok', value: { ...account, securityMethod: 'not_a_method' } as never } },
    })

    expect(await env.storage.open()).toEqual({ status: 'migration-failed', step: 'move-native-data', attempts: 1 })
    // m0003 never ran, so Retry (or a fixed build) can import again
    expect(env.dump().native.account).toEqual({ status: 'ok', value: { ...account, securityMethod: 'not_a_method' } })
    expect(env.dump().plain['meta/version']).toBe(1)
  })

  it('stops on an unreadable record instead of importing it as empty', async () => {
    const env = createTestEnv({
      native: { account: { status: 'ok', value: account }, credential: { status: 'unreadable', reason: 'decode' } },
    })
    await env.storage.open()
    await expect(m0002.up(env.migrationContext())).rejects.toThrow(LegacyNotReadyError)
    expect(env.dump().encrypted['account/profile']).toBeUndefined()
  })
})

describe('m0003', () => {
  it('deletes the AsyncStorage keys BCSC owned and every native record', async () => {
    const env = createTestEnv({
      native: { account: { status: 'ok', value: account } },
      async: { BCSC: { installId: 'install-1' }, PinnedContacts: [], PreferencesState: { autoLockTime: 5 } },
    })
    await env.storage.open()
    const ctx = env.migrationContext()
    await m0003.up(ctx)
    await m0003.verify(ctx)
    expect(env.dump().async).toEqual({ PreferencesState: { autoLockTime: 5 } })
    expect(env.dump().native).toEqual({})
  })
})
