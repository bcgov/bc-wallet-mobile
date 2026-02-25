import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useBCSCStack } from '@/bcsc-theme/contexts/BCSCStackContext'
import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
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
  const { stack } = useBCSCStack()

  // HELPER FUNCTIONS

  // _createBasicAlert is a factory function that generates simple alerts for a given AppEventCode and localization key.
  const _createBasicAlert = useCallback(
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

  // _createProblemWithAccountAlert generates alerts specific to account-related issues that require user action to resolve (e.g., removing the account).
  const _createProblemWithAccountAlert = useCallback(
    (event: AppEventCode, errorCode: string) => {
      return () => {
        emitAlert(t(`Alerts.ProblemWithAccount.Title`), t(`Alerts.ProblemWithAccount.Description`, { errorCode }), {
          event,
          actions: [
            {
              text: t('Global.Close'),
              style: 'cancel',
            },
            {
              text: t('Alerts.ProblemWithAccount.Action1'),
              style: 'destructive',
              onPress: () => {
                switch (stack) {
                  case BCSCStacks.Main:
                    return navigation.navigate(BCSCScreens.MainRemoveAccountConfirmation)
                  case BCSCStacks.Onboarding:
                    return navigation.navigate(BCSCScreens.OnboardingRemoveAccountConfirmation)
                  case BCSCStacks.Verify:
                    return navigation.navigate(BCSCScreens.VerifyRemoveAccountConfirmation)
                }

                logger.warn('[ProblemWithAccountAlert] triggered but no matching stack found for navigation', { stack })
              },
            },
          ],
        })
      }
    },
    [emitAlert, logger, navigation, stack, t]
  )

  // COMPLEX ALERTS - These alerts require additional actions beyond just displaying a message.

  const appUpdateRequiredAlert = useCallback(() => {
    emitAlert(t('Alerts.AppUpdateRequired.Title'), t('Alerts.AppUpdateRequired.Description'), {
      event: Platform.OS === 'ios' ? AppEventCode.IOS_APP_UPDATE_REQUIRED : AppEventCode.ANDROID_APP_UPDATE_REQUIRED,
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
          text: t('Global.Continue'),
          style: 'cancel',
        },
        {
          text: t('Alerts.DataUseWarning.Action1'),
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
    () =>
      // prettier-ignore
      ({
      appUpdateRequiredAlert,
      setupExpiredAlert,
      liveCallFileUploadAlert,
      dataUseWarningAlert,
      liveCallHavingTroubleAlert,
      cancelVerificationRequestAlert,
      problemWithAppAlert: _createBasicAlert(AppEventCode.GENERAL, 'ProblemWithApp', { errorCode: '000' }),
      unsecuredNetworkAlert: _createBasicAlert(AppEventCode.UNSECURED_NETWORK, 'UnsecuredNetwork'),
      serverTimeoutAlert: _createBasicAlert(AppEventCode.SERVER_TIMEOUT, 'ServerTimeout'),
      serverErrorAlert: _createBasicAlert(AppEventCode.SERVER_ERROR, 'ServerError'),
      forgetPairingsAlert: _createBasicAlert(AppEventCode.FORGET_ALL_PAIRINGS, 'ForgetPairings'),
      tooManyAttemptsAlert: _createBasicAlert(AppEventCode.TOO_MANY_ATTEMPTS, 'TooManyAttempts'),
      verificationNotCompleteAlert: _createBasicAlert(AppEventCode.VERIFY_NOT_COMPLETE, 'VerificationNotComplete'),
      invalidPairingCodeAlert: _createBasicAlert(AppEventCode.INVALID_PAIRING_CODE, 'InvalidPairingCode'),
      alreadyVerifiedAlert: _createBasicAlert(AppEventCode.ALREADY_VERIFIED, 'AlreadyVerified'),
      fileUploadErrorAlert: _createBasicAlert(AppEventCode.FILE_UPLOAD_ERROR, 'FileUploadError'),
      loginSameDeviceInvalidPairingCodeAlert: _createBasicAlert(AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE, 'InvalidPairingCodeSameDevice'),
      failedToWriteToLocalStorageAlert: _createBasicAlert(AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE, 'ProblemWithApp', { errorCode: '100' }),
      failedToReadFromLocalStorageAlert: _createBasicAlert(AppEventCode.ERR_101_FAILED_TO_READ_LOCAL_STORAGE, 'ProblemWithApp', { errorCode: '101' }),
      clientRegistrationNullAlert: _createBasicAlert(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL, 'ProblemWithApp', { errorCode: '102' }),
      unableToDecryptIdTokenAlert: _createBasicAlert(AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN, 'ProblemWithApp', { errorCode: '105' }),
      failedToDeserializeJsonAlert: _createBasicAlert(AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON, 'ProblemWithApp', { errorCode: '109' }),
      loginServerErrorAlert: _createBasicAlert(AppEventCode.LOGIN_SERVER_ERROR, 'ProblemWithLogin', { errorCode: '303' }),
      problemWithLoginAlert: _createBasicAlert(AppEventCode.LOGIN_PARSE_URI, 'ProblemWithLogin', { errorCode: '304' }),
      loginRejected401Alert: _createProblemWithAccountAlert(AppEventCode.LOGIN_REJECTED_401, '401'),
      loginRejected403Alert: _createProblemWithAccountAlert(AppEventCode.LOGIN_REJECTED_403, '403'),
      loginRejected400Alert: _createProblemWithAccountAlert(AppEventCode.LOGIN_REJECTED_400, '400-1'),
      noTokensReturnedAlert: _createProblemWithAccountAlert(AppEventCode.NO_TOKENS_RETURNED, '214'),
      invalidTokenAlert: _createProblemWithAccountAlert(AppEventCode.INVALID_TOKEN, '215'),
    }),
    [
      _createBasicAlert,
      _createProblemWithAccountAlert,
      appUpdateRequiredAlert,
      setupExpiredAlert,
      liveCallFileUploadAlert,
      dataUseWarningAlert,
      liveCallHavingTroubleAlert,
      cancelVerificationRequestAlert,
    ]
  )
}
