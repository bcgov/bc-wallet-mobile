import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { enqueueWalletOp } from '@/bcsc-theme/features/agent/services/agent-service'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { TOKENS, useServices } from '@bifold/core'
import { AskarModuleConfig, AskarStoreManager } from '@credo-ts/askar'
import { useCallback, useMemo } from 'react'

/**
 * useWalletService is a custom hook that provides functionality to manage the underlying wallet.
 */
export const useWalletService = () => {
  const agentContext = useBCSCAgentSafe()
  const { updateWalletKey } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const agent = agentContext?.agent

  /**
   * Rotates the wallet key for the agent's underlying wallet.
   *
   * @throws An error if the wallet key rotation fails.
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

      // Queued with every other operation on the shared wallet, whichever screen asks. Askar takes the
      // store out of service for the length of a rekey, so a rotation that overlaps one fails outright,
      // and its key is by then the one saved natively: the store would not open at the next unlock.
      return enqueueWalletOp(async () => {
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

          return false
        }
      })
    },
    [agent, logger, updateWalletKey]
  )

  return useMemo(() => ({ rotateWalletKey }), [rotateWalletKey])
}
