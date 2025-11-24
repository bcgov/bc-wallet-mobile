import { BCDispatchAction, BCState } from '@/store'
import { RemoteLogger } from '@bifold/remote-logs'
import { Dispatch } from 'react'
import { getAccount, NativeAccount, removeAccount } from 'react-native-bcsc-core'

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
  dispatch: Dispatch<BCDispatchAction>,
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

  let existingAccount: NativeAccount | null = null

  try {
    existingAccount = await getAccount()
  } catch (error) {
    logger.error('Error checking/removing old account', { error })
    // Continue with environment switch even if we can't fetch the account
  }

  const newIssuer = getIssuerUrl(newApiBaseUrl)

  // No account exists, reset auth state
  if (!existingAccount) {
    resetAuthenticationState(dispatch)
    logger.info('Environment switch preparation complete')
    return
  }

  // Account already matches new environment, nothing to do
  if (existingAccount.issuer === newIssuer) {
    logger.info('Environment switch preparation complete')
    return
  }

  logger.info('Account from different environment detected, removing old account', {
    oldIssuer: existingAccount.issuer,
    newIssuer,
  })
  await cleanupOldAccountIfNeeded(newApiBaseUrl, dispatch, logger)
  resetAuthenticationState(dispatch)

  logger.info('Environment switch preparation complete')
}

const cleanupOldAccountIfNeeded = async (
  newApiBaseUrl: string,
  dispatch: Dispatch<BCDispatchAction>,
  logger: RemoteLogger
): Promise<void> => {
  try {
    // Remove account from old environment
    await removeAccount()
    logger.info('Old account removed successfully')

    dispatch(BCDispatchAction.CLEAR_BCSC)
  } catch (error) {
    logger.error('Error checking/removing old account', { error })
    // Continue even if account removal fails so users don't get stuck
  }
}

const resetAuthenticationState = (dispatch: Dispatch<BCDispatchAction>): void => {
  dispatch(BCDispatchAction.UPDATE_REFRESH_TOKEN)
  dispatch(BCDispatchAction.UPDATE_VERIFIED)
}

const getIssuerUrl = (apiBaseUrl: string): string => `${apiBaseUrl}/device/`
