import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import {
  BCDispatchAction,
  BCSCSecureState,
  BCSCState,
  BCState,
  initialBCSCSecureState,
  initialBCSCState,
} from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'

type VerificationResetResult =
  | {
      success: true
    }
  | {
      success: false
      error: Error
    }

/**
 * Hook to remove verified status and credential while preserving account and nickname.
 * This should get the application as close as possible to a fresh install state.
 * *
 * This includes:
 *  - Deleting all secure data stored in native storage EXCEPT for the account.
 *
 * @returns {Function} A function that performs the factory reset when called.
 */
export const useVerificationReset = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { deleteVerificationData } = useSecureActions()

  // TODO (MD): Consider adding a loading / status state to indicate progress of the factory reset operation

  /**
   * Performs a verification reset by clearing relevant secure and plain state.
   *
   * @param {Partial<BCSCState>} [state] - Optional partial state to preserve during the reset
   * @returns {Promise<VerificationResetResult>} A promise that resolves to the result of the factory reset operation.
   */
  const verificationReset = useCallback(async (): Promise<VerificationResetResult> => {
    try {
      const resetBcscState: BCSCState = {
        ...initialBCSCState,
        analyticsOptIn: store.bcsc.analyticsOptIn,
      }

      const resetBcscSecureState: BCSCSecureState = {
        ...initialBCSCSecureState,
        isHydrated: store.bcscSecure.isHydrated,
        hasAccount: true,
        registrationAccessToken: store.bcscSecure.registrationAccessToken,
        verified: false,
        walletKey: store.bcscSecure.walletKey,
      }

      logger.info('[VerificationReset]: Deleting verification data in native storage...')
      await deleteVerificationData()

      logger.info('[VerificationReset]: Resetting secure and plain BCSC state...')
      dispatch({ type: BCDispatchAction.CLEAR_SECURE_STATE, payload: [resetBcscSecureState] })
      dispatch({ type: BCDispatchAction.CLEAR_BCSC, payload: [resetBcscState] })

      logger.info('[VerificationReset]: BCSC verification reset completed successfully')
      return { success: true }
    } catch (error) {
      const factoryResetError = _formatVerificationResetError(error)
      logger.error(factoryResetError.message)

      return { success: false, error: factoryResetError }
    }
  }, [
    store.bcsc.analyticsOptIn,
    store.bcscSecure.isHydrated,
    store.bcscSecure.registrationAccessToken,
    store.bcscSecure.walletKey,
    logger,
    deleteVerificationData,
    dispatch,
  ])

  return verificationReset
}

/**
 * Formats errors that occur during the factory reset process.
 *
 * @param {unknown} error - The error to format.
 * @returns {*} {Error} The formatted error.
 */
function _formatVerificationResetError(error: unknown): Error {
  if (error instanceof Error) {
    error.message = `VerificationResetError: ${error.message}`
    return error
  }

  return new Error(`VerificationResetUnknownError: ${JSON.stringify(error, null, 2)}`)
}
