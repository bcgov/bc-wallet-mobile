import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { deleteWalletStore, purgeWalletStore, shutdownAgent } from '@/bcsc-theme/features/agent/services/agent-service'
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
// (Credo, indy-vdr-shared, etc.) are never loaded by this hook test.
jest.mock('@/bcsc-theme/features/agent/services/agent-service', () => ({
  deleteWalletStore: jest.fn().mockResolvedValue(undefined),
  purgeWalletStore: jest.fn().mockResolvedValue(undefined),
  shutdownAgent: jest.fn().mockResolvedValue(undefined),
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

  it('should delete the wallet store and shut down the agent before clearing state', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const clearSecureStateMock = jest.fn()
    const deleteSecureDataMock = jest.fn().mockResolvedValue(undefined)

    const callOrder: string[] = []
    // Both teardown ops now route through the serialized agent-service helpers.
    jest.mocked(deleteWalletStore).mockImplementation(async () => {
      callOrder.push('deleteStore')
    })
    jest.mocked(shutdownAgent).mockImplementation(async () => {
      callOrder.push('shutdown')
    })
    deleteSecureDataMock.mockImplementation(async () => {
      callOrder.push('deleteSecureData')
    })
    clearSecureStateMock.mockImplementation(() => {
      callOrder.push('clearSecureState')
    })

    const agent = { id: 'agent' } as any
    jest.mocked(useBCSCAgentSafe).mockReturnValue({
      agent,
      loading: false,
      error: null,
      retry: jest.fn(),
      resetWallet: jest.fn(),
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

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    // Routed through the wallet-op queue rather than calling the agent directly.
    expect(deleteWalletStore).toHaveBeenCalledWith(agent)
    expect(shutdownAgent).toHaveBeenCalledWith(agent, expect.anything())
    // Shut down before deleting (so shutdown closes a still-open store instead of
    // throwing onCloseContext on a removed one), and both before the key-clearing
    // steps so the wallet is removed before re-onboarding can derive a new key.
    expect(callOrder.indexOf('shutdown')).toBeLessThan(callOrder.indexOf('deleteStore'))
    expect(callOrder.indexOf('deleteStore')).toBeLessThan(callOrder.indexOf('deleteSecureData'))
    expect(callOrder.indexOf('deleteStore')).toBeLessThan(callOrder.indexOf('clearSecureState'))
  })

  it('should still succeed if the wallet store delete throws', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)
    const warnLogMock = jest.fn()

    jest.mocked(deleteWalletStore).mockRejectedValue(new Error('boom'))
    jest.mocked(shutdownAgent).mockResolvedValue(undefined)
    jest.mocked(useBCSCAgentSafe).mockReturnValue({
      agent: { id: 'agent' } as any,
      loading: false,
      error: null,
      retry: jest.fn(),
      resetWallet: jest.fn(),
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
      expect.stringContaining('deleteStore() failed'),
      expect.objectContaining({ error: expect.any(Error) })
    )
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

    // No live agent (mid-reinitialization), so the direct deleteWalletStore path
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
    expect(deleteWalletStore).not.toHaveBeenCalled()
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
