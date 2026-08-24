import BCSCApiClient from '@/bcsc-theme/api/client'
import useEvidenceApi, { VerificationStatusResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { isAppError, isAxiosAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { showErrorAlert, useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions, NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'

/**
 * Service layer hook for evidence api.
 * Business logic related to Evidence API calls and UI event handling should be implemented here.
 *
 * @returns Evidence service
 */
export const useEvidenceService = () => {
  const { client } = useBCSCApiClientState()
  const evidenceApi = useEvidenceApi(client as BCSCApiClient)
  const { updateVerificationRequest } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

  /**
   * Handles errors from evidence API calls and emits the appropriate actions
   *
   * @param error - The error object
   * @returns void
   */
  const handleEvidenceApiError = useCallback(
    (error: unknown): void => {
      if (isAxiosAppError(error, 401)) {
        return navigation.dispatch(
          CommonActions.navigate({
            name: BCSCModals.VerificationSessionExpired,
          })
        )
      }

      if (isAppError(error, AppEventCode.IOS_APP_UPDATE_REQUIRED)) {
        return alerts.appUpdateRequiredAlert()
      }

      if (isAppError(error, AppEventCode.ANDROID_APP_UPDATE_REQUIRED)) {
        return alerts.appUpdateRequiredAlert()
      }

      showErrorAlert(error, alerts)
    },
    [alerts, navigation]
  )

  /**
   * Cancels a verification request by its ID and handles errors appropriately.
   *
   * @param verificationId - The ID of the verification request to cancel.
   * @returns Promise resolving to cancellation response data or void if the request was not found.
   */
  const cancelVerificationRequest = useCallback(
    async (verificationId: string) => {
      try {
        const data = await evidenceApi.cancelVerificationRequest(verificationId)

        // Clear the verification request from secure storage after cancellation
        await updateVerificationRequest(undefined, null)

        return data
      } catch (error) {
        if (isAxiosAppError(error, 404)) {
          // If the verification request is not found, it means it has already been deleted or does not exist.
          logger.info(
            `[useEvidenceService] Verification request not found for ID: ${verificationId}. Expected resource already deleted.`
          )

          await updateVerificationRequest(undefined, null)
          // Don't throw an error since the resource is already deleted, just return
          return
        }

        // For other errors, handle them using the evidence error handler and rethrow
        handleEvidenceApiError(error)
        throw error
      }
    },
    [handleEvidenceApiError, evidenceApi, logger, updateVerificationRequest]
  )

  /**
   * Fetches the status of a verification request by its ID and handles errors appropriately.
   * @param verificationRequestId - The ID of the verification request to check.
   * @returns Promise resolving to the verification status response data.
   */
  const getVerificationRequestStatus = useCallback(
    async (verificationRequestId: string): Promise<VerificationStatusResponseData> => {
      try {
        // TODO (MD): Drop the `skipOnErrorHandler` option once useEvidenceApi.getVerificationRequestStatus applies this by default
        return await evidenceApi.getVerificationRequestStatus(verificationRequestId, { skipOnErrorHandler: true })
      } catch (error) {
        if (isAxiosAppError(error, 404)) {
          // If the verification request is not found, it means it has already been deleted or does not exist.
          logger.info(
            `[useEvidenceService] Verification request not found for ID: ${verificationRequestId}. Expected resource already deleted. Handling as cancelled.`
          )

          await updateVerificationRequest(undefined, null)
          // Return a default response indicating the request is cancelled
          return {
            id: verificationRequestId,
            status: 'cancelled',
          }
        }

        // For other errors, handle them using the evidence error handler and rethrow
        handleEvidenceApiError(error)
        throw error
      }
    },
    [evidenceApi, handleEvidenceApiError, logger, updateVerificationRequest]
  )

  return useMemo(
    () => ({
      ...evidenceApi, // Spread the base API to include all its methods
      cancelVerificationRequest,
      getVerificationRequestStatus,
    }),
    [cancelVerificationRequest, evidenceApi, getVerificationRequestStatus]
  )
}
