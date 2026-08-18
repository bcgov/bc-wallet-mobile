import useApi from '@/bcsc-theme/api/hooks/useApi'
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

jest.unmock('@/bcsc-theme/api/hooks/useFactoryReset')

jest.mock('@/bcsc-theme/api/hooks/useApi')
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

const warnMock = jest.fn()

describe('useFactoryReset', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    const useSecureActionsMock = jest.mocked(useSecureActions)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    jest.mocked(useBCSCAgentSafe).mockReturnValue(null)
  })

  it('should factory reset the device when successful', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })
    const registerMock = jest.fn()
    const dispatchMock = jest.fn()
    const clearSecureStateMock = jest.fn()
    const deleteSecureDataMock = jest.fn().mockResolvedValue(undefined)

    useBCSCApiClientStateMock.mockReturnValue({
      client: {
        clearTokens: jest.fn().mockResolvedValue(undefined),
      },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: deleteRegistrationMock,
      register: registerMock,
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: clearSecureStateMock,
      deleteSecureData: deleteSecureDataMock,
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      dispatchMock,
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (!result.success) {
        throw new Error(`Factory reset failed: ${result.error?.message}`)
      }
      expect(result.success).toBe(true)
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalledWith()
    expect(deleteRegistrationMock).toHaveBeenCalledWith('token', 'test-client-id')
    expect(deleteSecureDataMock).toHaveBeenCalledWith()
    expect(bcscCoreMock.removeAccount).toHaveBeenCalledWith()
    expect(bcscCoreMock.clearAllKeychainData).toHaveBeenCalledWith()
    expect(clearSecureStateMock).toHaveBeenCalledWith()
    expect(dispatchMock.mock.calls[0]).toStrictEqual([{ type: BCDispatchAction.CLEAR_BCSC, payload: undefined }])
    expect(dispatchMock.mock.calls[1]).toStrictEqual([{ type: DispatchAction.DID_AUTHENTICATE, payload: [false] }])
  })

  it('should call getToken when registrationAccessToken is missing from store', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })
    const dispatchMock = jest.fn()
    const clearSecureStateMock = jest.fn()
    const deleteSecureDataMock = jest.fn().mockResolvedValue(undefined)

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: deleteRegistrationMock,
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    bcscCoreMock.getToken.mockResolvedValue({ token: 'native-token' } as any)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: clearSecureStateMock,
      deleteSecureData: deleteSecureDataMock,
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: undefined, additionalEvidenceData: [] } } as any,
      dispatchMock,
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(bcscCoreMock.getToken).toHaveBeenCalledWith(BcscCore.TokenType.Registration)
    expect(deleteRegistrationMock).toHaveBeenCalledWith('native-token', 'test-client-id')
  })

  it('awaits agentCtx.teardownAgent before clearing state when a live agent exists', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const clearSecureStateMock = jest.fn()
    const deleteSecureDataMock = jest.fn().mockResolvedValue(undefined)

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

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: jest.fn().mockResolvedValue({ success: true }),
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: clearSecureStateMock,
      deleteSecureData: deleteSecureDataMock,
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }] as any)

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

    expect(bcscCoreMock.getAccount).not.toHaveBeenCalled()
    expect(clearSecureStateMock).not.toHaveBeenCalled()

    resolveTeardown()

    const result = await act(async () => resultPromise)

    expect(result.success).toBe(true)
    expect(teardownAgentMock).toHaveBeenCalledTimes(1)
    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(clearSecureStateMock).toHaveBeenCalled()
  })

  it('dispatches CLEAR_BCSC, then clearSecureState, then DID_AUTHENTICATE(false)', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const callOrder: string[] = []
    const clearSecureStateMock = jest.fn(() => {
      callOrder.push('clearSecureState')
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatchMock = jest.fn((action: any) => {
      if (action.type === BCDispatchAction.CLEAR_BCSC) {
        callOrder.push('CLEAR_BCSC')
      }
      if (action.type === DispatchAction.DID_AUTHENTICATE) {
        callOrder.push('DID_AUTHENTICATE')
      }
    })

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: jest.fn().mockResolvedValue({ success: true }),
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: clearSecureStateMock,
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      dispatchMock,
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }] as any)

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
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    // No live agent (mid-reinitialization), so the agentCtx.teardownAgent path
    // is unavailable.
    jest.mocked(useBCSCAgentSafe).mockReturnValue(null)

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: jest.fn().mockResolvedValue({ success: true }),
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      {
        bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [], walletKey: 'stale-wallet-key' },
        preferences: { selectedMediator: 'https://mediator.example', walletName: 'BC Wallet' },
        developer: { enableProxy: false },
      } as any,
      jest.fn(),
    ])
    // useServices returns [logger, ledgers] for the build options.
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }, []] as any)

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
    expect(bcscCoreMock.removeAccount).toHaveBeenCalledWith()
  })

  it('does not fail the reset if the orphaned-store purge throws', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)
    const warnLogMock = jest.fn()

    jest.mocked(useBCSCAgentSafe).mockReturnValue(null)
    jest.mocked(purgeWalletStore).mockRejectedValue(new Error('build boom'))

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: jest.fn().mockResolvedValue({ success: true }),
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      {
        bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [], walletKey: 'stale-wallet-key' },
        preferences: { selectedMediator: 'https://mediator.example', walletName: 'BC Wallet' },
        developer: { enableProxy: false },
      } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), warn: warnLogMock, error: jest.fn() }, []] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(warnLogMock).toHaveBeenCalledWith(
      expect.stringContaining('orphaned wallet store purge failed'),
      expect.objectContaining({ error: expect.any(Error) })
    )
  })

  it.todo('should factory reset with custom state when provided')

  it('should log a warning if account is null', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useApiMock = jest.mocked(useApi)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const infoMock = jest.fn()
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn()

    useBCSCApiClientStateMock.mockReturnValue({ client: {}, isClientReady: true } as any)
    bcscCoreMock.getAccount.mockResolvedValue(null)
    useApiMock.mockImplementation(() => ({ registration: { deleteRegistration: deleteRegistrationMock } }) as any)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: { additionalEvidenceData: [] } } as any, jest.fn()])
    bifoldMock.useServices.mockReturnValue([{ info: infoMock, error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      await hook.result.current()
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenCalled()
    expect(deleteRegistrationMock).not.toHaveBeenCalled()
    // Keychain data can outlive an app reinstall even when no local account file
    // remains, so the wipe must still run in this branch.
    expect(bcscCoreMock.clearAllKeychainData).toHaveBeenCalledWith()
  })

  it('does not fail the reset if clearing Keychain data throws', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)
    const warnLogMock = jest.fn()

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: jest.fn().mockResolvedValue({ success: true }),
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    bcscCoreMock.clearAllKeychainData.mockRejectedValue(new Error('keychain boom'))
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), warn: warnLogMock, error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(warnLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Failed to clear Keychain data'),
      expect.objectContaining({ error: expect.any(Error) })
    )
  })

  it('should log a warning if IAS account deletion fails', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    useBCSCApiClientStateMock.mockReturnValue({ client: {}, isClientReady: true } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn(), warn: warnMock }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      await hook.result.current()
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(warnMock).toHaveBeenCalled()
  })

  it('should return an error if local account file deletion fails', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })

    useBCSCApiClientStateMock.mockReturnValue({ client: {}, isClientReady: true } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: deleteRegistrationMock,
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockRejectedValue(new Error('Failed to remove account'))
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn(), warn: warnMock }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (result.success) {
        expect(true).toBe(false) // Force fail if success is true
      } else {
        expect(result.success).toBe(false)
        expect(result.error.message).toContain('Failed to remove account')
      }
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(deleteRegistrationMock).toHaveBeenCalledWith('token', 'test-client-id')
    expect(bcscCoreMock.removeAccount).toHaveBeenCalled()
  })
})
