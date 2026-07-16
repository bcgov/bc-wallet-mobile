import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AppAlerts } from '@/hooks/useAlerts'
import { BifoldLogger } from '@bifold/core'
import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native'
import { AxiosError } from 'axios'
import { TFunction } from 'i18next'
import { Linking } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { VerificationCardError } from '../features/verify/verificationCardError'
import { BCSCModals, BCSCScreens } from '../types/navigators'
import { ResumeStepRoute } from '../utils/resume-step-route'
import { BCSCEndpoints } from './client'

/**
 * TODO (MD): Phase out client error policies in favor of
 * per-call error handling in use<Name>Service hooks.
 *
 * WHY: Every policy here is matched against every API error, so opting a single
 * call out of alert handling means adding endpoint-matching logic to this shared
 * file (e.g. videoSessionErrorPolicy, attestationPollingErrorPolicy), and the
 * error behavior for any given call is invisible from the call site itself.
 *
 * DIRECTION: Error handling should live in the use<Name>Service hook that wraps
 * the relevant use<Name>Api call, where each call can handle its own errors —
 * including suppressing alerts — inline. New calls should not add policies here.
 * When touching an existing policy, prefer migrating it out rather than extending
 * it in place. Remove this file once all policies have been migrated.
 *
 * NOTE: Use `skipOnErrorHandler` API client option to disable injected error
 * handling for a specific call.
 *
 * @link useEvidenceService.tsx -> cancelVerificationRequest
 */

const UNSUPPORTED_OS_TECHNICAL_MESSAGE = 'unsupported os version'
// Assertion-401 unsupported-OS marker lives in the response body's `errorMessage` field (V3 parity);
// V3 matched the looser "unsupported os" substring (the server sends e.g. "unsupported OS").
const ASSERTION_UNSUPPORTED_OS_MARKER = 'unsupported os'

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
  /**
   * Returns the verify-stack route the user should currently be on.
   * Recovery handlers use this to put the user back at their current step
   * instead of the (removed) SetupStepsScreen.
   */
  getResumeRoute: () => ResumeStepRoute
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

// HTTP alert map for network and server errors that can occur on multiple endpoints (client metadata fetch, device authorization, token, etc.)
const _getHTTPAlertMap = (alerts?: AppAlerts) => {
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

// Alert map for IAS errors 201–300 (add_card_*, err_206–213, err_299, err_300) plus
// status-mapped HTTP client errors (403 forbidden, 404 not found) that share the same modal style.
const _getIasErrorAlertMap = (alerts?: AppAlerts) => {
  return new Map([
    [AppEventCode.ADD_CARD_SERVER_CONFIGURATION, alerts?.serverConfigurationAlert],
    [AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION, alerts?.dynamicRegistrationErrorAlert],
    [AppEventCode.ADD_CARD_TERMS_OF_USE, alerts?.termsOfUseErrorAlert],
    [AppEventCode.ADD_CARD_INCORRECT_OS, alerts?.incorrectOsAlert],
    [AppEventCode.ADD_CARD_PROVIDER, alerts?.addCardNotAvailableAlert],
    [AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE, alerts?.missingJsonValuesAlert],
    [AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET, alerts?.signClaimsErrorAlert],
    [AppEventCode.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION, alerts?.unexpectedNetworkCallAlert],
    [AppEventCode.ERR_209_BAD_REQUEST, alerts?.badRequestAlert],
    [AppEventCode.ERR_210_UNAUTHORIZED, alerts?.unauthorizedAlert],
    [AppEventCode.FORBIDDEN, alerts?.forbiddenAlert],
    [AppEventCode.NOT_FOUND, alerts?.notFoundAlert],
    [AppEventCode.ERR_211_SERVER_OUTAGE, alerts?.serverOutageAlert],
    [AppEventCode.ERR_212_RETRY_LATER, alerts?.retryLaterAlert],
    [AppEventCode.ERR_213_FAILED_CREATING_CLIENT_REGISTRATION, alerts?.creatingClientRegistrationFailedAlert],
    [AppEventCode.ERR_299_KEYS_OUT_OF_SYNC, alerts?.keysOutOfSyncAlert],
    [AppEventCode.ERR_300_EMPTY_RESPONSE, alerts?.emptyResponseAlert],
  ])
}

// Global alert map for all predefined app event codes that can be handled by the global alert policy
export const getGlobalAlertMap = (alerts: AppAlerts) => {
  const httpAlertMap = _getHTTPAlertMap(alerts)
  const iasAlertMap = _getIasErrorAlertMap(alerts)

  return new Map([...httpAlertMap, ...iasAlertMap])
}

// ----------------------------------------
// Error Handling Policies
// https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574122/Mobile+App+Alerts#MobileAppAlerts-Alertswithouterrorcodes
// ----------------------------------------

// IAS errors 201–300 — server configuration, registration, terms of use, provider, JSON, network, auth, etc.
export const iasErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return _getIasErrorAlertMap().has(error.appEvent)
  },
  handle: (error, context) => {
    const alert = _getIasErrorAlertMap(context.alerts).get(error.appEvent)

    if (!alert) {
      context.logger.warn(`[IasErrorPolicy] No alert defined for app event: ${error.appEvent}`)
      return
    }

    alert(error)
  },
}

// Error policy for INVALID_CLIENT_METADATA — handles client metadata fetch failures with special case for unsupported OS versions
export const invalidClientMetadataErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return error.appEvent === AppEventCode.INVALID_CLIENT_METADATA
  },
  handle: (error, context) => {
    // Unsupported-OS rejection (issue #4091): show the basic alert (no "Report a Problem"), matching V3.
    if (error.technicalMessage?.toLowerCase().includes(UNSUPPORTED_OS_TECHNICAL_MESSAGE)) {
      return context.alerts.unsupportedOsAlert()
    }

    context.alerts.invalidClientMetadataAlert(error)
  },
}

// Global alert policy for predefined app event codes
export const globalAlertErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return _getHTTPAlertMap().has(error.appEvent)
  },
  handle: (error, context) => {
    const alert = _getHTTPAlertMap(context.alerts).get(error.appEvent)

    if (!alert) {
      context.logger.warn(`[GlobalAlertErrorPolicy] No alert defined for app event: ${error.appEvent}`)
      return
    }

    alert(error)
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

// Error policy for video session endpoint failures (e.g. 503 service unavailable).
// Suppresses the global error popup so the video call screen can show its own error UI.
export const videoSessionErrorPolicy: ErrorHandlingPolicy = {
  matches: (_, context) => {
    return (
      (context.statusCode === 500 || context.statusCode === 503) &&
      context.endpoint.includes(context.apiEndpoints.video)
    )
  },
  handle: (_error, context) => {
    context.logger.info('[VideoSessionErrorPolicy] Suppressing global alert — video call screen will handle this error')
  },
}

// Error policy for attestation status polling — 404 is expected while the attestation
// has not yet been created by another device's verifyAttestation call.
// 400 is expected when the JTI has already been consumed but the polling happens
// additional times before the 2xx response is processed
export const attestationPollingErrorPolicy: ErrorHandlingPolicy = {
  matches: (_, context) => {
    return (
      (context.statusCode === 404 || context.statusCode === 400) &&
      context.endpoint.includes(context.apiEndpoints.attestation)
    )
  },
  handle: (_error, context) => {
    context.logger.info(
      '[AttestationPollingErrorPolicy] 400 or 404 expected during polling — attestation not yet consumed or already consumed'
    )
  },
}

// Error policy for email verification code submission — 404 indicates a wrong or
// expired code, which is a user-input error. Suppress the global modal so the
// EmailConfirmationScreen can show its own inline error instead of the misleading
// "App not installed correctly (error 209)" alert.
//
// Matches by path pattern (PUT /v1/emails/{id}) rather than the full evidence base URL,
// because the discovery-provided evidence_endpoint can differ from the fallback (trailing
// slash, version suffix, etc.) and we don't want this match to silently break.
const EMAIL_VERIFICATION_PATH_PATTERN = /\/v1\/emails\/[^/?#]+/
export const emailVerificationCodeErrorPolicy: ErrorHandlingPolicy = {
  matches: (_, context) => {
    return context.statusCode === 404 && EMAIL_VERIFICATION_PATH_PATTERN.test(context.endpoint)
  },
  handle: (_error, context) => {
    context.logger.info(
      '[EmailVerificationCodeErrorPolicy] Suppressing global alert — confirmation screen will show inline error for invalid code'
    )
  },
}

// Error policy for pairing code submission — 404 indicates a wrong or
// expired code, which is a user-input error. Suppress the global modal so the
// ManualPairing screen can show its own alert error instead of the misleading
// "App not installed correctly (error 209)" alert.
const PAIRING_CODE_PATH_PATTERN = /\/v3\/mobile\/assertion/
export const pairingCodeErrorPolicy: ErrorHandlingPolicy = {
  matches: (_, context) => {
    return context.statusCode === 404 && PAIRING_CODE_PATH_PATTERN.test(context.endpoint)
  },
  handle: (_error, context) => {
    context.logger.info(
      '[PairingCodeErrorPolicy] Suppressing global alert — manual pairing screen will show inline error and alert for invalid pairing code'
    )
  },
}

// Error policy for unexpected server errors (http status: 500, 503)
export const unexpectedServerErrorPolicy: ErrorHandlingPolicy = {
  matches: (_, context) => {
    return context.statusCode === 500 || context.statusCode === 503
  },
  handle: (error, context) => {
    context.alerts.serverErrorAlert(error)
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
    context.logger.info('[AlreadyRegisteredErrorPolicy] Device already registered, navigating to current setup step')
    context.navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [context.getResumeRoute()],
      })
    )
  },
}

// Error policy for device authorization endpoint (too many birthdate + serial attempts)
// Handles 503 errors from deviceAuthorization endpoint, with or without retry-after header
export const birthdateLockoutErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return error.cause.response?.status === 503 && context.endpoint.includes(context.apiEndpoints.deviceAuthorization)
  },
  handle: (error, context) => {
    context.logger.info(`[BirthdateLockoutErrorPolicy] Lockout with error:`, { error })
    context.navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [context.getResumeRoute(), { name: BCSCScreens.BirthdateLockout }],
      })
    )
  },
}

// Error policy for unsupported-OS rejection on the pairing-code login (assertion) endpoint (issue #4091).
// Mirrors V3: the assertion 401 carries the marker in the response body's `errorMessage` field, which the
// V4 error pipeline does not surface into `technicalMessage` — so match it from the raw body. Show the basic
// unsupported-OS alert (no "Report a Problem") instead of the generic "Something went wrong" modal. Genuine
// auth failures carry no such marker and fall through to the normal unauthorized path.
export const unsupportedOsOnAssertionErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    const responseData = error.cause.response?.data as { errorMessage?: unknown } | undefined
    const errorMessage = responseData?.errorMessage
    return (
      error.appEvent === AppEventCode.ERR_210_UNAUTHORIZED &&
      context.endpoint === `${context.apiEndpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}` &&
      typeof errorMessage === 'string' &&
      errorMessage.toLowerCase().includes(ASSERTION_UNSUPPORTED_OS_MARKER)
    )
  },
  handle: (_error, context) => {
    context.logger.info('[UnsupportedOsOnAssertionErrorPolicy] OS-unsupported 401 on assertion — showing basic alert')
    context.alerts.unsupportedOsAlert()
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

    alert(error)
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
  handle: (error, context) => {
    context.alerts.alreadyVerifiedAlert(error)
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
          context.getResumeRoute(),
          {
            name: BCSCScreens.VerificationCardError,
            params: { errorType: VerificationCardError.CardExpired },
          },
        ],
      })
    )
  },
}

/**
 * Error policy for an expired identity document detected during the Non-BCSC barcode check.
 *
 * `POST /device/barcodes` (see `authorizeDeviceWithBarcodes`) is queried to check whether a
 * scanned card is a real BC Services Card; a non-match normally 404s and the caller falls
 * through to evidence capture. A 400 with an `error_description` mentioning "expired" is a
 * different, legitimate case — the scanned document itself is expired — so route to the
 * CardExpired screen instead of silently treating it as "not a BCSC".
 *
 * @returns ErrorHandlingPolicy
 */
export const cardExpiredOnBarcodesErrorPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    const description = (error.cause.response?.data as { error_description?: unknown } | undefined)?.error_description
    return (
      context.statusCode === 400 &&
      context.endpoint.includes(context.apiEndpoints.barcodes) &&
      typeof description === 'string' &&
      description.toLowerCase().includes('expired')
    )
  },
  handle: (error, context) => {
    const description = (error.cause.response?.data as { error_description?: string }).error_description
    context.logger.info('[DocumentExpiredOnBarcodesErrorPolicy] Document expired per /device/barcodes response', {
      description,
    })
    // Scanned card was a BCSC card and expired
    // display error and navigate back to evidence list so the user isn't stuck
    context.navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: BCSCScreens.IdentitySelection },
          { name: BCSCScreens.EvidenceTypeList, params: { cardProcess: BCSCCardProcess.NonBCSC } },
        ],
      })
    )
    context.alerts.documentExpiredAlert(error)
  },
}

/**
 * Error policy for an expired/superseded verification session on the evidence endpoints.
 *
 * Evidence calls authenticate only with the short-lived `device_code`, so a 401 on the evidence base
 * means that code is expired or has been superseded server-side. Route the user to the verification
 * session expired modal (which resets the app) instead of the generic error modal, whose
 * "re-open the app" advice cannot renew the code. See issue #4050.
 *
 * @returns ErrorHandlingPolicy
 */
export const verificationSessionExpiredErrorPolicy: ErrorHandlingPolicy = {
  matches: (_error, context) => {
    return context.statusCode === 401 && context.endpoint.includes(context.apiEndpoints.evidence)
  },
  handle: (_error, context) => {
    context.logger.info(
      '[VerificationSessionExpiredErrorPolicy] device_code 401 on evidence endpoint, routing to restart'
    )
    context.navigation.dispatch(CommonActions.navigate({ name: BCSCModals.VerificationSessionExpired }))
  },
}

// Error policy for ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE — bad request due to malformed or misconfigured client
export const failedToRetrieveStringResourceErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return error.appEvent === AppEventCode.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE
  },
  handle: (_error, context) => {
    context.alerts.failedToRetrieveStringResourceAlert()
  },
}

// Error policy for ERR_500_INVALID_URL — server-side URL validation failure
export const invalidUrlErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return error.appEvent === AppEventCode.ERR_500_INVALID_URL
  },
  handle: (error, context) => {
    context.alerts.invalidUrlAlert(error)
  },
}

// Fallback error policy for ERR_501_INVALID_REGISTRATION_REQUEST cases not handled by alreadyRegisteredErrorPolicy
export const invalidRegistrationRequestErrorPolicy: ErrorHandlingPolicy = {
  matches: (error) => {
    return error.appEvent === AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST
  },
  handle: (error, context) => {
    context.alerts.invalidRegistrationRequestAlert(error)
  },
}

// ----------------------------------------
// Error Handling Policy Factories
// ----------------------------------------

// Aggregate of all client error handling policies
export const ClientErrorHandlingPolicies: ErrorHandlingPolicy[] = [
  alreadyRegisteredErrorPolicy,
  cardExpiredErrorPolicy,
  cardExpiredOnBarcodesErrorPolicy,
  verificationSessionExpiredErrorPolicy,
  birthdateLockoutErrorPolicy,
  noTokensReturnedErrorPolicy,
  updateRequiredErrorPolicy,
  verifyNotCompletedErrorPolicy,
  unsupportedOsOnAssertionErrorPolicy,
  verifyDeviceAssertionErrorPolicy,
  expiredAppSetupErrorPolicy,
  loginRejectedOnClientMetadataErrorPolicy,
  loginRejectedOnDeviceAuthorizationErrorPolicy,
  alreadyVerifiedErrorPolicy,
  invalidTokenReturnedPolicy,
  failedToRetrieveStringResourceErrorPolicy,
  invalidUrlErrorPolicy,
  invalidRegistrationRequestErrorPolicy,
  videoSessionErrorPolicy,
  attestationPollingErrorPolicy,
  emailVerificationCodeErrorPolicy,
  pairingCodeErrorPolicy,
  invalidClientMetadataErrorPolicy,
  iasErrorPolicy,
  // Specific polices listed above, followed by global policies
  globalAlertErrorPolicy,
  unexpectedServerErrorPolicy,
]
