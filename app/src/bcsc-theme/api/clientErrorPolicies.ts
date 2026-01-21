import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { AppError, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AlertAction } from '@/utils/alert'
import { getBCSCAppStoreUrl } from '@/utils/links'
import { BifoldLogger } from '@bifold/core'
import { NavigationProp, ParamListBase } from '@react-navigation/native'
import { TFunction } from 'react-i18next'
import { Linking } from 'react-native'
import { BCSCScreens } from '../types/navigators'
import { BCSCEndpoints } from './client'
/**
 * TODO (MD): Remove this comment
 *  11. Forget all pairings:
 *  12. Unexpected server error (all endpoints): done
 *  13. Internal server error 500 (verify device): done
 *  14. Too many attempts (all endpoints): done
 *  15. Expired app setup (OIDC token endpoint):
 *  16. Verify incomplete (OIDC token endpoint):
 *    - Not sure when this should happen...
 *  17. URI cant be parsed (verify device):
 *
 *
 */

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
 * Set of event codes for verify device assertation endpoint
 */
const VERIFY_DEVICE_ASSERTATION_EVENT_CODES = new Set([
  AppEventCode.LOGIN_SERVER_ERROR,
  AppEventCode.LOGIN_PARSE_URI,
  AppEventCode.INVALID_PAIRING_CODE,
  AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
])

export type ErrorMatcherContext = {
  endpoint: string // current route name for context
  statusCode: number // HTTP status code for context
  apiEndpoints: BCSCEndpoints // current API endpoints for context
}

type ErrorHandlerContext = {
  translate: TFunction
  emitErrorAlert: (error: AppError, options?: { actions?: AlertAction[] }) => void
  navigation: NavigationProp<ParamListBase>
  linking: typeof Linking
  logger: BifoldLogger
}

type ErrorHandlingPolicy = {
  matches: (error: AppError, context: ErrorMatcherContext) => boolean
  handle: (error: AppError, context: ErrorHandlerContext) => void | Promise<void>
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

// Error policy for unexpected server errors (http status: 500, 503)
export const unexpectedServerErrorPolicy: ErrorHandlingPolicy = {
  matches: (_, context) => {
    return context.statusCode === 500 || context.statusCode === 503
  },
  handle: (error, context) => {
    // If the error is already a server error, emit it directly
    if (error.appEvent === AppEventCode.UNEXPECTED_SERVER_ERROR) {
      context.emitErrorAlert(error)
      return
    }

    // Otherwise, create a generic server error, wrap the original error as the cause, and emit that
    const appError = AppError.fromErrorDefinition(ErrorRegistry.UNEXPECTED_SERVER_ERROR, { cause: error })
    context.emitErrorAlert(appError)
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

// Error policy for verify device assertation endpoint errors
export const verifyDeviceAssertationPolicy: ErrorHandlingPolicy = {
  matches: (error, context) => {
    return (
      VERIFY_DEVICE_ASSERTATION_EVENT_CODES.has(error.appEvent) &&
      context.endpoint === `${context.apiEndpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`
    )
  },
  handle: (error, context) => {
    context.emitErrorAlert(error)
  },
}

// ----------------------------------------
// Error Handling Policy Factories
// ----------------------------------------

/**
 * Error policy for expired app setup during token exchange
 *
 * @param resetApplication - Function to reset the application state to "Setup Steps"
 * @returns ErrorHandlingPolicy
 */
export const createExpiredAppSetupErrorPolicy = (resetApplication: () => Promise<void>): ErrorHandlingPolicy => {
  return {
    matches: (error, context) => {
      return (
        error.appEvent === AppEventCode.USER_INPUT_EXPIRED_VERIFY_REQUEST &&
        context.endpoint === context.apiEndpoints.token
      )
    },
    handle: async (_, context) => {
      try {
        await resetApplication()
      } catch (error) {
        context.logger.error('[ExpiredAppSetupErrorPolicy] Failed resetting application', error as Error)
      }
    },
  }
}

// Aggregate of all client error handling policies
export const ClientErrorHandlingPolicies: ErrorHandlingPolicy[] = [
  globalAlertErrorPolicy,
  unexpectedServerErrorPolicy,
  noTokensReturnedErrorPolicy,
  updateRequiredErrorPolicy,
  verifyDeviceAssertationPolicy,
]
