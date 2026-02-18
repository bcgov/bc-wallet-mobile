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
type AlertOnPressAction = () => void | Promise<void>

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
 *
 * @example
 * const alerts = useAlerts(navigation)
 * alerts.unsecuredNetworkAlert() // Shows the unsecured network alert
 *
 * @param navigation - React Navigation prop used for alert-driven navigation actions.
 * @returns An object containing:
 * - Predefined alert functions for each AppEventCode that can be directly invoked to show the corresponding alert.
 */
export const useAlerts = (navigation: NavigationProp<ParamListBase>) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitAlert } = useErrorAlert()
  const factoryReset = useFactoryReset()

  // HELPER FUNCTIONS

  const createBasicAlert = useCallback(
    (event: AppEventCode, alertKey: string, params?: Record<string, unknown>) => {
      return () => {
        emitAlert(t(`Alerts.${alertKey}.Title`, params), t(`Alerts.${alertKey}.Description`, params), {
          event,
          actions: [
            {
              text: t('Global.OK'),
            },
          ],
        })
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
  const loginSameDeviceInvalidPairingCodeAlert = createBasicAlert(
    AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
    'InvalidPairingCodeSameDevice'
  )

  // Problem with app error alerts - These represent critical issues with the app itself
  const failedToWriteToLocalStorageAlert = createBasicAlert(AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE, 'ProblemWithApp', { errorCode: 100 })
  const failedToReadFromLocalStorageAlert = createBasicAlert(AppEventCode.ERR_101_FAILED_TO_READ_LOCAL_STORAGE, 'ProblemWithApp', { errorCode: 101 })
  const clientRegistrationNullAlert = createBasicAlert(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL, 'ProblemWithApp', { errorCode: 102 })
  const authorizationRequestNullAlert = createBasicAlert(AppEventCode.ERR_103_AUTHORIZATION_REQUEST_UNEXPECTEDLY_NULL, 'ProblemWithApp', { errorCode: 103 })
  const credentialNullAlert = createBasicAlert(AppEventCode.ERR_104_CREDENTIAL_UNEXPECTEDLY_NULL, 'ProblemWithApp', { errorCode: 104 })
  const unableToDecreptIdTokenAlert = createBasicAlert(AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN, 'ProblemWithApp', { errorCode: 105 })
  const unableToDeleteKeyPairAlert = createBasicAlert(AppEventCode.ERR_108_UNABLE_TO_DELETE_KEY_PAIR, 'ProblemWithApp', { errorCode: 108 })
  const failedToDeserializeJsonAlert = createBasicAlert(AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON, 'ProblemWithApp', { errorCode: 109 })
  const unableToDecryptJweAlert = createBasicAlert(AppEventCode.ERR_110_UNABLE_TO_DECRYPT_JWE, 'ProblemWithApp', { errorCode: 110 })

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

  // INTERACTION DRIVEN ALERTS - These alerts require an additional context-specific action to be passed in when triggered.

  const liveCallHavingTroubleAlert = useCallback(
    (onAction: AlertOnPressAction) => {
      emitAlert(t('Alerts.LiveCallHavingTrouble.Title'), t('Alerts.LiveCallHavingTrouble.Description'), {
        event: AppEventCode.IN_CALL_HAVING_TROUBLE,
        actions: [
          {
            text: t('Global.Close'),
          },
          {
            text: t('Alerts.LiveCallHavingTrouble.Action1'),
            style: 'destructive',
            onPress: onAction,
          },
        ],
      })
    },
    [emitAlert, t]
  )

  const cancelVerificationRequestAlert = useCallback(
    (onAction: AlertOnPressAction) => {
      emitAlert(t('Alerts.CancelVerificationRequest.Title'), t('Alerts.CancelVerificationRequest.Description'), {
        event: AppEventCode.CANCEL_VERIFICATION_REQUEST,
        actions: [
          {
            text: t('Alerts.CancelVerificationRequest.Action1'),
            style: 'destructive',
            onPress: onAction,
          },
          {
            text: t('Global.Cancel'),
            style: 'cancel',
          },
        ],
      })
    },
    [emitAlert, t]
  )

  return useMemo(
    () => ({
      unsecuredNetworkAlert,
      serverTimeoutAlert,
      serverErrorAlert,
      forgetPairingsAlert,
      loginServerErrorAlert,
      tooManyAttemptsAlert,
      verificationNotCompleteAlert,
      problemWithLoginAlert,
      invalidPairingCodeAlert,
      loginSameDeviceInvalidPairingCodeAlert,
      alreadyVerifiedAlert,
      appUpdateRequiredAlert,
      problemWithAccountAlert,
      setupExpiredAlert,
      liveCallFileUploadAlert,
      dataUseWarningAlert,
      liveCallHavingTroubleAlert,
      cancelVerificationRequestAlert,
      failedToWriteToLocalStorageAlert,
      failedToReadFromLocalStorageAlert,
      clientRegistrationNullAlert,
      authorizationRequestNullAlert,
      credentialNullAlert,
      unableToDecreptIdTokenAlert,
      unableToDeleteKeyPairAlert,
      failedToDeserializeJsonAlert,
      unableToDecryptJweAlert,
    }),
    [unsecuredNetworkAlert, serverTimeoutAlert, serverErrorAlert, forgetPairingsAlert, loginServerErrorAlert, tooManyAttemptsAlert, verificationNotCompleteAlert, problemWithLoginAlert, invalidPairingCodeAlert, loginSameDeviceInvalidPairingCodeAlert, alreadyVerifiedAlert, appUpdateRequiredAlert, problemWithAccountAlert, setupExpiredAlert, liveCallFileUploadAlert, dataUseWarningAlert, liveCallHavingTroubleAlert, cancelVerificationRequestAlert, failedToWriteToLocalStorageAlert, failedToReadFromLocalStorageAlert, clientRegistrationNullAlert, authorizationRequestNullAlert, credentialNullAlert, unableToDecreptIdTokenAlert, unableToDeleteKeyPairAlert, failedToDeserializeJsonAlert, unableToDecryptJweAlert]
  )
}
