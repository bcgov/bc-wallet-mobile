import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AppAlerts } from '@/hooks/useAlerts'
import { AlertAction } from '@/utils/alert'
import { BifoldLogger } from '@bifold/core'
import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native'
import { AxiosError } from 'axios'
import { TFunction } from 'i18next'
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

/**
 * Set of event codes for verify device assertion endpoint
 */
const VERIFY_DEVICE_ASSERTION_EVENT_CODES = new Set([
  AppEventCode.LOGIN_SERVER_ERROR,
  AppEventCode.LOGIN_PARSE_URI,
  AppEventCode.INVALID_PAIRING_CODE,
  AppEventCode.LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING_CODE,
  AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
])

export type ErrorMatcherContext = {
  endpoint: string // current route name for context
  statusCode: number // HTTP status code for context
  apiEndpoints: BCSCEndpoints // current API endpoints for context
}

type ErrorHandlerContext = {
  translate: TFunction
  /** @deprecated Use specific alert functions from context.alerts */
  emitAlert: (title: string, message: string, options?: { actions?: AlertAction[] }) => void
  navigation: NavigationProp<ParamListBase>
  linking: typeof Linking
  logger: BifoldLogger
  alerts: AppAlerts
}

export interface AxiosAppError extends AppError {
  cause: AxiosError
}

type ErrorHandlingPolicy = {
  matches: (error: AxiosAppError, context: ErrorMatcherContext) => boolean
  handle: (error: AxiosAppError, context: ErrorHandlerContext) => void
}

// ----------------------------------------
// Error Handling Policies
// ----------------------------------------

// Global alert policy for predefined app event codes
export const globalAlertErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return GLOBAL_ALERT_EVENT_CODES.has(error.appEvent)
  },
  handle: (error, context) => {
    switch (error.appEvent) {
      case AppEventCode.UNSECURED_NETWORK:
        return context.alerts.unsecuredNetworkAlert()
      case AppEventCode.SERVER_TIMEOUT:
        return context.alerts.serverTimeoutAlert()
      case AppEventCode.SERVER_ERROR:
        return context.alerts.serverErrorAlert()
      case AppEventCode.TOO_MANY_ATTEMPTS:
        return context.alerts.tooManyAttemptsAlert()
    }

    context.logger.warn(`[GlobalAlertErrorPolicy] No alert defined for app event: ${error.appEvent}`)
  },
}

// Error policy LOGIN_REJECT events that appear on client metadata fetch failures
export const loginRejectedOnClientMetadataErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      (error.appEvent === AppEventCode.LOGIN_REJECTED_401 ||
        error.appEvent === AppEventCode.LOGIN_REJECTED_403 ||
        error.appEvent === AppEventCode.LOGIN_REJECTED_400) &&
      context.endpoint.includes(context.apiEndpoints.clientMetadata)
    )
  },
  handle: (error, context) => {
    switch (error.appEvent) {
      case AppEventCode.LOGIN_REJECTED_400:
        return context.alerts.loginRejected400Alert()
      case AppEventCode.LOGIN_REJECTED_401:
        return context.alerts.loginRejected401Alert()
      case AppEventCode.LOGIN_REJECTED_403:
        return context.alerts.loginRejected403Alert()
    }
  },
}

// Error policy LOGIN_REJECTED events that appear on device verification
export const loginRejectedOnDeviceAuthorizationErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      (error.appEvent === AppEventCode.LOGIN_REJECTED_401 ||
        error.appEvent === AppEventCode.LOGIN_REJECTED_403 ||
        error.appEvent === AppEventCode.LOGIN_REJECTED_400) &&
      context.endpoint.includes(context.apiEndpoints.deviceAuthorization)
    )
  },
  handle: (error, context) => {
    switch (error.appEvent) {
      case AppEventCode.LOGIN_REJECTED_400:
        return context.alerts.loginRejected400Alert()
      case AppEventCode.LOGIN_REJECTED_401:
        return context.alerts.loginRejected401Alert()
      case AppEventCode.LOGIN_REJECTED_403:
        return context.alerts.loginRejected403Alert()
    }
  },
}

// Error policy for NO_TOKENS_RETURNED event on token endpoint
export const noTokensReturnedErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return error.appEvent === AppEventCode.NO_TOKENS_RETURNED && context.endpoint.includes(context.apiEndpoints.token)
  },
  handle: (_error, context) => {
    context.alerts.noTokensReturnedAlert()
  },
}
// Error policy for INVALID_TOKEN event on token endpoint
export const invalidTokenReturnedPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return error.appEvent === AppEventCode.INVALID_TOKEN && context.endpoint.includes(context.apiEndpoints.token)
  },
  handle: (_error, context) => {
    context.alerts.invalidTokenAlert()
  },
}

// Error policy for VERIFY_NOT_COMPLETE event on evidence endpoint
export const verifyNotCompletedErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return error.appEvent === AppEventCode.VERIFY_NOT_COMPLETE && context.endpoint === context.apiEndpoints.token
  },
  handle: (_error, context) => {
    context.alerts.verificationNotCompleteAlert()
  },
}

// Error policy for unexpected server errors (http status: 500, 503)
export const unexpectedServerErrorPolicy: ErrorHandlingPolicy = {
  matches: (_, context) => {
    return context.statusCode === 500 || context.statusCode === 503
  },
  handle: (_error, context) => {
    context.alerts.serverErrorAlert()
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
  handle: (_error, context) => {
    context.alerts.appUpdateRequiredAlert()
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

// Error policy for verify device assertion endpoint errors
export const verifyDeviceAssertionErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      VERIFY_DEVICE_ASSERTION_EVENT_CODES.has(error.appEvent) &&
      context.endpoint === `${context.apiEndpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
    )
  },
  handle: (error, context) => {
    switch (error.appEvent) {
      case AppEventCode.LOGIN_SERVER_ERROR:
        return context.alerts.serverErrorAlert()
      case AppEventCode.LOGIN_PARSE_URI:
        return context.alerts.problemWithLoginAlert()
      case AppEventCode.INVALID_PAIRING_CODE:
        return context.alerts.invalidPairingCodeAlert()
      case AppEventCode.LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING_CODE:
        return context.alerts.invalidPairingCodeAlert()
      case AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE:
        return context.alerts.loginSameDeviceInvalidPairingCodeAlert()
    }

    context.logger.warn(`[VerifyDeviceAssertaionErrorPolicy] No alert defined for app event: ${error.appEvent}`)
  },
}

/**
 * Error policy for expired verify request during app setup (user input error)
 *
 * @returns ErrorHandlingPolicy
 */
export const expiredAppSetupErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      error.appEvent === AppEventCode.USER_INPUT_EXPIRED_VERIFY_REQUEST &&
      context.endpoint === context.apiEndpoints.token
    )
  },
  handle: (_error, context) => {
    context.alerts.setupExpiredAlert()
  },
}

// Error policy for already verified event on token endpoint
export const alreadyVerifiedErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return error.appEvent === AppEventCode.ALREADY_VERIFIED && context.endpoint === context.apiEndpoints.token
  },
  handle: (_error, context) => {
    context.alerts.alreadyVerifiedAlert()
  },
}

// ----------------------------------------
// Error Handling Policy Factories
// ----------------------------------------

// Aggregate of all client error handling policies
export const ClientErrorHandlingPolicies: ErrorHandlingPolicy[] = [
  alreadyRegisteredErrorPolicy,
  birthdateLockoutErrorPolicy,
  noTokensReturnedErrorPolicy,
  updateRequiredErrorPolicy,
  verifyNotCompletedErrorPolicy,
  verifyDeviceAssertionErrorPolicy,
  expiredAppSetupErrorPolicy,
  alreadyVerifiedErrorPolicy,
  loginRejectedOnClientMetadataErrorPolicy,
  loginRejectedOnDeviceAuthorizationErrorPolicy,
  alreadyVerifiedErrorPolicy,
  invalidTokenReturnedPolicy,
  // Specific polices listed above, followed by global policies
  globalAlertErrorPolicy,
  unexpectedServerErrorPolicy,
]
