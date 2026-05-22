import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCSCState, BCState } from '@/store'
import { BCAgent } from '@/utils/bc-agent-modules'
import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'
import * as BcscCore from 'react-native-bcsc-core'
import useRegistrationApi from './useRegistrationApi'

type FactoryResetResult =
  | {
      success: true
    }
  | {
      success: false
      error: Error
    }

/**
 * Hook to perform a factory reset of the BCSC account and state.
 * This should get the application as close as possible to a fresh install state.
 *
 * WARNING: This is a destructive action and will result in loss of all user data and settings.
 *
 * This includes:
 *  - Deleting the IAS account associated with the current clientID from server (non-blocking if fails).
 *  - Deleting all secure data stored in native storage.
 *  - Removing the local account file.
 *  - Clearing the BCSC state in the global store.
 *  - Logging out the user by updating the authentication state.
 *
 * @returns A function that performs the factory reset when called.
 */
export const useFactoryReset = () => {
  const { client, isClientReady } = useBCSCApiClientState()
  const registration = useRegistrationApi(client, Boolean(isClientReady))
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState, deleteSecureData } = useSecureActions()
  const agentCtx = useBCSCAgentSafe()

  /**
   * Deletes the IAS account associated with the given clientID from the server.
   *
   * @param clientID - The clientID of the account to delete.
   * @returns A promise that resolves when the deletion attempt is complete.
   */
  const deleteRegistration = useCallback(
    async (clientID: string) => {
      try {
        let registrationAccessToken = store.bcscSecure.registrationAccessToken

        if (!registrationAccessToken) {
          // Note: This allows a factory reset before secure state has been hydrated
          const nativeToken = await BcscCore.getToken(BcscCore.TokenType.Registration)
          registrationAccessToken = nativeToken?.token
        }

        if (!registrationAccessToken) {
          logger.info('FactoryReset: No registration access token found, skipping IAS account deletion')
          return
        }

        const deleteIASAccount = await registration.deleteRegistration(registrationAccessToken, clientID)

        if (!deleteIASAccount.success) {
          logger.warn('FactoryReset: Failed to delete IAS account from server')
        }
      } catch (error) {
        logger.warn('FactoryReset: Error occurred while deleting registration', { error })
      }
    },
    [logger, registration, store.bcscSecure.registrationAccessToken]
  )

  /**
   * Removes all artifacts associated with the current BCSC account.
   *
   * @returns A promise that resolves when all account dependencies have been purged.
   */
  const removeAccountArtifacts = useCallback(async () => {
    const account = await BcscCore.getAccount()

    if (!account) {
      logger.info('FactoryReset: No BCSC account found')
      return
    }

    // Delete IAS account registration
    logger.info('FactoryReset: Deleting IAS account from server...')
    await deleteRegistration(account.clientID)

    // Delete secure data from native storage
    logger.info('FactoryReset: Deleting secure data from native storage...')
    await deleteSecureData()

    // Remove local account file
    logger.info('FactoryReset: Removing local account file...')
    await BcscCore.removeAccount()
  }, [deleteRegistration, deleteSecureData, logger])

  /**
   * Performs a factory reset of the BCSC account and state.
   *
   * @param {Partial<BCSCState>} [state] - Optional partial state to preserve during the reset
   * @returns {Promise<FactoryResetResult>} A promise that resolves to the result of the factory reset operation.
   */
  const factoryReset = useCallback(
    async (bcscState?: Partial<BCSCState>): Promise<FactoryResetResult> => {
      try {
        if (!client) {
          throw new Error('FactoryReset: BCSCApiClient is not initialized')
        }

        logger.info('FactoryReset: Starting BCSC factory reset process...')

        // Delete the wallet store first, while the agent still holds a valid
        // handle. If we cleared keys/state first, re-onboarding would derive a
        // new wallet key and the next agent init would trip on the stale
        // on-disk wallet (duplicate-store error, code 3).
        if (agentCtx?.agent) {
          // The BCSC agent is always built via getBCAgentModules, so .modules.askar is present at runtime.
          const agent = agentCtx.agent as BCAgent
          try {
            logger.info('FactoryReset: Deleting wallet store...')
            await agent.modules.askar.deleteStore()
          } catch (err) {
            logger.warn('FactoryReset: wallet deleteStore() failed; wallet file may persist', { error: err })
          }
          try {
            await agent.shutdown()
          } catch (err) {
            logger.warn('FactoryReset: agent.shutdown() failed', { error: err })
          }
        } else {
          logger.info('FactoryReset: No active agent; skipping wallet store delete')
        }

        await removeAccountArtifacts()

        // Reset BCSC state to initial state
        logger.info('FactoryReset: Clearing secure and plain BCSC state...')
        clearSecureState()

        dispatch({ type: BCDispatchAction.CLEAR_BCSC, payload: bcscState ? [bcscState] : undefined })
        client.clearTokens()

        logger.info('FactoryReset: Logging out user...')
        dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [false] })

        // Factory reset complete
        logger.info('FactoryReset: BCSC factory reset completed successfully')
        return { success: true }
      } catch (error) {
        const factoryResetError = _formatFactoryResetError(error)
        logger.error(factoryResetError.message)

        return { success: false, error: factoryResetError }
      }
    },
    [removeAccountArtifacts, logger, clearSecureState, dispatch, client, agentCtx]
  )

  return factoryReset
}

/**
 * Formats errors that occur during the factory reset process.
 *
 * @param {unknown} error - The error to format.
 * @returns {*} {Error} The formatted error.
 */
function _formatFactoryResetError(error: unknown): Error {
  if (error instanceof Error) {
    error.message = `FactoryResetError: ${error.message}`
    return error
  }

  return new Error(`FactoryResetUnknownError: ${JSON.stringify(error, null, 2)}`)
}
