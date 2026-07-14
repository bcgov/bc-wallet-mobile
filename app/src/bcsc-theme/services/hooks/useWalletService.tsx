import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useAlerts } from '@/hooks/useAlerts'
import { AppVersion, isVersionAtLeast } from '@/utils/version'
import { TOKENS, useServices } from '@bifold/core'
import { AskarModuleConfig, AskarStoreManager } from '@credo-ts/askar'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'

/**
 * useWalletService is a custom hook that provides functionality to manage the underlying wallet.
 *
 * @returns Wallet Service
 */
export const useWalletService = () => {
  const agentContext = useBCSCAgentSafe()
  const { updateWalletKey } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { failedToRotateWalletKeyAlert } = useAlerts(navigation)

  const agent = agentContext?.agent

  /**
   * Rotates the wallet key for the agent's underlying wallet.
   *
   * @throws An error if the wallet key rotation fails.
   * @param walletKey - The new wallet key to be set for the agent's wallet.
   * @returns A promise that resolves to true if the wallet key rotation is successful, or false if it fails.
   */
  const rotateWalletKey = useCallback(
    async (walletKey: string) => {
      if (!agent) {
        logger.info('[rotateWalletKey] No agent available to rotate wallet key')
        return false
      }

      if (!walletKey) {
        logger.info('[rotateWalletKey] No wallet key provided for rotation')
        return false
      }

      try {
        const storeManager = agent.dependencyManager.resolve(AskarStoreManager)
        const askarModuleConfig = agent.dependencyManager.resolve(AskarModuleConfig)

        if (!storeManager.isStoreOpen(agent.context)) {
          logger.info('[rotateWalletKey] Opening store before rotating wallet key')
          await storeManager.openStore(agent.context)
        }

        logger.info('[rotateWalletKey] Rotating wallet key for agent')
        await storeManager.rotateStoreKey(agent.context, { newKey: walletKey })
        askarModuleConfig.store.key = walletKey

        // Update the wallet key in secure storage after successful rotation
        updateWalletKey(walletKey)
        return true
      } catch (error) {
        logger.error('[rotateWalletKey] Failed to rotate wallet key', error as Error)

        // In V4.2.x and later, show an alert to the user if the wallet key rotation fails
        if (isVersionAtLeast(AppVersion.V4_2_x)) {
          failedToRotateWalletKeyAlert(error)
        }

        return false
      }
    },
    [agent, failedToRotateWalletKeyAlert, logger, updateWalletKey]
  )

  return useMemo(() => ({ rotateWalletKey }), [rotateWalletKey])
}
