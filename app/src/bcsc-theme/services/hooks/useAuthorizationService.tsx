import { getGlobalAlertMap } from '@/bcsc-theme/api/clientErrorPolicies'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import {
  AuthorizeDeviceUnknownBCSCConfig,
  DeviceAuthorizationResponse,
} from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { DeviceAuthorizationError } from '@/bcsc-theme/features/verify/deviceAuthorizationError'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isAppError, isHandledAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo } from 'react'
import type { BarcodePayload } from 'react-native-bcsc-core'

// Codes routed to the generic title/description/link-out-button DeviceAuthorizationErrorScreen.
const DEVICE_AUTHORIZATION_ERROR_MAP: Partial<Record<AppEventCode, DeviceAuthorizationError>> = {
  [AppEventCode.INVALID_PARAMETER]: DeviceAuthorizationError.InvalidParameter,
  [AppEventCode.CARD_INACTIVE]: DeviceAuthorizationError.CardInactive,
  [AppEventCode.CARD_REPLACED]: DeviceAuthorizationError.CardReplaced,
  [AppEventCode.CARD_CANCELLED]: DeviceAuthorizationError.CardCancelled,
  [AppEventCode.CARD_RENEWED]: DeviceAuthorizationError.CardRenewed,
  [AppEventCode.CARD_PROBLEM]: DeviceAuthorizationError.CardProblem,
  [AppEventCode.ADDITIONAL_CARD]: DeviceAuthorizationError.AdditionalCard,
  [AppEventCode.CARD_EXPIRED]: DeviceAuthorizationError.CardExpired,
  [AppEventCode.CARD_NOT_FOUND]: DeviceAuthorizationError.MismatchedSerial,
  // Per IAS, only returned for the non-BCSC (authorizeDeviceWithUnknownBCSC) flow.
  [AppEventCode.UNDER_MINIMUM_AGE]: DeviceAuthorizationError.UnderMinimumAge,
  [AppEventCode.TOO_MANY_MOBILE_CARDS]: DeviceAuthorizationError.TooManyMobileCards,
}

export interface AuthorizationServiceCallOptions {
  /**
   * Skip this service's error handling and rethrow the error
   * Barcode scanning is an example of a flow that will handle errors on it's own
   */
  skipErrorHandling?: boolean
}

/**
 * A helper function to search for a technical message in a given map of app event codes
 *
 * returns the value of the matched message or undefined
 */
const findByTechnicalMessage = <T,>(
  technicalMessage: string | null,
  map: Partial<Record<AppEventCode, T>>
): T | undefined => {
  if (!technicalMessage) {
    return undefined
  }

  const matchedEvent = (Object.keys(map) as AppEventCode[]).find((appEvent) => technicalMessage.includes(appEvent))
  return matchedEvent ? map[matchedEvent] : undefined
}

/**
 * Service layer hook for the device authorization (device/code) api.
 * Business logic related to device authorization errors and error-screen navigation should be
 * implemented here.
 *
 * @returns Authorization service
 */
export const useAuthorizationService = () => {
  const { authorization: authorizationApi } = useApi()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const alerts = useAlerts(navigation)

  /**
   * Emits a global alert for the error's appEvent, if one is registered.
   *
   * @param error - The error object to evaluate for alert emission.
   */
  const emitAuthorizationAlert = useCallback(
    (error: unknown) => {
      if (!isAppError(error)) {
        return
      }

      const globalAlertMap = getGlobalAlertMap(alerts)
      const alertHandler = globalAlertMap.get(error.appEvent)

      if (alertHandler) {
        alertHandler(error)
      }
    },
    [alerts]
  )

  /**
   * Matches a device authorization error and navigates to appropriate error screen
   * Anything not matched will emit a global alert
   *
   * @param error - The error thrown by a device authorization api call.
   * @param extraCardErrorMap - Additional VerificationCardError routing specific to the calling method.
   */
  const handleAuthorizationError = useCallback(
    (error: unknown) => {
      if (isHandledAppError(error)) {
        // Already handled by a global client error policy (e.g. invalid_registration_request).
        return
      }

      if (!isAppError(error)) {
        return
      }

      const cardErrorMap = {
        [AppEventCode.CARD_NOT_FOUND]: DeviceAuthorizationError.MismatchedSerial,
        [AppEventCode.INVALID_PARAMETER]: DeviceAuthorizationError.InvalidParameter,
      }
      const cardErrorType = findByTechnicalMessage(error.technicalMessage, cardErrorMap)
      if (cardErrorType) {
        navigation.navigate(BCSCScreens.VerificationCardError, { errorType: cardErrorType })
        error.handled = true
        return
      }

      const deviceAuthErrorType = findByTechnicalMessage(error.technicalMessage, DEVICE_AUTHORIZATION_ERROR_MAP)
      if (deviceAuthErrorType) {
        // Mark error as handled to prevent global alert
        error.handled = true

        // These two errors are handled by VerificationCardErrorScreen
        if (
          deviceAuthErrorType === DeviceAuthorizationError.MismatchedSerial ||
          deviceAuthErrorType === DeviceAuthorizationError.InvalidParameter
        ) {
          navigation.navigate(BCSCScreens.VerificationCardError, { errorType: deviceAuthErrorType })
          return
        }

        navigation.navigate(BCSCScreens.DeviceAuthorizationError, { errorType: deviceAuthErrorType })
        return
      }
      emitAuthorizationAlert(error)
    },
    [navigation, emitAuthorizationAlert]
  )

  /**
   * Authorizes a device with a known BCSC card
   *
   * @param serial - BCSC serial number
   * @param birthdate - Birth date
   * @param options - Set `skipErrorHandling` to rethrow errors untouched instead of navigating/alerting
   */
  const authorizeDevice = useCallback(
    async (
      serial?: string,
      birthdate?: Date,
      options?: AuthorizationServiceCallOptions
    ): Promise<DeviceAuthorizationResponse> => {
      try {
        return await authorizationApi.authorizeDevice(serial, birthdate)
      } catch (error) {
        if (options?.skipErrorHandling) {
          throw error
        }
        handleAuthorizationError(error)
        throw error
      }
    },
    [authorizationApi, handleAuthorizationError]
  )

  /**
   * Authorizes a device with an unknown BCSC card, handling card-status errors.
   *
   * @param config - User information and address for the unknown-card registration
   * @param options - Set `skipErrorHandling` to rethrow errors untouched instead of navigating/alerting
   */
  const authorizeDeviceWithUnknownBCSC = useCallback(
    async (
      config: AuthorizeDeviceUnknownBCSCConfig,
      options?: AuthorizationServiceCallOptions
    ): Promise<DeviceAuthorizationResponse> => {
      try {
        return await authorizationApi.authorizeDeviceWithUnknownBCSC(config)
      } catch (error) {
        if (options?.skipErrorHandling) {
          throw error
        }
        handleAuthorizationError(error)
        throw error
      }
    },
    [authorizationApi, handleAuthorizationError]
  )

  /**
   * Authorizes a device from scanned card barcodes, handling card-status errors.
   *
   * @param barcodes - Decoded barcodes from the scanned card
   * @param options - Set `skipErrorHandling` to rethrow errors untouched instead of navigating/alerting
   *   — the barcode-scan flow treats a non-match as "not a BCSC, continue" rather than a failure.
   */
  const authorizeDeviceWithBarcodes = useCallback(
    async (
      barcodes: BarcodePayload[],
      options?: AuthorizationServiceCallOptions
    ): Promise<DeviceAuthorizationResponse> => {
      try {
        return await authorizationApi.authorizeDeviceWithBarcodes(barcodes)
      } catch (error) {
        if (options?.skipErrorHandling) {
          throw error
        }
        handleAuthorizationError(error)
        throw error
      }
    },
    [authorizationApi, handleAuthorizationError]
  )

  return useMemo(
    () => ({
      ...authorizationApi,
      authorizeDevice,
      authorizeDeviceWithUnknownBCSC,
      authorizeDeviceWithBarcodes,
    }),
    [authorizationApi, authorizeDevice, authorizeDeviceWithUnknownBCSC, authorizeDeviceWithBarcodes]
  )
}
