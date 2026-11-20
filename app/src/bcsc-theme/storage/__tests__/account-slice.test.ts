import { AccountSecurityMethod } from 'react-native-bcsc-core'
import { createTestEnv } from './test-env'

const openFresh = async () => {
  const env = createTestEnv({})
  await env.storage.open()
  return env
}

const newProfile = {
  clientId: '',
  issuer: 'https://idsit.gov.bc.ca/device/',
  securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
}

describe('account.createProfile', () => {
  it('gives the new account an ID and saves it', async () => {
    const env = await openFresh()

    const created = await env.storage.store.getState().account.createProfile(newProfile)

    expect(created.accountId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(env.storage.store.getState().account.profile).toEqual(created)
    expect(env.dump().encrypted['account/profile']).toEqual(created)
  })

  it('gives each new account its own ID', async () => {
    const env = await openFresh()
    const { createProfile } = env.storage.store.getState().account

    const first = await createProfile(newProfile)
    const second = await createProfile(newProfile)

    expect(second.accountId).not.toBe(first.accountId)
  })
})

describe('account.removeProfile', () => {
  it('removes the stored profile, so there is no account', async () => {
    const env = await openFresh()
    await env.storage.store.getState().account.createProfile(newProfile)

    await env.storage.store.getState().account.removeProfile()

    expect(env.storage.store.getState().account.profile).toBeUndefined()
    expect(env.dump().encrypted['account/profile']).toBeUndefined()
  })
})

describe('account.keepTokensInMemory', () => {
  it('holds tokens whose save failed for the session, leaving the stored ones', async () => {
    const env = await openFresh()
    await env.storage.store.getState().account.setTokens({ refreshToken: 'old-refresh' })
    const stored = env.dump().keychain['account/tokens']

    env.storage.store.getState().account.keepTokensInMemory({ refreshToken: 'new-refresh' })

    expect(env.storage.store.getState().account.tokens?.refreshToken).toBe('new-refresh')
    expect(env.dump().keychain['account/tokens']).toEqual(stored)
  })
})
