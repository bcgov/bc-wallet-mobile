import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import * as BcscCore from '@/../../packages/bcsc-core/src/index'
import useApi from './useApi'
import { getAccount } from 'react-native-bcsc-core'
import { BCDispatchAction, BCState } from '@/store'
import { useCallback } from 'react'

/**
 * Hook to perform a factory reset of the BCSC account and state.
 * This should get the application as close as possible to a fresh install state.
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

  // TODO (MD): Consider adding a loading / status state to indicate progress of the factory reset operation

  /**
   * Performs a factory reset of the BCSC account and state.
   *
   *  @returns {Promise<void>} A promise that resolves when the factory reset is complete.
   */
  const factoryReset = useCallback(async () => {
    const account = await getAccount()

    if (!account) {
      throw new Error('FactoryReset: Account is null - cannot proceed with BCSC factory reset')
    }

    // Delete IAS account
    logger.info('FactoryReset: Deleting IAS account...')
    // TODO (MD): Handle specific error cases (e.g. network issues, 404 not found, etc.) include retries if appropriate
    const deleteIASAccount = await registration.deleteRegistration(account.clientID)

    if (!deleteIASAccount.success) {
      throw new Error('FactoryReset: IAS account deletion failed')
    }

    // Clear local account file
    try {
      logger.info('FactoryReset: Clearing local account file...')
      await BcscCore.removeAccount()
    } catch (error: any) {
      logger.error('FactoryReset: Error removing local account', error)

      // TODO (MD): Handle partial failure - IAS account deleted but local account removal failed
      // Recommend to reinstall the application
      throw error
    }

    // Reset BCSC state to initial state
    dispatch({ type: BCDispatchAction.CLEAR_BCSC })
    logger.info('FactoryReset: BCSC state cleared')

    // Register a new account (generates a new clientID and saves to local account file)
    try {
      logger.info('FactoryReset: Registering new account...')
      // TODO (MD): Handle specific error cases (e.g. network issues, 404 not found, etc.) include retries if appropriate
      await registration.register()
    } catch (error: any) {
      logger.error('FactoryReset: Error registering new account', error)

      // TODO (MD): Handle partial failure - IAS account deleted (server and local) but new registration failed
      // Recommend to reinstall the application
      throw error
    }

    logger.info('FactoryReset: Logging out user...')
    dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [false] })

    // Factory reset complete
    logger.info('FactoryReset: BCSC factory reset completed successfully')
  }, [registration, dispatch])

  return factoryReset
}
