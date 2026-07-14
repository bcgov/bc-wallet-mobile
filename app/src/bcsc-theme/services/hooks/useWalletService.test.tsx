import * as agentProviderModule from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import * as useSecureActionsModule from '@/bcsc-theme/hooks/useSecureActions'
import * as useAlertsModule from '@/hooks/useAlerts'
import * as versionModule from '@/utils/version'
import { AppVersion } from '@/utils/version'
import { BasicAppContext } from '@mocks/helpers/app'
import { AskarStoreManager } from '@credo-ts/askar'
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

    it('should return false, skip the key update, and alert when rotation fails on 4.2.x or later', async () => {
      const mockError = new Error('rotation failed')
      const { agent, storeManager } = createAgentMocks()
      storeManager.rotateStoreKey.mockRejectedValue(mockError)
      jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue({ agent } as any)
      const updateWalletKey = jest.fn()
      jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey } as any)
      const failedToRotateWalletKeyAlert = jest.fn()
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert } as any)
      const isVersionAtLeast = jest.spyOn(versionModule, 'isVersionAtLeast').mockReturnValue(true)

      const { result } = renderHook(() => useWalletService(), { wrapper: BasicAppContext })

      await expect(result.current.rotateWalletKey('new-wallet-key')).resolves.toBe(false)
      expect(updateWalletKey).not.toHaveBeenCalled()
      expect(isVersionAtLeast).toHaveBeenCalledWith(AppVersion.V4_2_x)
      // The alert must receive the original error so its cause reaches the problem report
      expect(failedToRotateWalletKeyAlert).toHaveBeenCalledWith(mockError)
    })

    it('should not alert when rotation fails below 4.2.x', async () => {
      const { agent, storeManager } = createAgentMocks()
      storeManager.rotateStoreKey.mockRejectedValue(new Error('rotation failed'))
      jest.spyOn(agentProviderModule, 'useBCSCAgentSafe').mockReturnValue({ agent } as any)
      jest.spyOn(useSecureActionsModule, 'default').mockReturnValue({ updateWalletKey: jest.fn() } as any)
      const failedToRotateWalletKeyAlert = jest.fn()
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ failedToRotateWalletKeyAlert } as any)
      jest.spyOn(versionModule, 'isVersionAtLeast').mockReturnValue(false)

      const { result } = renderHook(() => useWalletService(), { wrapper: BasicAppContext })

      await expect(result.current.rotateWalletKey('new-wallet-key')).resolves.toBe(false)
      expect(failedToRotateWalletKeyAlert).not.toHaveBeenCalled()
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
