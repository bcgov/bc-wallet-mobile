import { mapNativeBcscError } from '@/bcsc-theme/utils/native-error-map'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef } from 'react'
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
  const { deviceAuthenticationErrorAlert, problemWithAppAlert } = useAlerts(navigation)
  const isAuthInProgressRef = useRef(false)

  /**
   * Completes the unlock after the device has authenticated the user
   */
  const completeUnlock = useCallback(
    async (walletKey?: string) => {
      try {
        await handleSuccessfulAuth(walletKey)
        logger.info('[Authentication:performDeviceAuth] Device authentication successful')
      } catch (error) {
        const appError = mapNativeBcscError(error)
        logger.error(`[Authentication:completeUnlock] Post-auth unlock error [${appError.appEvent}]`, appError)
        problemWithAppAlert(appError)
      }
    },
    [handleSuccessfulAuth, logger, problemWithAppAlert]
  )

  /**
   * Runs device authentication (biometric or passcode) without the in-flight guard.
   */
  const runDeviceAuth = useCallback(async () => {
    let stopLoading

    try {
      stopLoading = loadingScreen.startLoading()

      // Check if they have changed their device auth settings
      const deviceAuthAvailable = await canPerformDeviceAuthentication()

      if (!deviceAuthAvailable) {
        logger.info('[Authentication:performDeviceAuth] Device auth unavailable, navigating to DeviceAuthAppReset')
        navigation.navigate(BCSCScreens.DeviceAuthAppReset)
        return
      }

      // Unlocks the app using device authentication (biometric or passcode)
      logger.info('[Authentication:performDeviceAuth] Requesting device authentication')
      const { success, walletKey, reason } = await unlockWithDeviceSecurity('Unlock your app')

      // Native resolves { success: false } only for a deliberate user cancel
      if (!success) {
        logger.info(
          `[Authentication:performDeviceAuth] Device authentication cancelled: ${reason ?? 'no reason given'}`
        )
        return
      }

      await completeUnlock(walletKey)
    } catch (error) {
      // Note: a user cancel never lands here — unlockWithDeviceSecurity resolves
      // { success: false } on cancel (both platforms), handled above.
      const appError = mapNativeBcscError(error)
      logger.error(`[Authentication:performDeviceAuth] Device authentication error [${appError.appEvent}]`, appError)
      deviceAuthenticationErrorAlert(appError)
    } finally {
      stopLoading?.()
    }
  }, [completeUnlock, loadingScreen, logger, navigation, deviceAuthenticationErrorAlert])

  /**
   * Performs device authentication (biometric or passcode). Ignored if an unlock is already in progress.
   *
   * @returns Promise that resolves when the device auth process is complete
   */
  const performDeviceAuth = useCallback(async () => {
    if (isAuthInProgressRef.current) {
      // Logged so a stuck in-flight unlock can never look like "tapping does nothing" with no trace
      logger.warn('[Authentication:performDeviceAuth] Ignored: an unlock is already in progress')
      return
    }

    isAuthInProgressRef.current = true
    try {
      await runDeviceAuth()
    } finally {
      isAuthInProgressRef.current = false
    }
  }, [logger, runDeviceAuth])

  /**
   * Handles unlocking the app using the user selected authentication method.
   * If device auth is setup and available, biometrics will be used.
   * Otherwise, it will navigate to the PIN screen.
   *
   * @returns Promise that resolves when the unlock process is complete
   */
  const unlockApp = useCallback(async () => {
    if (isAuthInProgressRef.current) {
      // Logged so a stuck in-flight unlock can never look like "tapping does nothing" with no trace
      logger.warn('[Authentication:UnlockApp] Ignored: an unlock is already in progress')
      return
    }

    isAuthInProgressRef.current = true
    try {
      const accountSecurityMethod = await getAccountSecurityMethod()
      logger.info(`[Authentication:UnlockApp] Unlock requested, security method: ${accountSecurityMethod}`)

      // Only attempt device authentication if that is the configured method
      if (accountSecurityMethod !== AccountSecurityMethod.DeviceAuth) {
        const { locked } = await isAccountLocked()
        logger.info(`[Authentication:UnlockApp] PIN unlock, account locked: ${locked}`)

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
        logger.info('[Authentication:UnlockApp] Showing device auth disclaimer (DeviceAuthInfo)')
        navigation.navigate(BCSCScreens.DeviceAuthInfo)
        return
      }

      await runDeviceAuth()
    } catch (error) {
      const appError = mapNativeBcscError(error)
      logger.error(`[Authentication:UnlockApp] Unlock error [${appError.appEvent}]`, appError)
      problemWithAppAlert(appError)
    } finally {
      isAuthInProgressRef.current = false
    }
  }, [logger, navigation, runDeviceAuth, problemWithAppAlert])

  return useMemo(() => ({ unlockApp, performDeviceAuth }), [unlockApp, performDeviceAuth])
}
