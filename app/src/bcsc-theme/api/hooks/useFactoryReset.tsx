import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCSCState, BCState } from '@/store'
import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'
import * as BcscCore from 'react-native-bcsc-core'
import useApi from './useApi'

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
 *  - Deleting the IAS account associated with the current clientID.
 *  - Removing the local account file.
 *  - Clearing the BCSC state in the global store.
 *  - Registering a new account to generate a new clientID and save it locally.
 *  - Logging out the user by updating the authentication state.
 *
 * @returns {Function} A function that performs the factory reset when called.
 */
export const useFactoryReset = () => {
  const client = useBCSCApiClient()
  const { registration } = useApi()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState, deleteSecureData } = useSecureActions()

  // TODO (MD): Consider adding a loading / status state to indicate progress of the factory reset operation

  /**
   * Performs a factory reset of the BCSC account and state.
   *
   * @param {Partial<BCSCState>} [state] - Optional partial state to preserve during the reset
   * @param {boolean} [deleteFromServer=true] - Whether to delete the account from the IAS server for situations where this is
   * not possible (e.g., account is locked)
   * @returns {Promise<FactoryResetResult>} A promise that resolves to the result of the factory reset operation.
   */
  const factoryReset = useCallback(
    async (state?: Partial<BCSCState>, deleteFromServer: boolean = true): Promise<FactoryResetResult> => {
      try {
        const account = await BcscCore.getAccount()

        if (deleteFromServer) {
          if (!account) {
            throw new Error('Local account not found for factory reset')
          }

          // Delete IAS account
          logger.info('FactoryReset: Deleting IAS account from server...')
          const deleteIASAccount = await registration.deleteRegistration(account.clientID)

          if (!deleteIASAccount.success) {
            throw new Error('IAS server account deletion failed')
          }
        } else {
          logger.info('FactoryReset: Skipping server deletion (deleteFromServer=false)')
        }

        // Delete secure data from native storage
        logger.info('FactoryReset: Deleting secure data from native storage...')
        await deleteSecureData()

        // Remove local account file
        logger.info('FactoryReset: Removing local account file...')
        await BcscCore.removeAccount()

        // Reset BCSC state to initial state
        logger.info('FactoryReset: Clearing secure and plain BCSC state...')
        clearSecureState()
        dispatch({ type: BCDispatchAction.CLEAR_BCSC, payload: state ? [state] : undefined })
        // TODO (bm): We should have an actual method to clear tokens
        client.tokens = undefined

        logger.info('FactoryReset: Logging out user...')
        dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [false] })

        // Factory reset complete
        logger.info('FactoryReset: BCSC factory reset completed successfully')
        return { success: true }
      } catch (error) {
        const factoryResetError = _formatFactoryResetError(error)
        logger.error(`FactoryReset: ${factoryResetError.message}`, factoryResetError)

        return { success: false, error: factoryResetError }
      }
    },
    [logger, registration, dispatch, clearSecureState, deleteSecureData, client]
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
