import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { shutdownAgent } from '@/bcsc-theme/features/agent/services/agent-service'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'

/**
 * Hook to reset the wallet without affecting the BCSC account verification
 *
 * Deletes the entire askar wallet store, shuts down the agent,
 * then re-initializes the agent which provisions a fresh wallet using
 * the same wallet ID and key. The user's PIN, biometrics, and BCSC identity are unchanged.
 *
 * @returns An async function that performs the wallet reset when called.
 */
export const useWalletReset = () => {
  const { agent, retry } = useBCSCAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  return useCallback(async (): Promise<void> => {
    if (!agent) {
      throw new Error('WalletReset: Agent is not initialized')
    }
    logger.info('[WalletReset] Shutting down agent')
    await shutdownAgent(agent, logger)

    logger.info('[WalletReset] Deleting askar store')
    await agent.modules.askar.deleteStore()

    logger.info('[WalletReset] Triggering agent re-initialization with fresh wallet')
    retry()
  }, [agent, logger, retry])
}
