import { BCDispatchAction, BCState } from '@/store'
import { RemoteLogger } from '@bifold/remote-logs'
import { Dispatch } from 'react'
import { getAccount, removeAccount } from 'react-native-bcsc-core'

/**
 * Prepares for switching to a new IAS API environment by cleaning up state from the old environment.
 * This should be called before dispatching UPDATE_IAS_API_BASE_URL.
 *
 * @param newApiBaseUrl - The new IAS API base URL to switch to
 * @param currentState - The current BCState
 * @param dispatch - Dispatch function
 * @param logger - Logger instance
 */
export const prepareEnvironmentSwitch = async (
  newApiBaseUrl: string,
  currentState: BCState,
  dispatch: Dispatch<any>,
  logger: RemoteLogger
): Promise<void> => {
  const currentApiBaseUrl = currentState.developer.iasApiBaseUrl

  if (!newApiBaseUrl || newApiBaseUrl === currentApiBaseUrl) {
    return
  }

  logger.info('Preparing to switch IAS API environment', {
    from: currentApiBaseUrl,
    to: newApiBaseUrl,
  })

  try {
    // Check if existing account is from a different environment
    const existingAccount = await getAccount()
    if (existingAccount) {
      logger.info('Checking existing account issuer', {
        existingIssuer: existingAccount.issuer,
        newIssuer: newApiBaseUrl + '/device/',
      })

      // If the issuer doesn't match the new environment remove the old account
      const newIssuer = `${newApiBaseUrl}/device/`
      if (existingAccount.issuer !== newIssuer) {
        logger.info('Account from different environment detected, removing old account', {
          oldIssuer: existingAccount.issuer,
          newIssuer: newIssuer,
        })
        await removeAccount()
        logger.info('Old account removed successfully')

        // Reset verification progress
        dispatch({ type: BCDispatchAction.CLEAR_BCSC })
      } else {
        return
      }
    }
  } catch (error) {
    logger.error('Error checking/removing old account', { error })
    // Continue even if account removal fails so users don't get stuck
  }

  // Clear refresh token from store and force re-authentication
  dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [undefined] })
  dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [false] })

  logger.info('Environment switch preparation complete')
}
