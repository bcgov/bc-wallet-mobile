import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { purgeWalletStore } from '@/bcsc-theme/features/agent/services/agent-service'
import { clearPinAttempts } from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { storage } from '@/bcsc-theme/storage'
import { nativeAccount, seedAccount, seedBCSCStore, seedTokens, withBCSCStore } from '@/bcsc-theme/storage/testing'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import * as BcscCore from 'react-native-bcsc-core'
import useRegistrationApi from './useRegistrationApi'

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')

// Other suites opt into __mocks__/useFactoryReset.tsx; this one tests the real
// implementation, so opt back out.
jest.unmock('@/bcsc-theme/api/hooks/useFactoryReset')

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('./useRegistrationApi')
jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider', () => ({
  useBCSCAgentSafe: jest.fn(),
}))
// Factory mock (not automock) so the agent-service module's heavy transitive deps
// (Credo, indy-vdr-shared, etc.) are never loaded by this hook test. Only
// purgeWalletStore is called directly by useFactoryReset now — the live-agent
// shutdown/delete path is delegated to agentCtx.teardownAgent (mocked separately).
jest.mock('@/bcsc-theme/features/agent/services/agent-service', () => ({
  purgeWalletStore: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/bcsc-theme/features/auth/services/pin-lockout-service', () => ({
  clearPinAttempts: jest.fn(),
}))
jest.mock('react-native-config', () => ({ Config: { INDY_VDR_PROXY_URL: '' } }))

type MockLogger = { info: jest.Mock; warn: jest.Mock; error: jest.Mock }

type FactoryResetSetup = {
  account?: any
  store?: any
  client?: any
  deleteRegistration?: jest.Mock
  dispatch?: jest.Mock
  clearSecureState?: jest.Mock
  deleteSecureData?: jest.Mock
}

const setupFactoryReset = (overrides: FactoryResetSetup = {}) => {
  const logger: MockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const {
    account = { clientID: 'test-client-id' },
    store = { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } },
    client = { clearTokens: jest.fn() },
    deleteRegistration = jest.fn().mockResolvedValue({ success: true }),
    dispatch = jest.fn(),
    clearSecureState = jest.fn(),
    deleteSecureData = jest.fn().mockResolvedValue(undefined),
  } = overrides

  const bcscCore = jest.mocked(BcscCore)
  const bifold = jest.mocked(Bifold)

  jest.mocked(useBCSCApiClientState).mockReturnValue({ client, isClientReady: true } as any)
  jest.mocked(useRegistrationApi).mockReturnValue({ deleteRegistration, register: jest.fn() } as any)
  jest.mocked(useSecureActions).mockReturnValue({ clearSecureState, deleteSecureData } as any)
  seedAccount(account ? nativeAccount(account) : null)
  bifold.useStore.mockReturnValue(withBCSCStore([store, dispatch]))
  // The registration access token lives with the registration, which needs an account
  if (account && store?.bcscSecure?.registrationAccessToken) {
    seedTokens({ registrationAccessToken: store.bcscSecure.registrationAccessToken })
  }
  bifold.useServices.mockReturnValue([logger] as any)

  return { bcscCore, logger, deleteRegistration, dispatch, clearSecureState, deleteSecureData }
}

// The PIN is found through these
const pinAccount = { accountId: 'test-account-id', issuer: 'https://idsit.gov.bc.ca/device/' }

// The store's removeProfile, still removing, so a test can check when it ran
const spyOnRemoveProfile = () => {
  const removeProfile = jest.fn(storage.store.getState().account.removeProfile)
  seedBCSCStore({ account: { removeProfile } })
  return removeProfile
}

const walletPurgeStore = {
  bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [], walletKey: 'stale-wallet-key' },
  preferences: { selectedMediator: 'https://mediator.example', walletName: 'BC Wallet' },
  developer: { enableProxy: false },
}

describe('useFactoryReset', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(useBCSCAgentSafe).mockReturnValue(null)
  })

  it('should factory reset the device when successful', async () => {
    const { bcscCore, deleteRegistration, clearSecureState, deleteSecureData } = setupFactoryReset()

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (!result.success) {
        throw new Error(`Factory reset failed: ${result.error?.message}`)
      }
      expect(result.success).toBe(true)
    })

    expect(deleteRegistration).toHaveBeenCalledWith('token', 'test-client-id')
    expect(bcscCore.deletePIN).toHaveBeenCalledWith(pinAccount)
    expect(deleteSecureData).toHaveBeenCalledWith()
    expect(storage.store.getState().account.profile).toBeUndefined()
    expect(bcscCore.clearAllKeychainData).toHaveBeenCalledWith()
    expect(clearSecureState).toHaveBeenCalledWith()
    expect(storage.store.getState().session.didAuthenticate).toBe(false)
  })

  it('forgets the wrong PIN attempts once the account is removed, before the state is cleared', async () => {
    const { logger, clearSecureState } = setupFactoryReset()
    const removeProfile = spyOnRemoveProfile()

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      await hook.result.current()
    })

    const clearedAt = jest.mocked(clearPinAttempts).mock.invocationCallOrder[0]

    expect(clearPinAttempts).toHaveBeenCalledTimes(1)
    expect(clearPinAttempts).toHaveBeenCalledWith(logger)
    expect(removeProfile.mock.invocationCallOrder[0]).toBeLessThan(clearedAt)
    expect(clearedAt).toBeLessThan(jest.mocked(clearSecureState).mock.invocationCallOrder[0])
  })

  it('awaits agentCtx.teardownAgent before clearing state when a live agent exists', async () => {
    // A manually-resolved deferred promise, rather than a callOrder array pushed to
    // from inside async mock bodies. Timing-based approaches (an internal `await
    // Promise.resolve()`, or even a macrotask `await new Promise(setTimeout)`) are
    // unreliable here: whether or not the call site actually awaits
    // agentCtx.teardownAgent(), the rest of the reset's own await chain
    // (removeAccountArtifacts -> deleteRegistration/deletePIN/clearAllKeychainData, then
    // removeProfile/deleteSecureData) gives a fire-and-forget call's continuation plenty of scheduler
    // turns to resolve before assertion time anyway — so a timing-only test can't
    // distinguish "awaited" from "dropped await". Holding teardownAgent open until we
    // explicitly resolve it, and asserting nothing past it has run in the meantime,
    // proves the call site actually blocks on it regardless of scheduling.
    let resolveTeardown: () => void = () => undefined
    const teardownPromise = new Promise<void>((resolve) => {
      resolveTeardown = resolve
    })
    const teardownAgentMock = jest.fn().mockReturnValue(teardownPromise)

    const agent = { id: 'agent' } as any
    jest.mocked(useBCSCAgentSafe).mockReturnValue({
      agent,
      loading: false,
      error: null,
      retry: jest.fn(),
      resetWallet: jest.fn(),
      teardownAgent: teardownAgentMock,
      waitForAgent: jest.fn().mockResolvedValue(agent),
    })

    const { deleteRegistration, clearSecureState } = setupFactoryReset()

    const hook = renderHook(() => useFactoryReset())

    let resultPromise!: ReturnType<typeof hook.result.current>
    act(() => {
      resultPromise = hook.result.current()
    })

    // Flush several microtask turns without resolving teardownPromise. If the call site
    // dropped its `await`, execution falls through to removeAccountArtifacts (and on to
    // clearSecureState) regardless of whether teardownAgent has settled — deleteRegistration
    // would already have been called by now.
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve()
      }
    })

    expect(deleteRegistration).not.toHaveBeenCalled()
    expect(clearSecureState).not.toHaveBeenCalled()

    resolveTeardown()

    const result = await act(async () => resultPromise)

    expect(result.success).toBe(true)
    expect(teardownAgentMock).toHaveBeenCalledTimes(1)
    expect(deleteRegistration).toHaveBeenCalled()
    expect(clearSecureState).toHaveBeenCalled()
  })

  it('clears the account before the session, then logs out', async () => {
    seedBCSCStore({
      account: {
        profile: { accountId: 'a', issuer: 'i', securityMethod: 'app_pin_no_device_authn' as never },
      },
      session: { didAuthenticate: true },
    })
    const callOrder: string[] = []
    const clearSecureState = jest.fn(() => {
      callOrder.push(storage.store.getState().account.profile ? 'clearSecureState, account kept' : 'clearSecureState')
    })
    const unsubscribe = storage.store.subscribe((state, previous) => {
      if (previous.session.didAuthenticate && !state.session.didAuthenticate) {
        callOrder.push('logged out')
      }
    })

    setupFactoryReset({ clearSecureState })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })
    unsubscribe()

    // hasAccount (the profile) must go false before the session clears, so RootStack short-circuits to
    // OnboardingStack before it ever derives showVerifyStack. This is what prevents the transient MainStack
    // mount described in #4336.
    expect(callOrder).toStrictEqual(['clearSecureState', 'logged out'])
  })

  it('purges an orphaned wallet store when no live agent is held but a wallet key exists', async () => {
    // Repro: reset wallet, then remove the account before the agent finishes
    // re-initializing. The provider's `agent` is transiently null, but the
    // interrupted init may have written an on-disk store keyed with the wallet
    // key that account removal is about to make underivable. Factory reset must
    // delete it via the throwaway-agent path or it orphans the store forever.
    setupFactoryReset({ store: walletPurgeStore })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    // Deleted via a throwaway agent keyed with the stale wallet secret, never the
    // (absent) live agent.
    expect(purgeWalletStore).toHaveBeenCalledTimes(1)
    expect(purgeWalletStore).toHaveBeenCalledWith(
      expect.objectContaining({ walletSecret: expect.objectContaining({ key: 'stale-wallet-key' }) })
    )
    expect(storage.store.getState().account.profile).toBeUndefined()
  })

  it('does not fail the reset if the orphaned-store purge throws', async () => {
    jest.mocked(purgeWalletStore).mockRejectedValue(new Error('build boom'))

    const { logger } = setupFactoryReset({ store: walletPurgeStore })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('orphaned wallet store purge failed'),
      expect.objectContaining({ error: expect.any(Error) })
    )
  })

  it.todo('should factory reset with custom state when provided')

  it('should not warn or delete the registration when the account is null', async () => {
    const { bcscCore, logger, deleteRegistration } = setupFactoryReset({
      account: null,
      store: { bcscSecure: { additionalEvidenceData: [] } },
    })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('FactoryReset: No BCSC account found')
    expect(deleteRegistration).not.toHaveBeenCalled()
    expect(bcscCore.deletePIN).not.toHaveBeenCalled()
    // Keychain data can outlive an app reinstall even when no local account file
    // remains, so the wipe must still run in this branch.
    expect(bcscCore.clearAllKeychainData).toHaveBeenCalledWith()
  })

  it('does not fail the reset if clearing Keychain data throws', async () => {
    const { bcscCore, logger } = setupFactoryReset()
    bcscCore.clearAllKeychainData.mockRejectedValue(new Error('keychain boom'))

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to clear Keychain data'),
      expect.objectContaining({ message: 'keychain boom' })
    )
  })

  it('should log a warning if IAS account deletion fails', async () => {
    const { logger, deleteRegistration } = setupFactoryReset({
      deleteRegistration: jest.fn().mockResolvedValue({ success: false }),
    })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(deleteRegistration).toHaveBeenCalledWith('token', 'test-client-id')
    expect(logger.warn).toHaveBeenCalledWith('FactoryReset: Failed to delete IAS account from server')
  })

  // Deleting the IAS registration is documented as non-blocking: a throw here must be
  // logged and the rest of the reset must still run.
  it('should warn but still complete the reset when deleting the registration throws', async () => {
    const { logger, clearSecureState } = setupFactoryReset({
      deleteRegistration: jest.fn().mockRejectedValue(new Error('boom')),
    })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(logger.warn).toHaveBeenCalledWith(
      'FactoryReset: Error occurred while deleting registration',
      expect.objectContaining({ error: expect.any(Error) })
    )
    expect(clearSecureState).toHaveBeenCalled()
  })

  it('should return an error if local account file deletion fails', async () => {
    const { bcscCore, deleteRegistration } = setupFactoryReset()
    seedBCSCStore({ account: { removeProfile: jest.fn().mockRejectedValue(new Error('Failed to remove account')) } })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()

      expect(result).toMatchObject({
        success: false,
        error: { message: expect.stringContaining('Failed to remove account') },
      })
    })

    expect(deleteRegistration).toHaveBeenCalledWith('token', 'test-client-id')
    expect(bcscCore.deletePIN).toHaveBeenCalledWith(pinAccount)
    expect(storage.store.getState().account.removeProfile).toHaveBeenCalled()
    // The account and its PIN are still there, so a lock on that PIN must stay
    expect(clearPinAttempts).not.toHaveBeenCalled()
  })
})

describe('useFactoryReset when clearing stored state fails', () => {
  it('still clears the session and logs out', async () => {
    const { clearSecureState, logger } = setupFactoryReset()
    seedBCSCStore({
      session: { didAuthenticate: true },
      app: { clear: jest.fn().mockRejectedValue(new Error('disk')) },
    })

    const hook = renderHook(() => useFactoryReset())
    await act(async () => {
      await hook.result.current()
    })

    expect(clearSecureState).toHaveBeenCalled()
    expect(storage.store.getState().session.didAuthenticate).toBe(false)
    expect(logger.error).toHaveBeenCalledWith('FactoryReset: Failed to clear stored state', expect.any(Error))
  })
})
