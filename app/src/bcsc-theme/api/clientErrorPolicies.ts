import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AlertAction } from '@/utils/alert'
import { getBCSCAppStoreUrl } from '@/utils/links'
import { BifoldLogger } from '@bifold/core'
import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native'
import { AxiosError } from 'axios'
import { TFunction } from 'react-i18next'
import { Linking } from 'react-native'
import { BCSCScreens } from '../types/navigators'
import { BCSCEndpoints } from './client'

/**
 * Set of event codes that should trigger alerts in the BCSC client
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574122/Mobile+App+Alerts#MobileAppAlerts-Alertswithouterrorcodes
 */
const GLOBAL_ALERT_EVENT_CODES = new Set([
  //AppEventCode.NO_INTERNET, // Handled by the InternetDisconnected modal
  AppEventCode.UNSECURED_NETWORK,
  AppEventCode.SERVER_TIMEOUT,
  AppEventCode.SERVER_ERROR,
  AppEventCode.TOO_MANY_ATTEMPTS,
])

export type ErrorMatcherContext = {
  endpoint: string // current route name for context
  apiEndpoints: BCSCEndpoints // current API endpoints for context
}

type ErrorHandlerContext = {
  translate: TFunction
  emitErrorAlert: (error: AppError, options?: { actions?: AlertAction[] }) => void
  navigation: NavigationProp<ParamListBase>
  linking: typeof Linking
  logger: BifoldLogger
}

export interface AxiosAppError extends AppError {
  cause: AxiosError
}

type ErrorHandlingPolicy = {
  matches: (error: AxiosAppError, context: ErrorMatcherContext) => boolean
  handle: (error: AxiosAppError, context: ErrorHandlerContext) => void
}

// Global alert policy for predefined app event codes
export const globalAlertErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return GLOBAL_ALERT_EVENT_CODES.has(error.appEvent)
  },
  handle: (error, context) => {
    context.emitErrorAlert(error)
  },
}

// Error policy for NO_TOKENS_RETURNED event on token endpoint
export const noTokensReturnedErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return error.appEvent === AppEventCode.NO_TOKENS_RETURNED && context.endpoint.includes(context.apiEndpoints.token)
  },
  handle: (error, context) => {
    context.emitErrorAlert(error, {
      actions: [
        {
          text: context.translate('Alerts.Actions.Close'),
          style: 'cancel',
          onPress: () => {
            // noop
          },
        },
        {
          text: context.translate('Alerts.Actions.RemoveAccount'),
          style: 'destructive',
          onPress: () => {
            context.navigation.navigate(BCSCScreens.RemoveAccountConfirmation)
          },
        },
      ],
    })
  },
}

// Error policy for app <IOS|ANDROID>_APP_UPDATE_REQUIRED required events on evidence endpoint
export const updateRequiredErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      (error.appEvent === AppEventCode.IOS_APP_UPDATE_REQUIRED ||
        error.appEvent === AppEventCode.ANDROID_APP_UPDATE_REQUIRED) &&
      context.endpoint.includes(context.apiEndpoints.evidence)
    )
  },
  handle: (error, context) => {
    context.emitErrorAlert(error, {
      actions: [
        {
          // QUESTION (MD): The docs suggest using "Update" for android, do we want to differentiate here?
          text: context.translate('Alerts.Actions.GoToAppStore'),
          onPress: async () => {
            try {
              const appStoreUrl = getBCSCAppStoreUrl()
              await context.linking.openURL(appStoreUrl)
            } catch (error) {
              context.logger.info('[UpdateRequiredErrorPolicy] Failed to open app store URL', { error })
            }
          },
        },
      ],
    })
  },
}

// Error policy for already registered device on device authorization endpoint
export const alreadyRegisteredErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      error.appEvent === AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST &&
      Boolean(error.technicalMessage?.includes('client is in invalid')) &&
      context.endpoint.includes(context.apiEndpoints.deviceAuthorization)
    )
  },
  handle: (_error, context) => {
    context.logger.info('[AlreadyRegisteredErrorPolicy] Device already registered, navigating to SetupSteps screen')
    context.navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCScreens.SetupSteps }],
      })
    )
  },
}

// Error policy for device authorization endpoint (too many birthdate + serial attempts)
// Handles 503 errors from deviceAuthorization endpoint, with or without retry-after header
export const birthdateLockoutErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return error.cause.status === 503 && context.endpoint.includes(context.apiEndpoints.deviceAuthorization)
  },
  handle: (error, context) => {
    context.logger.info(`[BirthdateLockoutErrorPolicy] Lockout with error:`, { error })
    context.navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.BirthdateLockout }],
      })
    )
  },
}

// Aggregate of all client error handling policies
export const ClientErrorHandlingPolicies: ErrorHandlingPolicy[] = [
  alreadyRegisteredErrorPolicy,
  birthdateLockoutErrorPolicy,
  globalAlertErrorPolicy,
  noTokensReturnedErrorPolicy,
  updateRequiredErrorPolicy,
]
