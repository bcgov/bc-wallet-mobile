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
  const { registration } = useApi()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState } = useSecureActions()

  // TODO (MD): Consider adding a loading / status state to indicate progress of the factory reset operation

  /**
   * Performs a factory reset of the BCSC account and state.
   *
   * @param {Partial<BCSCState>} [state] - Optional partial state to preserve during the reset
   * @returns {Promise<FactoryResetResult>} A promise that resolves to the result of the factory reset operation.
   */
  const factoryReset = useCallback(
    async (state?: Partial<BCSCState>): Promise<FactoryResetResult> => {
      try {
        const account = await BcscCore.getAccount()

        if (!account) {
          throw new Error('Local account not found for factory reset')
        }

        // Delete IAS account
        logger.info('FactoryReset: Deleting IAS account from server...')
        const deleteIASAccount = await registration.deleteRegistration(account.clientID)

        if (!deleteIASAccount.success) {
          throw new Error('IAS server account deletion failed')
        }

        // Remove local account file
        logger.info('FactoryReset: Removing local account file...')
        await BcscCore.removeAccount()

        // Reset BCSC state to initial state
        logger.info('FactoryReset: Clearing BCSC state...')
        clearSecureState()
        dispatch({ type: BCDispatchAction.CLEAR_BCSC, payload: state ? [state] : undefined })

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
    [logger, registration, dispatch, clearSecureState],
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
