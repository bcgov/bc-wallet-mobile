import { getGlobalAlertMap } from '@/bcsc-theme/api/clientErrorPolicies'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import {
  AuthorizeDeviceUnknownBCSCConfig,
  DeviceAuthorizationResponse,
} from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { DeviceAuthorizationError } from '@/bcsc-theme/features/verify/deviceAuthorizationError'
import { VerificationCardError } from '@/bcsc-theme/features/verify/verificationCardError'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isAppError, isHandledAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo } from 'react'
import type { BarcodePayload } from 'react-native-bcsc-core'

// Codes routed to the existing VerificationCardErrorScreen — each has a bespoke layout
// (MismatchedSerial shows the scanned serial/birthdate; both predate this service).
const VERIFICATION_CARD_ERROR_MAP: Partial<Record<AppEventCode, VerificationCardError>> = {
  [AppEventCode.CARD_EXPIRED]: VerificationCardError.CardExpired,
  [AppEventCode.CARD_NOT_FOUND]: VerificationCardError.MismatchedSerial,
}

// Codes routed to the generic title/description/link-out-button DeviceAuthorizationErrorScreen.
const DEVICE_AUTHORIZATION_ERROR_MAP: Partial<Record<AppEventCode, DeviceAuthorizationError>> = {
  [AppEventCode.INVALID_PARAMETER]: DeviceAuthorizationError.InvalidParameter,
  [AppEventCode.CARD_INACTIVE]: DeviceAuthorizationError.CardInactive,
  [AppEventCode.CARD_REPLACED]: DeviceAuthorizationError.CardReplaced,
  [AppEventCode.CARD_CANCELLED]: DeviceAuthorizationError.CardCancelled,
  [AppEventCode.CARD_RENEWED]: DeviceAuthorizationError.CardRenewed,
  [AppEventCode.NON_PHOTO_CARD]: DeviceAuthorizationError.NonPhotoCard,
  [AppEventCode.CARD_PROBLEM]: DeviceAuthorizationError.CardProblem,
  [AppEventCode.ADDITIONAL_CARD]: DeviceAuthorizationError.AdditionalCard,
  // Per IAS, only returned for the non-BCSC (authorizeDeviceWithUnknownBCSC) flow.
  [AppEventCode.UNDER_MINIMUM_AGE]: DeviceAuthorizationError.UnderMinimumAge,
  [AppEventCode.TOO_MANY_MOBILE_CARDS]: DeviceAuthorizationError.TooManyMobileCards,
}

export interface AuthorizationServiceCallOptions {
  /**
   * Skip this service's error handling (navigation/alert) entirely and rethrow the raw error
   * untouched — for callers that already own error handling for this call. Barcode scanning is
   * the current example: an unmatched card is an expected "not a BCSC, continue as evidence"
   * outcome there, not a failure this service should surface.
   */
  skipErrorHandling?: boolean
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
   * Matches a device authorization error's appEvent to a card-status error screen and navigates
   * to it. Falls back to a global alert for anything not in the card-status map.
   *
   * @param error - The error thrown by a device authorization api call.
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

      const cardErrorType = VERIFICATION_CARD_ERROR_MAP[error.appEvent]
      if (cardErrorType) {
        navigation.navigate(BCSCScreens.VerificationCardError, { errorType: cardErrorType })
        return
      }

      const deviceAuthErrorType = DEVICE_AUTHORIZATION_ERROR_MAP[error.appEvent]
      if (deviceAuthErrorType) {
        navigation.navigate(BCSCScreens.DeviceAuthorizationError, { errorType: deviceAuthErrorType })
        return
      }

      emitAuthorizationAlert(error)
    },
    [navigation, emitAuthorizationAlert]
  )

  /**
   * Authorizes a device with a known BCSC card, handling card-status errors.
   *
   * @param serial - BCSC serial number
   * @param birthdate - User's birth date
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
      ...authorizationApi, // Spread the base API to include all its methods
      authorizeDevice,
      authorizeDeviceWithUnknownBCSC,
      authorizeDeviceWithBarcodes,
    }),
    [authorizationApi, authorizeDevice, authorizeDeviceWithUnknownBCSC, authorizeDeviceWithBarcodes]
  )
}
