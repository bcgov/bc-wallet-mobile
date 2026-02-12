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

export type AppAlerts = ReturnType<typeof useAlerts>

/**
 * Hook to centralize the creation of alerts.
 *
 * Each alert corresponds to a specific AppEventCode and contains the necessary information and actions for that event.
 * This allows for consistent alert handling across the app and makes it easy to manage and update alerts in one place.
 *
 * @param navigation - The navigation prop used for navigating to different screens from within alert actions.
 * @returns An object containing functions to trigger alerts for various app events.
 */
export const useAlerts = (navigation: NavigationProp<ParamListBase>) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitAlert } = useErrorAlert()
  const factoryReset = useFactoryReset()

  const unsecuredNetworkAlert = useCallback(() => {
    emitAlert(t('Alerts.UnsecuredNetwork.Title'), t('Alerts.UnsecuredNetwork.Description'), {
      event: AppEventCode.UNSECURED_NETWORK,
    })
  }, [emitAlert, t])

  const serverTimeoutAlert = useCallback(() => {
    emitAlert(t('Alerts.ServerTimeout.Title'), t('Alerts.ServerTimeout.Description'), {
      event: AppEventCode.SERVER_TIMEOUT,
    })
  }, [emitAlert, t])

  const serverErrorAlert = useCallback(() => {
    emitAlert(t('Alerts.ServerError.Title'), t('Alerts.ServerError.Description'), {
      event: AppEventCode.SERVER_ERROR,
    })
  }, [emitAlert, t])

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
          onPress: () => {
            // noop
          },
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

  const forgetPairingsAlert = useCallback(() => {
    emitAlert(t('Alerts.ForgetPairings.Title'), t('Alerts.ForgetPairings.Description'), {
      event: AppEventCode.FORGET_ALL_PAIRINGS,
    })
  }, [emitAlert, t])

  const loginServerErrorAlert = useCallback(() => {
    emitAlert(t('Alerts.LoginServerError.Title'), t('Alerts.LoginServerError.Description'), {
      event: AppEventCode.LOGIN_SERVER_ERROR,
    })
  }, [emitAlert, t])

  const tooManyAttemptsAlert = useCallback(() => {
    emitAlert(t('Alerts.TooManyAttempts.Title'), t('Alerts.TooManyAttempts.Description'), {
      event: AppEventCode.TOO_MANY_ATTEMPTS,
    })
  }, [emitAlert, t])

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

  const verificationNotCompleteAlert = useCallback(() => {
    emitAlert(t('Alerts.VerificationNotComplete.Title'), t('Alerts.VerificationNotComplete.Description'), {
      event: AppEventCode.VERIFY_NOT_COMPLETE,
    })
  }, [emitAlert, t])

  const problemWithLoginAlert = useCallback(() => {
    emitAlert(t('Alerts.ProblemWithLogin.Title'), t('Alerts.ProblemWithLogin.Description'), {
      event: AppEventCode.LOGIN_PARSE_URI,
      // TODO (MD): Docs say 'OK' closes alert AND removes login request. Add action to remove login request?
    })
  }, [emitAlert, t])

  const invalidPairingCodeAlert = useCallback(() => {
    emitAlert(t('Alerts.InvalidPairingCode.Title'), t('Alerts.InvalidPairingCode.Description'), {
      event: AppEventCode.INVALID_PAIRING_CODE,
    })
  }, [emitAlert, t])

  const invalidPairingCodeSameDeviceAlert = useCallback(() => {
    emitAlert(t('Alerts.InvalidPairingCodeSameDevice.Title'), t('Alerts.InvalidPairingCodeSameDevice.Description'), {
      event: AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
    })
  }, [emitAlert, t])

  const alreadyVerifiedAlert = useCallback(() => {
    emitAlert(t('Alerts.AlreadyVerified.Title'), t('Alerts.AlreadyVerified.Description'), {
      event: AppEventCode.ALREADY_VERIFIED,
    })
  }, [emitAlert, t])

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

  return useMemo(
    () => ({
      unsecuredNetworkAlert,
      serverTimeoutAlert,
      serverErrorAlert,
      appUpdateRequiredAlert,
      problemWithAccountAlert,
      forgetPairingsAlert,
      liveCallFileUploadAlert,
      dataUseWarningAlert,
      loginServerErrorAlert,
      tooManyAttemptsAlert,
      setupExpiredAlert,
      verificationNotCompleteAlert,
      problemWithLoginAlert,
      invalidPairingCodeAlert,
      invalidPairingCodeSameDeviceAlert,
      alreadyVerifiedAlert,
    }),
    [
      unsecuredNetworkAlert,
      serverTimeoutAlert,
      serverErrorAlert,
      appUpdateRequiredAlert,
      problemWithAccountAlert,
      forgetPairingsAlert,
      liveCallFileUploadAlert,
      dataUseWarningAlert,
      loginServerErrorAlert,
      tooManyAttemptsAlert,
      setupExpiredAlert,
      verificationNotCompleteAlert,
      problemWithLoginAlert,
      invalidPairingCodeAlert,
      invalidPairingCodeSameDeviceAlert,
      alreadyVerifiedAlert,
    ]
  )
}

/**
 * Utility function to get the corresponding alert function for a given AppEventCode.
 *
 * @param appEvent - The AppEventCode for which to get the alert function.
 * @param alerts - The object containing all alert functions returned by the useAlerts hook.
 * @returns The alert function corresponding to the given AppEventCode, or undefined if no match is found.
 */
export const getAppEventAlert = (appEvent: AppEventCode, alerts: AppAlerts) => {
  const alertMap = new Map<AppEventCode, () => void>([
    [AppEventCode.UNSECURED_NETWORK, alerts.unsecuredNetworkAlert],
    [AppEventCode.SERVER_TIMEOUT, alerts.serverTimeoutAlert],
    [AppEventCode.SERVER_ERROR, alerts.serverErrorAlert],
    [AppEventCode.IOS_APP_UPDATE_REQUIRED, alerts.appUpdateRequiredAlert],
    [AppEventCode.ANDROID_APP_UPDATE_REQUIRED, alerts.appUpdateRequiredAlert],
    [AppEventCode.NO_TOKENS_RETURNED, alerts.problemWithAccountAlert],
    [AppEventCode.LOGIN_SERVER_ERROR, alerts.loginServerErrorAlert],
    [AppEventCode.TOO_MANY_ATTEMPTS, alerts.tooManyAttemptsAlert],
    [AppEventCode.USER_INPUT_EXPIRED_VERIFY_REQUEST, alerts.setupExpiredAlert],
    [AppEventCode.VERIFY_NOT_COMPLETE, alerts.verificationNotCompleteAlert],
    [AppEventCode.LOGIN_PARSE_URI, alerts.problemWithLoginAlert],
    [AppEventCode.INVALID_PAIRING_CODE, alerts.invalidPairingCodeAlert],
    [AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE, alerts.invalidPairingCodeSameDeviceAlert],
    [AppEventCode.LIVE_CALL_FILE_UPLOAD_ERROR, alerts.liveCallFileUploadAlert],
    [AppEventCode.ALREADY_VERIFIED, alerts.alreadyVerifiedAlert],
  ])

  return alertMap.get(appEvent)
}
