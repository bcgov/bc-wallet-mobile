import { getGlobalAlertMap } from '@/bcsc-theme/api/clientErrorPolicies'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { isAppError, isAxiosAppError } from '@/errors/appError'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'

/**
 * Service layer hook for evidence api.
 * Business logic related to Evidence API calls and UI event handling should be implemented here.
 *
 * @returns Evidence service
 */
export const useEvidenceService = () => {
  const { evidence: evidenceApi } = useApi()
  const { updateVerificationRequest } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

  /**
   * Emits an alert for Evidence-related errors based on the appEvent code.
   *
   * @param error - The error object to evaluate for alert emission.
   * @returns void
   */
  const emitEvidenceAlert = useCallback(
    (error: unknown) => {
      if (!isAppError(error)) {
        return
      }

      const globalAlertMap = getGlobalAlertMap(alerts)
      const alertHandler = globalAlertMap.get(error.appEvent)

      if (alertHandler) {
        // If the error matches a known global alert, show that specific alert
        alertHandler(error)
      }
    },
    [alerts]
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
        await updateVerificationRequest(null, null)

        return data
      } catch (error) {
        if (isAxiosAppError(error, 404)) {
          // If the verification request is not found, it means it has already been deleted or does not exist.
          logger.info(
            `[useEvidenceService] Verification request not found for ID: ${verificationId}. Expected resource already deleted.`
          )

          await updateVerificationRequest(null, null)
          // Don't throw an error since the resource is already deleted, just return
          return
        }

        // For other errors, emit an alert and rethrow the error
        emitEvidenceAlert(error)
        throw error
      }
    },
    [emitEvidenceAlert, evidenceApi, logger, updateVerificationRequest]
  )

  return useMemo(
    () => ({
      ...evidenceApi, // Spread the base API to include all its methods
      cancelVerificationRequest,
    }),
    [cancelVerificationRequest, evidenceApi]
  )
}
