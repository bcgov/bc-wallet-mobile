import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { getBCSCAppStoreUrl } from '@/utils/links'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Platform } from 'react-native'

/**
 * Hook that centralizes alert handling for all {@link AppEventCode} values.
 *
 * This hook acts as the alert policy layer for the application. It maps
 * domain-level {@link AppEventCode} values to their corresponding
 * user-facing alert behavior and executes the appropriate alert when requested.
 *
 * Alerts are categorized as:
 * - Basic alerts: Display a localized title and description with a default close action.
 * - Complex alerts: Include additional actions such as navigation, factory reset,
 *   external linking, or other side effects.
 *
 * By routing all alert behavior through this hook, the application ensures:
 * - Consistent alert messaging and structure
 * - A single source of truth for event-to-alert mappings
 * - Clear separation between domain events and UI presentation logic
 *
 * @param navigation - React Navigation prop used for alert-driven navigation actions.
 *
 * @returns An object containing:
 * - `showEventAlert` — Executes the alert associated with a given {@link AppEventCode}.
 *
 * @example
 * const { showEventAlert } = useAlerts(navigation)
 * showEventAlert(AppEventCode.SERVER_ERROR)
 */
export const useAlerts = (navigation: NavigationProp<ParamListBase>) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitAlert } = useErrorAlert()
  const factoryReset = useFactoryReset()

  const createBasicAlert = useCallback(
    (event: AppEventCode, alertKey: string, params?: Record<string, unknown>) => {
      return () => {
        emitAlert(t(`Alerts.${alertKey}.Title`, params), t(`Alerts.${alertKey}.Description`, params), { event })
      }
    },
    [emitAlert, t]
  )

  // BASIC ALERTS - These alerts only require a title, description, and event code, with no additional actions (default 'OK' to close).

  const unsecuredNetworkAlert = createBasicAlert(AppEventCode.UNSECURED_NETWORK, 'UnsecuredNetwork')
  const serverTimeoutAlert = createBasicAlert(AppEventCode.SERVER_TIMEOUT, 'ServerTimeout')
  const serverErrorAlert = createBasicAlert(AppEventCode.SERVER_ERROR, 'ServerError')
  const forgetPairingsAlert = createBasicAlert(AppEventCode.FORGET_ALL_PAIRINGS, 'ForgetPairings')
  const loginServerErrorAlert = createBasicAlert(AppEventCode.LOGIN_SERVER_ERROR, 'LoginServerError')
  const tooManyAttemptsAlert = createBasicAlert(AppEventCode.TOO_MANY_ATTEMPTS, 'TooManyAttempts')
  const verificationNotCompleteAlert = createBasicAlert(AppEventCode.VERIFY_NOT_COMPLETE, 'VerificationNotComplete')
  const problemWithLoginAlert = createBasicAlert(AppEventCode.LOGIN_PARSE_URI, 'ProblemWithLogin')
  const invalidPairingCodeAlert = createBasicAlert(AppEventCode.INVALID_PAIRING_CODE, 'InvalidPairingCode')
  const alreadyVerifiedAlert = createBasicAlert(AppEventCode.ALREADY_VERIFIED, 'AlreadyVerified')
  const invalidPairingCodeSameDeviceAlert = createBasicAlert(
    AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
    'InvalidPairingCodeSameDevice'
  )

  // COMPLEX ALERTS - These alerts require additional actions beyond just displaying a message.

  const appUpdateRequiredAlert = useCallback(() => {
    emitAlert(t('Alerts.AppUpdateRequired.Title'), t('Alerts.AppUpdateRequired.Description'), {
      event: Platform.select({
        ios: AppEventCode.IOS_APP_UPDATE_REQUIRED,
        default: AppEventCode.ANDROID_APP_UPDATE_REQUIRED,
      }),
      actions: [
        {
          text: t('Alerts.AppUpdateRequired.Action1'),
          onPress: async () => {
            try {
              const appStoreUrl = getBCSCAppStoreUrl()
              await Linking.openURL(appStoreUrl)
            } catch (error) {
              logger.info('[UpdateRequiredErrorPolicy] Failed to open app store URL', { error })
            }
          },
        },
      ],
    })
  }, [emitAlert, logger, t])

  const problemWithAccountAlert = useCallback(() => {
    emitAlert(t('Alerts.ProblemWithAccount.Title'), t('Alerts.ProblemWithAccount.Description'), {
      event: AppEventCode.NO_TOKENS_RETURNED,
      actions: [
        {
          text: t('Alerts.Actions.Close'),
          style: 'cancel',
        },
        {
          text: t('Alerts.ProblemWithAccount.Action1'),
          style: 'destructive',
          onPress: () => {
            navigation.navigate(BCSCScreens.RemoveAccountConfirmation)
          },
        },
      ],
    })
  }, [emitAlert, navigation, t])

  const setupExpiredAlert = useCallback(() => {
    emitAlert(t('Alerts.SetupExpired.Title'), t('Alerts.SetupExpired.Description'), {
      event: AppEventCode.USER_INPUT_EXPIRED_VERIFY_REQUEST,
      actions: [
        {
          text: t('Global.OK'),
          onPress: async () => {
            try {
              await factoryReset()
            } catch (error) {
              logger.error('[ExpiredAppSetupErrorPolicy] Failed resetting application', error as Error)
            }
          },
        },
      ],
    })
  }, [emitAlert, logger, t, factoryReset])

  const liveCallFileUploadAlert = useCallback(() => {
    emitAlert(t('Alerts.LiveCallFileUploadError.Title'), t('Alerts.LiveCallFileUploadError.Description'), {
      event: AppEventCode.LIVE_CALL_FILE_UPLOAD_ERROR,
      /**
       * Note: Documentation states 'OK' just closes the alert, but also states:
       * "On 'Call Now' if the photos could not be uploaded the video call will not be created."
       *  So we navigate back to the verification method selection screen to restart the flow.
       */
      actions: [
        {
          text: t('Global.OK'),
          onPress: () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.VerificationMethodSelection }],
              })
            )
          },
        },
      ],
    })
  }, [emitAlert, navigation, t])

  const dataUseWarningAlert = useCallback(() => {
    emitAlert(t('Alerts.DataUseWarning.Title'), t('Alerts.DataUseWarning.Description'), {
      event: AppEventCode.DATA_USE_WARNING,
      actions: [
        {
          text: t('Alerts.DataUseWarning.Action1'),
          style: 'cancel',
        },
        {
          text: t('Alerts.DataUseWarning.Action2'),
          onPress: () => {
            navigation.navigate(BCSCScreens.TakePhoto, {
              forLiveCall: true,
              deviceSide: 'front',
              cameraInstructions: '',
              cameraLabel: '',
            })
          },
          style: 'destructive',
        },
      ],
    })
  }, [emitAlert, navigation, t])

  /**
   * Show event alert based on the provided AppEventCode.
   *
   * @param appEvent - The AppEventCode for which to show the alert.
   * @returns void
   */
  const showEventAlert = useCallback(
    (appEvent: AppEventCode) => {
      const alertMap: Partial<Record<AppEventCode, () => void>> = {
        [AppEventCode.UNSECURED_NETWORK]: unsecuredNetworkAlert,
        [AppEventCode.SERVER_TIMEOUT]: serverTimeoutAlert,
        [AppEventCode.SERVER_ERROR]: serverErrorAlert,
        [AppEventCode.IOS_APP_UPDATE_REQUIRED]: appUpdateRequiredAlert,
        [AppEventCode.ANDROID_APP_UPDATE_REQUIRED]: appUpdateRequiredAlert,
        [AppEventCode.NO_TOKENS_RETURNED]: problemWithAccountAlert,
        [AppEventCode.LOGIN_SERVER_ERROR]: loginServerErrorAlert,
        [AppEventCode.FORGET_ALL_PAIRINGS]: forgetPairingsAlert,
        [AppEventCode.TOO_MANY_ATTEMPTS]: tooManyAttemptsAlert,
        [AppEventCode.USER_INPUT_EXPIRED_VERIFY_REQUEST]: setupExpiredAlert,
        [AppEventCode.VERIFY_NOT_COMPLETE]: verificationNotCompleteAlert,
        [AppEventCode.LOGIN_PARSE_URI]: problemWithLoginAlert,
        [AppEventCode.INVALID_PAIRING_CODE]: invalidPairingCodeAlert,
        [AppEventCode.LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING_CODE]: invalidPairingCodeAlert,
        [AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE]: invalidPairingCodeSameDeviceAlert,
        [AppEventCode.LIVE_CALL_FILE_UPLOAD_ERROR]: liveCallFileUploadAlert,
        [AppEventCode.ALREADY_VERIFIED]: alreadyVerifiedAlert,
        [AppEventCode.DATA_USE_WARNING]: dataUseWarningAlert,
      }

      const alertFunction = alertMap[appEvent]

      if (alertFunction) {
        logger.info(`[EventAlert] Showing alert for AppEventCode: ${appEvent}`)
        alertFunction()
        return
      }

      logger.warn(`[EventAlert] No alert found for AppEventCode: ${appEvent}`)
    },
    [
      alreadyVerifiedAlert,
      appUpdateRequiredAlert,
      dataUseWarningAlert,
      forgetPairingsAlert,
      invalidPairingCodeAlert,
      invalidPairingCodeSameDeviceAlert,
      liveCallFileUploadAlert,
      logger,
      loginServerErrorAlert,
      problemWithAccountAlert,
      problemWithLoginAlert,
      serverErrorAlert,
      serverTimeoutAlert,
      setupExpiredAlert,
      tooManyAttemptsAlert,
      unsecuredNetworkAlert,
      verificationNotCompleteAlert,
    ]
  )

  return useMemo(
    () => ({
      showEventAlert,
    }),
    [showEventAlert]
  )
}
