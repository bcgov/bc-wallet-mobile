import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo } from 'react'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
  isAccountLocked,
  unlockWithDeviceSecurity,
} from 'react-native-bcsc-core'
import { useLoadingScreen } from '../contexts/BCSCLoadingContext'
import { BCSCAuthStackParams, BCSCScreens } from '../types/navigators'
import useSecureActions from './useSecureActions'

/**
 * Hook that provides authentication actions for the BCSC auth flow, including:
 * - unlockApp: Handles unlocking the app using the configured authentication method (device auth, biometrics or PIN)
 *
 * @param navigation The navigation prop for navigating between auth screens
 * @returns An object containing authentication actions (currently only `unlockApp`)
 */
export const useAuthentication = (navigation: StackNavigationProp<BCSCAuthStackParams>) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const loadingScreen = useLoadingScreen()
  const { handleSuccessfulAuth } = useSecureActions()
  const { deviceAuthenticationErrorAlert } = useAlerts(navigation)

  /**
   * Handles unlocking the app using the configured authentication method.
   * If device authentication is configured and available, it will attempt to unlock using biometrics or passcode.
   * Otherwise, it will check if the account is locked and navigate to the appropriate screen (PIN entry or lockout).
   *
   * @returns Promise that resolves when the unlock process is complete
   */
  const unlockApp = useCallback(async () => {
    let stopLoading

    try {
      const accountSecurityMethod = await getAccountSecurityMethod()

      // Only attempt device authentication if that is the configured method
      if (accountSecurityMethod !== AccountSecurityMethod.DeviceAuth) {
        const { locked } = await isAccountLocked()

        if (!locked) {
          // If not locked, navigate to PIN entry screen
          navigation.navigate(BCSCScreens.EnterPIN)
          return
        }

        // If locked, reset the navigation stack and show lockout screen
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.Lockout }],
          })
        )
        return
      }

      stopLoading = loadingScreen.startLoading()

      // Check if they have changed their device auth settings
      const deviceAuthAvailable = await canPerformDeviceAuthentication()

      if (!deviceAuthAvailable) {
        navigation.navigate(BCSCScreens.DeviceAuthAppReset)
        return
      }

      // Unlocks the app using device authentication (biometric or passcode)
      const { success, walletKey } = await unlockWithDeviceSecurity('Unlock your app')

      if (!success) {
        logger.info('[Authentication:UnlockApp] Device authentication failed - user cancelled or auth failed')
        return
      }

      await handleSuccessfulAuth(walletKey)
      logger.info('[Authentication:UnlockApp] Device authentication successful')
    } catch (error) {
      logger.error('[Authentication:UnlockApp] Device authentication error', error as Error)
      deviceAuthenticationErrorAlert()
    } finally {
      stopLoading?.()
    }
  }, [deviceAuthenticationErrorAlert, handleSuccessfulAuth, loadingScreen, logger, navigation])

  return useMemo(() => ({ unlockApp }), [unlockApp])
}
