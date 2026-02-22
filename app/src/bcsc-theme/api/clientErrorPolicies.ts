import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AppAlerts } from '@/hooks/useAlerts'
import { BifoldLogger } from '@bifold/core'
import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native'
import { AxiosError } from 'axios'
import { TFunction } from 'i18next'
import { Linking } from 'react-native'
import { VerificationCardError } from '../features/verify/VerificationCardErrorScreen'
import { BCSCScreens } from '../types/navigators'
import { BCSCEndpoints } from './client'

export type ErrorMatcherContext = {
  endpoint: string // current route name for context
  statusCode: number // HTTP status code for context
  apiEndpoints: BCSCEndpoints // current API endpoints for context
}

type ErrorHandlerContext = {
  translate: TFunction
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
// Helper Functions + Alert Maps
// ----------------------------------------

// Global alert map for app events that can occur across multiple endpoints (e.g. network errors, server errors)
const _getGlobalAlertMap = (alerts?: AppAlerts) => {
  return new Map([
    [AppEventCode.UNSECURED_NETWORK, alerts?.unsecuredNetworkAlert],
    [AppEventCode.SERVER_TIMEOUT, alerts?.serverTimeoutAlert],
    [AppEventCode.SERVER_ERROR, alerts?.serverErrorAlert],
    [AppEventCode.TOO_MANY_ATTEMPTS, alerts?.tooManyAttemptsAlert],
  ])
}

// Alert map for LOGIN_REJECTED events that can occur on multiple endpoints (client metadata fetch, device authorization)
const _getLoginRejectedAlertMap = (alerts?: AppAlerts) => {
  return new Map([
    [AppEventCode.LOGIN_REJECTED_400, alerts?.loginRejected400Alert],
    [AppEventCode.LOGIN_REJECTED_401, alerts?.loginRejected401Alert],
    [AppEventCode.LOGIN_REJECTED_403, alerts?.loginRejected403Alert],
  ])
}

// Alert map for device verification assertion errors
const _getVerifyDeviceAssertionAlertMap = (alerts?: AppAlerts) => {
  return new Map([
    [AppEventCode.LOGIN_SERVER_ERROR, alerts?.loginServerErrorAlert],
    [AppEventCode.LOGIN_PARSE_URI, alerts?.problemWithLoginAlert],
    [AppEventCode.INVALID_PAIRING_CODE, alerts?.invalidPairingCodeAlert],
    [AppEventCode.LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING_CODE, alerts?.invalidPairingCodeAlert],
    [AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE, alerts?.loginSameDeviceInvalidPairingCodeAlert],
  ])
}

// ----------------------------------------
// Error Handling Policies
// https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574122/Mobile+App+Alerts#MobileAppAlerts-Alertswithouterrorcodes
// ----------------------------------------

// Global alert policy for predefined app event codes
export const globalAlertErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return _getGlobalAlertMap().has(error.appEvent)
  },
  handle: (error, context) => {
    const alert = _getGlobalAlertMap(context.alerts).get(error.appEvent)

    if (!alert) {
      context.logger.warn(`[GlobalAlertErrorPolicy] No alert defined for app event: ${error.appEvent}`)
      return
    }

    alert()
  },
}

// Error policy LOGIN_REJECT events that appear on client metadata fetch failures
export const loginRejectedOnClientMetadataErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      _getLoginRejectedAlertMap().has(error.appEvent) && context.endpoint.includes(context.apiEndpoints.clientMetadata)
    )
  },
  handle: (error, context) => {
    const alert = _getLoginRejectedAlertMap(context.alerts).get(error.appEvent)

    if (!alert) {
      context.logger.warn(
        `[LoginRejectedOnClientMetadataErrorPolicy] No alert defined for app event: ${error.appEvent}`
      )
      return
    }

    alert()
  },
}

// Error policy LOGIN_REJECTED events that appear on device verification
export const loginRejectedOnDeviceAuthorizationErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      _getLoginRejectedAlertMap().has(error.appEvent) &&
      context.endpoint.includes(context.apiEndpoints.deviceAuthorization)
    )
  },
  handle: (error, context) => {
    const alert = _getLoginRejectedAlertMap(context.alerts).get(error.appEvent)

    if (!alert) {
      context.logger.warn(
        `[LoginRejectedOnDeviceAuthorizationErrorPolicy] No alert defined for app event: ${error.appEvent}`
      )
      return
    }

    alert()
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
      _getVerifyDeviceAssertionAlertMap().has(error.appEvent) &&
      context.endpoint === `${context.apiEndpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
    )
  },
  handle: (error, context) => {
    const alert = _getVerifyDeviceAssertionAlertMap(context.alerts).get(error.appEvent)

    if (!alert) {
      context.logger.warn(`[VerifyDeviceAssertionErrorPolicy] No alert defined for app event: ${error.appEvent}`)
      return
    }

    alert()
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

// Error policy for expired physical card on device authorization endpoint
export const cardExpiredErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      error.appEvent === AppEventCode.UNKNOWN_SERVER_ERROR &&
      error.technicalMessage === 'card_expired' &&
      context.endpoint.includes(context.apiEndpoints.deviceAuthorization)
    )
  },
  handle: (_error, context) => {
    context.logger.info('[CardExpiredErrorPolicy] Card expired, navigating to VerificationCardError screen')
    context.navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: BCSCScreens.SetupSteps },
          {
            name: BCSCScreens.VerificationCardError,
            params: { errorType: VerificationCardError.CardExpired },
          },
        ],
      })
    )
  },
}

// ----------------------------------------
// Error Handling Policy Factories
// ----------------------------------------

// Aggregate of all client error handling policies
export const ClientErrorHandlingPolicies: ErrorHandlingPolicy[] = [
  alreadyRegisteredErrorPolicy,
  cardExpiredErrorPolicy,
  birthdateLockoutErrorPolicy,
  noTokensReturnedErrorPolicy,
  updateRequiredErrorPolicy,
  verifyNotCompletedErrorPolicy,
  verifyDeviceAssertionErrorPolicy,
  expiredAppSetupErrorPolicy,
  loginRejectedOnClientMetadataErrorPolicy,
  loginRejectedOnDeviceAuthorizationErrorPolicy,
  alreadyVerifiedErrorPolicy,
  invalidTokenReturnedPolicy,
  // Specific polices listed above, followed by global policies
  globalAlertErrorPolicy,
  unexpectedServerErrorPolicy,
]
