import * as agentProviderModule from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import * as useSecureActionsModule from '@/bcsc-theme/hooks/useSecureActions'
import * as useAlertsModule from '@/hooks/useAlerts'
import { AskarStoreManager } from '@credo-ts/askar'
import { BasicAppContext } from '@mocks/helpers/app'
import { renderHook } from '@testing-library/react-native'
import { useWalletService } from './useWalletService'

/**
 * Builds a mock agent whose dependencyManager resolves the Askar store manager
 * and module config the hook works against. Fresh jest.fn()s per call so each
 * test owns its own instances.
 */
const createAgentMocks = () => {
  const storeManager = {
    isStoreOpen: jest.fn().mockReturnValue(true),
    openStore: jest.fn().mockResolvedValue(undefined),
    rotateStoreKey: jest.fn().mockResolvedValue(undefined),
  }
  const askarModuleConfig = { store: { key: 'old-key' } }
  const agent = {
    context: { label: 'mock-agent-context' },
    dependencyManager: {
      resolve: jest.fn((token: unknown) => (token === AskarStoreManager ? storeManager : askarModuleConfig)),
    },
  } as any

  return { agent, storeManager, askarModuleConfig }
}

describe('useWalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rotateWalletKey', () => {
    it('should return false and not update the stored key when no agent is available', async () => {
      jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue(null)
      const updateWalletKey = jest.fn()
      jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey } as any)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert: jest.fn() } as any)

      const { result } = renderHook(() => useWalletService(), { wrapper: BasicAppContext })

      await expect(result.current.rotateWalletKey('new-wallet-key')).resolves.toBe(false)
      expect(updateWalletKey).not.toHaveBeenCalled()
    })

    it('should return false when the wallet key is empty', async () => {
      const { agent, storeManager } = createAgentMocks()
      jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue({ agent } as any)
      const updateWalletKey = jest.fn()
      jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey } as any)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert: jest.fn() } as any)

      const { result } = renderHook(() => useWalletService(), { wrapper: BasicAppContext })

      await expect(result.current.rotateWalletKey('')).resolves.toBe(false)
      expect(storeManager.rotateStoreKey).not.toHaveBeenCalled()
      expect(updateWalletKey).not.toHaveBeenCalled()
    })

    it('should rotate the store key, update the module config, and persist the new key', async () => {
      const { agent, storeManager, askarModuleConfig } = createAgentMocks()
      jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue({ agent } as any)
      const updateWalletKey = jest.fn()
      jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey } as any)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert: jest.fn() } as any)

      const { result } = renderHook(() => useWalletService(), { wrapper: BasicAppContext })

      await expect(result.current.rotateWalletKey('new-wallet-key')).resolves.toBe(true)

      expect(storeManager.rotateStoreKey).toHaveBeenCalledWith(agent.context, { newKey: 'new-wallet-key' })
      // Store already open — no redundant open
      expect(storeManager.openStore).not.toHaveBeenCalled()
      // In-memory config must match so a later agent restart reopens with the new key
      expect(askarModuleConfig.store.key).toBe('new-wallet-key')
      expect(updateWalletKey).toHaveBeenCalledWith('new-wallet-key')
    })

    it('should open the store before rotating when it is closed', async () => {
      const { agent, storeManager } = createAgentMocks()
      storeManager.isStoreOpen.mockReturnValue(false)
      jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue({ agent } as any)
      jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey: jest.fn() } as any)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert: jest.fn() } as any)

      const { result } = renderHook(() => useWalletService(), { wrapper: BasicAppContext })

      await expect(result.current.rotateWalletKey('new-wallet-key')).resolves.toBe(true)
      expect(storeManager.openStore).toHaveBeenCalledWith(agent.context)
      expect(storeManager.rotateStoreKey).toHaveBeenCalledWith(agent.context, { newKey: 'new-wallet-key' })
    })

    // Change PIN leaves Back live while it rotates, so App Security can ask for a second rotation
    describe('while another rotation is in flight', () => {
      /** Lets the queued work that is ready to run do so. */
      const settle = () => new Promise((resolve) => setImmediate(resolve))

      /** Mounts the hook once per screen, as Change PIN and App Security each do. */
      const renderTwoScreens = (updateWalletKey = jest.fn()) => {
        const mocks = createAgentMocks()
        jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue({ agent: mocks.agent } as any)
        jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey } as any)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert: jest.fn() } as any)

        const changePIN = renderHook(() => useWalletService(), { wrapper: BasicAppContext })
        const appSecurity = renderHook(() => useWalletService(), { wrapper: BasicAppContext })

        return { ...mocks, updateWalletKey, changePIN, appSecurity }
      }

      it('should start the second rotation only once the first has finished, ending on the key saved last', async () => {
        const { agent, storeManager, askarModuleConfig, updateWalletKey, changePIN, appSecurity } = renderTwoScreens()
        let finishFirst: () => void = () => {}
        storeManager.rotateStoreKey.mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              finishFirst = resolve
            })
        )

        const first = changePIN.result.current.rotateWalletKey('pin-key')
        const second = appSecurity.result.current.rotateWalletKey('device-auth-key')
        await settle()

        // Askar fails a rekey that overlaps another, so the second must not have reached the store yet
        expect(storeManager.rotateStoreKey).toHaveBeenCalledTimes(1)
        expect(storeManager.rotateStoreKey).toHaveBeenLastCalledWith(agent.context, { newKey: 'pin-key' })
        expect(updateWalletKey).not.toHaveBeenCalled()

        finishFirst()

        await expect(first).resolves.toBe(true)
        await expect(second).resolves.toBe(true)
        expect(storeManager.rotateStoreKey).toHaveBeenCalledTimes(2)
        expect(storeManager.rotateStoreKey).toHaveBeenLastCalledWith(agent.context, { newKey: 'device-auth-key' })
        expect(askarModuleConfig.store.key).toBe('device-auth-key')
        expect(updateWalletKey.mock.calls).toEqual([['pin-key'], ['device-auth-key']])
      })

      it('should still run the second rotation when the first fails', async () => {
        const { storeManager, askarModuleConfig, updateWalletKey, changePIN, appSecurity } = renderTwoScreens()
        storeManager.rotateStoreKey.mockRejectedValueOnce(new Error('rekey failed'))

        const first = changePIN.result.current.rotateWalletKey('pin-key')
        const second = appSecurity.result.current.rotateWalletKey('device-auth-key')

        await expect(first).resolves.toBe(false)
        await expect(second).resolves.toBe(true)
        expect(askarModuleConfig.store.key).toBe('device-auth-key')
        expect(updateWalletKey.mock.calls).toEqual([['device-auth-key']])
      })
    })
  })

  it('should return a memoized rotateWalletKey', () => {
    const { agent } = createAgentMocks()
    jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue({ agent } as any)
    jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey: jest.fn() } as any)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert: jest.fn() } as any)

    const { result, rerender } = renderHook(() => useWalletService(), { wrapper: BasicAppContext })
    const firstRotateWalletKey = result.current.rotateWalletKey

    rerender(undefined)

    expect(result.current.rotateWalletKey).toBe(firstRotateWalletKey)
  })
})
