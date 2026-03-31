import { toAppError } from '@/bcsc-theme/utils/native-error-map'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo } from 'react'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
  getHideDeviceAuthPrepFlag,
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
   * Performs device authentication (biometric or passcode)
   *
   * @returns Promise that resolves when the device auth process is complete
   */
  const performDeviceAuth = useCallback(async () => {
    let stopLoading

    try {
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
        logger.info('[Authentication:performDeviceAuth] Device authentication failed - user cancelled or auth failed')
        // TODO: (MD) What should we do if the device authentication fails?
        return
      }

      await handleSuccessfulAuth(walletKey)
      logger.info('[Authentication:performDeviceAuth] Device authentication successful')
    } catch (error) {
      const appError = toAppError(error, ErrorRegistry.DEVICE_AUTHENTICATION_ERROR)
      logger.error(`[Authentication:performDeviceAuth] Device authentication error [${appError.appEvent}]`, appError)
      deviceAuthenticationErrorAlert(appError)
    } finally {
      stopLoading?.()
    }
  }, [handleSuccessfulAuth, loadingScreen, logger, navigation, deviceAuthenticationErrorAlert])

  /**
   * Handles unlocking the app using the user selected authentication method.
   * If device auth is setup and available, biometrics will be used.
   * Otherwise, it will navigate to the PIN screen.
   *
   * @returns Promise that resolves when the unlock process is complete
   */
  const unlockApp = useCallback(async () => {
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

      // Show auth disclaimer screen until the user has dismissed it
      let hideDeviceAuthPrep = false
      try {
        hideDeviceAuthPrep = (await getHideDeviceAuthPrepFlag()) === true
      } catch (error) {
        // non-fatal error, just log it - the app can still function without this flag being set,
        // it just won't hide the prep screen on next auth
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Failed to get hide device auth prep flag: ${errorMsg}`)
      }

      if (!hideDeviceAuthPrep) {
        navigation.navigate(BCSCScreens.DeviceAuthInfo)
        return
      }

      await performDeviceAuth()
    } catch (error) {
      const appError = toAppError(error, ErrorRegistry.DEVICE_AUTHORIZATION_ERROR)
      logger.error(`[Authentication:UnlockApp] Device authentication error [${appError.appEvent}]`, appError)
    }
  }, [logger, navigation, performDeviceAuth])

  return useMemo(() => ({ unlockApp, performDeviceAuth }), [unlockApp, performDeviceAuth])
}
