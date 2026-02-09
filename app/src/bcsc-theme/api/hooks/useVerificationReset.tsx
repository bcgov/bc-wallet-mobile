import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'
import { getAccountSecurityMethod } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { useFactoryReset } from './useFactoryReset'
import useRegistrationApi from './useRegistrationApi'

type VerificationResetResult =
  | {
      success: true
    }
  | {
      success: false
      error: Error
    }

/**
 * Custom hook that provides a function to reset the application to the start of
 * the verification flow without requiring the user to repeat onboarding.
 *
 * This includes:
 *  - Performing a factory reset to clear verification-related data while preserving onboarding state.
 *  - Re-registering the device with the same authentication method to ensure a seamless user experience.
 *
 * @param client - An instance of the BCSCApiClient used for registration. Prevents circular dependency with BCSCApiClientContext.
 * @returns {Function} A function that performs the factory reset when called.
 */
export const useVerificationReset = (client: BCSCApiClient | null) => {
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const registration = useRegistrationApi(client, Boolean(client))
  const factoryReset = useFactoryReset()

  /**
   * Resets the application to the start of the verification flow without requiring the user to repeat onboarding.
   *
   * @returns {Promise<VerificationResetResult>} A promise that resolves to the result of the verification reset operation.
   */
  const verificationReset = useCallback(async (): Promise<VerificationResetResult> => {
    try {
      logger.info('[VerificationReset]: Starting BCSC verification reset')

      // Get device auth method before factory reset
      const deviceAuthMethod = await getAccountSecurityMethod()

      const result = await factoryReset(
        // BCSC state to persist
        {
          appVersion: store.bcsc.appVersion,
          analyticsOptIn: store.bcsc.analyticsOptIn,
        },
        // BCSC Secure state to persist
        {
          hasAccount: true,
          walletKey: store.bcscSecure.walletKey,
        }
      )

      // Re-register the device with the same device auth method
      await registration.register(deviceAuthMethod)

      if (!result.success) {
        logger.error('[VerificationReset]: Factory reset failed', result.error)
      }

      logger.info('[VerificationReset]: BCSC verification reset completed successfully')
      return { success: true }
    } catch (error) {
      logger.error('[VerificationReset]: An error occurred during verification reset', error as Error)

      return { success: false, error: error as Error }
    }
  }, [logger, factoryReset, store.bcsc.appVersion, store.bcsc.analyticsOptIn, store.bcscSecure.walletKey, registration])

  return verificationReset
}
