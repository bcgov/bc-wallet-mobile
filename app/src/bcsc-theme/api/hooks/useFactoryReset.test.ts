import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { purgeWalletStore } from '@/bcsc-theme/features/agent/services/agent-service'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { DispatchAction } from '@bifold/core'
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
jest.mock('react-native-config', () => ({ Config: { INDY_VDR_PROXY_URL: '' } }))

/* eslint-disable @typescript-eslint/no-explicit-any */

type MockLogger = { info: jest.Mock; warn: jest.Mock; error: jest.Mock }

type FactoryResetSetup = {
  account?: any
  store?: any
  logger?: MockLogger
  /** What `useServices` returns; defaults to `[logger]`, the wallet-purge path also needs ledgers. */
  services?: any[]
  client?: any
  deleteRegistration?: jest.Mock
  dispatch?: jest.Mock
  clearSecureState?: jest.Mock
  deleteSecureData?: jest.Mock
}

const setupFactoryReset = (overrides: FactoryResetSetup = {}) => {
  const logger: MockLogger = overrides.logger ?? { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const {
    account = { clientID: 'test-client-id' },
    store = { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } },
    services = [logger],
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
  bcscCore.getAccount.mockResolvedValue(account)
  bcscCore.removeAccount.mockResolvedValue(undefined)
  bifold.useStore.mockReturnValue([store, dispatch])
  bifold.useServices.mockReturnValue(services as any)

  return { bcscCore, logger, deleteRegistration, dispatch, clearSecureState, deleteSecureData }
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
    const { bcscCore, deleteRegistration, dispatch, clearSecureState, deleteSecureData } = setupFactoryReset()

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (!result.success) {
        throw new Error(`Factory reset failed: ${result.error?.message}`)
      }
      expect(result.success).toBe(true)
    })

    expect(bcscCore.getAccount).toHaveBeenCalledWith()
    expect(deleteRegistration).toHaveBeenCalledWith('token', 'test-client-id')
    expect(deleteSecureData).toHaveBeenCalledWith()
    expect(bcscCore.removeAccount).toHaveBeenCalledWith()
    expect(bcscCore.clearAllKeychainData).toHaveBeenCalledWith()
    expect(clearSecureState).toHaveBeenCalledWith()
    expect(dispatch.mock.calls[0]).toStrictEqual([{ type: BCDispatchAction.CLEAR_BCSC, payload: undefined }])
    expect(dispatch.mock.calls[1]).toStrictEqual([{ type: DispatchAction.DID_AUTHENTICATE, payload: [false] }])
  })

  it('should call getToken when registrationAccessToken is missing from store', async () => {
    const { bcscCore, deleteRegistration } = setupFactoryReset({
      store: { bcscSecure: { registrationAccessToken: undefined, additionalEvidenceData: [] } },
    })
    bcscCore.getToken.mockResolvedValue({ token: 'native-token' } as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(bcscCore.getToken).toHaveBeenCalledWith(BcscCore.TokenType.Registration)
    expect(deleteRegistration).toHaveBeenCalledWith('native-token', 'test-client-id')
  })

  it('awaits agentCtx.teardownAgent before clearing state when a live agent exists', async () => {
    // A manually-resolved deferred promise, rather than a callOrder array pushed to
    // from inside async mock bodies. Timing-based approaches (an internal `await
    // Promise.resolve()`, or even a macrotask `await new Promise(setTimeout)`) are
    // unreliable here: whether or not the call site actually awaits
    // agentCtx.teardownAgent(), the rest of the reset's own await chain
    // (removeAccountArtifacts -> getAccount/deleteRegistration/deleteSecureData/
    // removeAccount) gives a fire-and-forget call's continuation plenty of scheduler
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

    const { bcscCore, clearSecureState } = setupFactoryReset()

    const hook = renderHook(() => useFactoryReset())

    let resultPromise!: ReturnType<typeof hook.result.current>
    act(() => {
      resultPromise = hook.result.current()
    })

    // Flush several microtask turns without resolving teardownPromise. If the call site
    // dropped its `await`, execution falls through to removeAccountArtifacts (and on to
    // clearSecureState) regardless of whether teardownAgent has settled — getAccount
    // would already have been called by now.
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve()
      }
    })

    expect(bcscCore.getAccount).not.toHaveBeenCalled()
    expect(clearSecureState).not.toHaveBeenCalled()

    resolveTeardown()

    const result = await act(async () => resultPromise)

    expect(result.success).toBe(true)
    expect(teardownAgentMock).toHaveBeenCalledTimes(1)
    expect(bcscCore.getAccount).toHaveBeenCalled()
    expect(clearSecureState).toHaveBeenCalled()
  })

  it('dispatches CLEAR_BCSC, then clearSecureState, then DID_AUTHENTICATE(false)', async () => {
    const callOrder: string[] = []
    const clearSecureState = jest.fn(() => {
      callOrder.push('clearSecureState')
    })
    const dispatch = jest.fn((action: any) => {
      if (action.type === BCDispatchAction.CLEAR_BCSC) {
        callOrder.push('CLEAR_BCSC')
      }
      if (action.type === DispatchAction.DID_AUTHENTICATE) {
        callOrder.push('DID_AUTHENTICATE')
      }
    })

    setupFactoryReset({ clearSecureState, dispatch })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    // hasAccount (CLEAR_BCSC) must flip false before bcscSecure clears, so RootStack
    // short-circuits to OnboardingStack before it ever derives showVerifyStack —
    // this is what prevents the transient MainStack mount described in #4336.
    expect(callOrder).toStrictEqual(['CLEAR_BCSC', 'clearSecureState', 'DID_AUTHENTICATE'])
  })

  it('purges an orphaned wallet store when no live agent is held but a wallet key exists', async () => {
    // Repro: reset wallet, then remove the account before the agent finishes
    // re-initializing. The provider's `agent` is transiently null, but the
    // interrupted init may have written an on-disk store keyed with the wallet
    // key that account removal is about to make underivable. Factory reset must
    // delete it via the throwaway-agent path or it orphans the store forever.
    const logger: MockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    // useServices returns [logger, ledgers] for the build options.
    const { bcscCore } = setupFactoryReset({ store: walletPurgeStore, logger, services: [logger, []] })

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
    expect(bcscCore.removeAccount).toHaveBeenCalledWith()
  })

  it('does not fail the reset if the orphaned-store purge throws', async () => {
    jest.mocked(purgeWalletStore).mockRejectedValue(new Error('build boom'))

    const logger: MockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    setupFactoryReset({ store: walletPurgeStore, logger, services: [logger, []] })

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
      client: {},
    })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      await hook.result.current()
    })

    expect(bcscCore.getAccount).toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('FactoryReset: No BCSC account found')
    expect(deleteRegistration).not.toHaveBeenCalled()
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
    const { bcscCore, logger } = setupFactoryReset({
      client: {},
      deleteRegistration: jest.fn().mockResolvedValue({ success: false }),
    })

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      await hook.result.current()
    })

    expect(bcscCore.getAccount).toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('FactoryReset: Failed to delete IAS account from server')
  })

  it('should return an error if local account file deletion fails', async () => {
    const { bcscCore, deleteRegistration } = setupFactoryReset({ client: {} })
    bcscCore.removeAccount.mockRejectedValue(new Error('Failed to remove account'))

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()

      expect(result.success).toBe(false)
      expect(result.success === false && result.error.message).toContain('Failed to remove account')
    })

    expect(bcscCore.getAccount).toHaveBeenCalled()
    expect(deleteRegistration).toHaveBeenCalledWith('token', 'test-client-id')
    expect(bcscCore.removeAccount).toHaveBeenCalled()
  })
})
