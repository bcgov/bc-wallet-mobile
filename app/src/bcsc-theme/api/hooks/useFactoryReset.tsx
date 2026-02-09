import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCSCSecureState, BCSCState, BCState } from '@/store'
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
 * @returns {Function} A function that performs the factory reset when called.
 */
export const useFactoryReset = () => {
  const { client, isClientReady } = useBCSCApiClientState()
  const registration = useRegistrationApi(client, isClientReady)
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { deleteSecureData } = useSecureActions()

  // TODO (MD): Consider adding a loading / status state to indicate progress of the factory reset operation

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

    try {
      // Delete IAS account registration
      logger.info('FactoryReset: Deleting IAS account from server...')
      const deleteIASAccount = await registration.deleteRegistration(account.clientID)

      if (!deleteIASAccount.success) {
        logger.warn('FactoryReset: Failed to delete IAS account from server')
      }
    } catch (error) {
      logger.warn('FactoryReset: Error occurred while deleting IAS account from server', { error })
    }

    // Delete secure data from native storage
    logger.info('FactoryReset: Deleting secure data from native storage...')
    await deleteSecureData()

    // Remove local account file
    logger.info('FactoryReset: Removing local account file...')
    await BcscCore.removeAccount()
  }, [deleteSecureData, logger, registration])

  /**
   * Performs a factory reset of the BCSC account and state.
   *
   * @param {Partial<BCSCState>} [state] - Optional partial state to preserve during the reset
   * @returns {Promise<FactoryResetResult>} A promise that resolves to the result of the factory reset operation.
   */
  const factoryReset = useCallback(
    async (bcscState?: Partial<BCSCState>, bcscSecureState?: Partial<BCSCSecureState>): Promise<FactoryResetResult> => {
      try {
        await removeAccountArtifacts()

        // Reset BCSC state to initial state
        logger.info('FactoryReset: Clearing secure and plain BCSC state...')
        dispatch({ type: BCDispatchAction.CLEAR_SECURE_STATE, payload: [bcscSecureState] })
        dispatch({ type: BCDispatchAction.CLEAR_BCSC, payload: [bcscState] })

        if (client) {
          // TODO (bm): We should have an actual method to clear tokens
          client.tokens = undefined
        }

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
    [removeAccountArtifacts, logger, dispatch, client]
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

/**
 * Gets the state to be preserved during a verification reset,
 *
 * @param store - The current global state of the application.
 * @returns Starte to preserve during a verification reset.
 */
export const getVerificationResetState = (
  store: BCState
): { bcsc: Partial<BCSCState>; secure: Partial<BCSCSecureState> } => {
  return {
    bcsc: {
      appVersion: store.bcsc.appVersion,
      analyticsOptIn: store.bcsc.analyticsOptIn,
    },
    secure: {
      hasAccount: true,
      walletKey: store.bcscSecure.walletKey,
    },
  }
}
