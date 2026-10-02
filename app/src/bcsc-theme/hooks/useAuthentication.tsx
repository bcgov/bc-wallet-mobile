import { mapNativeBcscError } from '@/bcsc-theme/utils/native-error-map'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
 * - unlockApp: Handles unlocking the app using the configured authentication method (device auth or PIN)
 * - performDeviceAuth: Prompts for device authentication (biometric or passcode) and completes the unlock
 *
 * @param navigation The navigation prop for navigating between auth screens
 * @returns An object containing `unlockApp` and `performDeviceAuth`
 */
export const useAuthentication = (navigation: StackNavigationProp<BCSCAuthStackParams>) => {
  const { t } = useTranslation()
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
        logger.info('[Authentication:completeUnlock] Device authentication successful')
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
        logger.info('[Authentication:runDeviceAuth] Device auth unavailable, navigating to DeviceAuthAppReset')
        navigation.navigate(BCSCScreens.DeviceAuthAppReset)
        return
      }

      // Unlocks the app using device authentication (biometric or passcode)
      logger.info('[Authentication:runDeviceAuth] Requesting device authentication')
      const { success, walletKey, reason } = await unlockWithDeviceSecurity(t('BCSC.Security.UnlockPrompt'))

      // Native resolves { success: false } only for a deliberate user cancel
      if (!success) {
        logger.info(`[Authentication:runDeviceAuth] Device authentication cancelled: ${reason ?? 'no reason given'}`)
        return
      }

      await completeUnlock(walletKey)
    } catch (error) {
      // Never route to app reset from a prompt error: the OS code is a single-call signal and can be
      // wrong. Show the error; the user can retry. The pre-prompt canPerformDeviceAuthentication()
      // check handles a truly unsecured device.
      const appError = mapNativeBcscError(error)
      logger.error(`[Authentication:runDeviceAuth] Device authentication error [${appError.appEvent}]`, appError)
      deviceAuthenticationErrorAlert(appError)
    } finally {
      stopLoading?.()
    }
  }, [completeUnlock, loadingScreen, logger, navigation, deviceAuthenticationErrorAlert, t])

  /**
   * Runs `action` unless an unlock is already in progress, releasing the guard when it settles.
   *
   * Note: the guard is per hook instance, so it only de-duplicates taps within one screen.
   */
  const withAuthGuard = useCallback(
    async (tag: string, action: () => Promise<void>) => {
      if (isAuthInProgressRef.current) {
        // Logged so a stuck in-flight unlock can never look like "tapping does nothing" with no trace
        logger.warn(`[Authentication:${tag}] Ignored: an unlock is already in progress`)
        return
      }

      isAuthInProgressRef.current = true
      try {
        await action()
      } finally {
        isAuthInProgressRef.current = false
      }
    },
    [logger]
  )

  /**
   * Performs device authentication (biometric or passcode). Ignored if an unlock is already in progress.
   *
   * @returns Promise that resolves when the device auth process is complete
   */
  const performDeviceAuth = useCallback(
    () => withAuthGuard('performDeviceAuth', runDeviceAuth),
    [withAuthGuard, runDeviceAuth]
  )

  /**
   * Unlocks the app with the user selected authentication method, without the in-flight guard.
   */
  const runUnlockApp = useCallback(async () => {
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
    }
  }, [logger, navigation, runDeviceAuth, problemWithAppAlert])

  /**
   * Handles unlocking the app using the user selected authentication method.
   * - PIN: EnterPIN, or Lockout if locked.
   * - Device auth: DeviceAuthInfo (unless dismissed), DeviceAuthAppReset if unavailable, else the OS prompt.
   *
   * Ignored if an unlock is already in progress.
   *
   * @returns Promise that resolves when the unlock process is complete
   */
  const unlockApp = useCallback(() => withAuthGuard('UnlockApp', runUnlockApp), [withAuthGuard, runUnlockApp])

  return useMemo(() => ({ unlockApp, performDeviceAuth }), [unlockApp, performDeviceAuth])
}
