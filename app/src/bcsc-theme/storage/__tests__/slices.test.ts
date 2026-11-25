import { VerificationRequestStatus } from '@/constants'
import { initialState } from '@/store'
import { AccountSecurityMethod } from 'react-native-bcsc-core'
import { createTestEnv } from './test-env'

// The real view, not the Jest stand-in from jestSetup.js
const { overlayBCSCState } = jest.requireActual<typeof import('../state-view')>('../state-view')

const openEnv = async (input = {}) => {
  const env = createTestEnv(input)
  await env.storage.open()
  return env
}

describe('session slice', () => {
  it('ignores a late pending status once a decision is recorded', async () => {
    const env = await openEnv()
    const { session } = env.storage.store.getState()

    session.verificationStatusReceived({ status: VerificationRequestStatus.VERIFIED })
    env.storage.store.getState().session.verificationStatusReceived({ status: VerificationRequestStatus.PENDING })

    expect(env.storage.store.getState().session.verificationRequestStatus).toBe(VerificationRequestStatus.VERIFIED)
  })

  it('keeps the message only for a cancelled request', async () => {
    const env = await openEnv()
    env.storage.store
      .getState()
      .session.verificationStatusReceived({ status: VerificationRequestStatus.CANCELLED, status_message: 'why' })
    expect(env.storage.store.getState().session.verificationRequestStatusMessage).toBe('why')

    env.storage.store.getState().session.clearVerificationStatus()
    env.storage.store
      .getState()
      .session.verificationStatusReceived({ status: VerificationRequestStatus.PENDING, status_message: 'ignored' })
    expect(env.storage.store.getState().session).toMatchObject({
      verificationRequestStatus: VerificationRequestStatus.PENDING,
      verificationRequestStatusMessage: undefined,
    })
  })

  it('never stores an unrecognised status', async () => {
    const env = await openEnv()
    env.storage.store.getState().session.verificationStatusReceived({ status: 'something-new' as never })
    expect(env.storage.store.getState().session.verificationRequestStatus).toBeUndefined()
  })

  // #5137: deactivation outlives the verify flow, so entering the flow leaves it as it is
  it('keeps the deactivated record through entering the verify flow', async () => {
    const env = await openEnv()
    env.storage.store.getState().session.update({ credentialDeactivated: true })
    env.storage.store.getState().session.setInVerifyFlow(true)
    expect(env.storage.store.getState().session).toMatchObject({ inVerifyFlow: true, credentialDeactivated: true })
  })

  it('drops the signed-in session on lock, keeping captured media', async () => {
    const env = await openEnv()
    env.storage.store.getState().session.update({ walletKey: 'key', photoPath: '/photo.jpg', inVerifyFlow: true })
    env.storage.store.getState().session.clearSignedIn()
    expect(env.storage.store.getState().session).toMatchObject({
      walletKey: undefined,
      inVerifyFlow: false,
      photoPath: '/photo.jpg',
    })
  })
})

describe('preferences.reconcileMediator', () => {
  it('records the build mediator on first launch', async () => {
    const env = await openEnv()
    await env.storage.store.getState().preferences.reconcileMediator('https://mediator.example')
    expect(env.storage.store.getState().preferences).toMatchObject({
      selectedMediator: 'https://mediator.example',
      availableMediators: ['https://mediator.example'],
      reconciledMediatorUrl: 'https://mediator.example',
    })
  })

  it('keeps a mediator picked in developer mode while the build mediator is unchanged', async () => {
    const env = await openEnv()
    const { preferences } = env.storage.store.getState()
    await preferences.reconcileMediator('https://build.example')
    await env.storage.store.getState().preferences.addMediator('https://dev.example')
    await env.storage.store.getState().preferences.selectMediator('https://dev.example')

    await env.storage.store.getState().preferences.reconcileMediator('https://build.example')

    expect(env.storage.store.getState().preferences.selectedMediator).toBe('https://dev.example')
  })

  it('does nothing without a build mediator', async () => {
    const env = await openEnv()
    await env.storage.store.getState().preferences.reconcileMediator(undefined)
    expect(env.device.plain.getString('preferences')).toBeUndefined()
  })
})

describe('app.clear', () => {
  it('returns to a new install, keeping the install ID', async () => {
    const env = await openEnv()
    await env.storage.store
      .getState()
      .app.update({ installId: 'install-1', analyticsOptIn: true, verificationSkipped: true })
    await env.storage.store.getState().app.clear()
    expect(env.storage.store.getState().app).toMatchObject({
      installId: 'install-1',
      analyticsOptIn: false,
      verificationSkipped: undefined,
    })
  })
})

describe('overlayBCSCState', () => {
  it('reads moved fields from the BCSC store and the rest from Bifold', async () => {
    const env = await openEnv()
    await env.storage.store.getState().app.update({ verificationSkipped: true })
    env.storage.store.getState().session.update({ walletKey: 'key' })

    const view = overlayBCSCState(
      {
        ...initialState,
        bcsc: { ...initialState.bcsc, verificationSkipped: false },
      },
      env.storage.store.getState()
    )

    expect(view.bcsc.verificationSkipped).toBe(true)
    expect(view.dismissPersonCredentialOffer).toBe(initialState.dismissPersonCredentialOffer)
    expect(view.bcscSecure.walletKey).toBe('key')
  })
})

describe('overlayBCSCState account', () => {
  const profile = {
    accountId: 'id',
    clientId: 'client',
    issuer: 'https://idsit.gov.bc.ca/device/',
    securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
  }

  it('has an account exactly when there is a profile', async () => {
    const env = await openEnv()
    expect(overlayBCSCState(initialState, env.storage.store.getState()).bcsc.hasAccount).toBe(false)

    await env.storage.store.getState().account.setProfile(profile)
    expect(overlayBCSCState(initialState, env.storage.store.getState()).bcsc.hasAccount).toBe(true)
  })

  it.each([
    ['the nickname', { nickname: 'My Wallet', displayName: 'Jane' }, 'My Wallet'],
    ['the display name without a nickname (v3 ias-ios, #4258)', { displayName: 'Jane' }, 'Jane'],
    ['nothing for a blank nickname and no display name', { nickname: '  ' }, undefined],
  ])('takes %s as the selected nickname', async (_, names, expected) => {
    const env = await openEnv()
    await env.storage.store.getState().account.setProfile({ ...profile, ...names })
    expect(overlayBCSCState(initialState, env.storage.store.getState()).bcsc.selectedNickname).toBe(expected)
  })
})
