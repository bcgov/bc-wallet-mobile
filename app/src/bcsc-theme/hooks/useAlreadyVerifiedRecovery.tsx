import { useTokenService } from '@/bcsc-theme/services/hooks/useTokenService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'

/**
 * Recovery hook for evidence uploads that IAS rejects with 409 "Registration Request already approved".
 * V3 handles the same 409 this way (ias-android DocumentUploadViewModel ->
 * CreateSessionAlreadyVerifiedError).
 */
export const useAlreadyVerifiedRecovery = () => {
  const navigation = useNavigation()
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const tokenService = useTokenService()

  /**
   * Exchanges the device code for tokens and sends the user to the success screen.
   *
   * Returns false — leaving the caller to surface its own message — when the approval hasn't
   * propagated to the token endpoint yet, or when the exchange fails outright.
   *
   * @returns True if the user was navigated to VerificationSuccess
   */
  const recoverFromAlreadyVerified = useCallback(async (): Promise<boolean> => {
    const { deviceCode, userCode } = store.bcscSecure

    if (!deviceCode || !userCode) {
      logger.error('[useAlreadyVerifiedRecovery] Cannot complete verification: missing device code or user code')
      return false
    }

    try {
      const isVerified = await tokenService.checkVerificationStatus(deviceCode, userCode)

      if (!isVerified) {
        logger.warn('[useAlreadyVerifiedRecovery] Evidence already submitted but still pending')
        return false
      }

      logger.info('[useAlreadyVerifiedRecovery] Evidence already approved; navigating to verification success')
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.VerificationSuccess }],
        })
      )
      return true
    } catch (error) {
      logger.error('[useAlreadyVerifiedRecovery] Failed to complete verification after 409', error as Error)
      return false
    }
  }, [logger, navigation, store.bcscSecure, tokenService])

  return { recoverFromAlreadyVerified }
}

export default useAlreadyVerifiedRecovery
