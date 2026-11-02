import BCSCApiClient from '@/bcsc-theme/api/client'
import useEvidenceApi, {
  SendVerificationPayload,
  VerificationStatusResponseData,
  VerificationSubmitResponseData,
} from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { VerificationRequestStatus } from '@/constants'
import { AppError, isAppError, isAxiosAppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { showErrorAlert, useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions, NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'

/** The statuses this app understands; a read-back naming anything else is not trusted. */
const KNOWN_VERIFICATION_REQUEST_STATUSES: readonly string[] = Object.values(VerificationRequestStatus)

/**
 * Counts a submit the server had already recorded, so the duplicate-submit rate stays visible now that no modal
 * shows for it (#4928): device logs never leave production handsets, analytics do. Tracked like any error, with
 * the original 500's HTTP status and route template only — never the id in the URL, never the body.
 *
 * @param submitError - The 500 the submit came back with.
 * @returns void
 */
const trackAlreadyRecordedSubmit = (submitError: AppError): void => {
  AppError.fromErrorDefinition(ErrorRegistry.EVIDENCE_SUBMIT_ALREADY_RECORDED, {
    cause: submitError.cause,
    context: { http_method: submitError.context.http_method, http_route: submitError.context.http_route },
    track: false,
  }).track()
}

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
   * Handles errors from evidence API calls and emits the appropriate actions.
   * An `AppError` is marked `handled` once surfaced, so a caller that checks the flag shows nothing more.
   *
   * @param error - The error object
   * @returns void
   */
  const handleEvidenceApiError = useCallback(
    (error: unknown): void => {
      try {
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
      } finally {
        if (isAppError(error)) {
          error.handled = true
        }
      }
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
        return await evidenceApi.getVerificationRequestStatus(verificationRequestId)
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
            status: VerificationRequestStatus.CANCELLED,
          }
        }

        // For other errors, handle them using the evidence error handler and rethrow
        handleEvidenceApiError(error)
        throw error
      }
    },
    [evidenceApi, handleEvidenceApiError, logger, updateVerificationRequest]
  )

  /**
   * Reads a verification request back after a failed submit, without alerting or touching the stored
   * request: a 404 or a failed read means the server has no record of the submission, and the original
   * submit error is the one to surface.
   *
   * @param verificationRequestId - The ID of the verification request to read back.
   * @returns Promise resolving to the status data when the server has the request on record, otherwise undefined.
   */
  const findSubmittedVerification = useCallback(
    async (verificationRequestId: string): Promise<VerificationStatusResponseData | undefined> => {
      try {
        const data = await evidenceApi.getVerificationRequestStatus(verificationRequestId)

        if (!KNOWN_VERIFICATION_REQUEST_STATUSES.includes(data?.status)) {
          logger.warn(
            `[useEvidenceService] Read-back of verification request ${verificationRequestId} returned an unrecognised status; surfacing the original submit error`
          )
          return undefined
        }

        return data
      } catch (error) {
        logger.warn(
          `[useEvidenceService] Read-back of verification request ${verificationRequestId} failed; surfacing the original submit error`,
          { error }
        )
        return undefined
      }
    },
    [evidenceApi, logger]
  )

  /**
   * Submits the uploaded evidence for review.
   *
   * IAS answers 500 (a duplicate-row error) when the id was already submitted: by an earlier attempt, or by
   * a PUT that succeeded before the app was killed and could record it (#4673). A request the server has on
   * record is submitted, not failed, so a 500 is followed by a read-back and the status stands in for the
   * submit response. The original error is surfaced only when the server has no record of the submission.
   *
   * Errors are handled here instead of by the global client policies, which the API call opts out of: a 401
   * routes to the session-expired modal and an app-update-required error to its alert, both marked `handled`.
   * A 409 (registration already approved), a dropped connection and non-API errors are rethrown untouched
   * because the upload model owns their recovery and copy.
   *
   * @param verificationRequestId - The ID of the verification request to submit.
   * @param payload - The upload URIs and the sha256 the recording was issued against.
   * @returns Promise resolving to the submit response, or to the read-back status when the request was already on record.
   */
  const sendVerificationRequest = useCallback(
    async (
      verificationRequestId: string,
      payload: SendVerificationPayload
    ): Promise<VerificationSubmitResponseData> => {
      try {
        return await evidenceApi.sendVerificationRequest(verificationRequestId, payload)
      } catch (error) {
        if (isAxiosAppError(error, 409)) {
          throw error
        }

        if (isAxiosAppError(error, 500)) {
          const submitted = await findSubmittedVerification(verificationRequestId)

          if (submitted) {
            logger.info(
              `[useEvidenceService] Submit of verification request ${verificationRequestId} returned 500 but the request is already ${submitted.status}; continuing as submitted`
            )
            trackAlreadyRecordedSubmit(error)
            return submitted
          }
        }

        if (isAppError(error, AppEventCode.NO_INTERNET)) {
          throw error
        }

        if (isAppError(error)) {
          handleEvidenceApiError(error)
        }

        throw error
      }
    },
    [evidenceApi, findSubmittedVerification, handleEvidenceApiError, logger]
  )

  return useMemo(
    () => ({
      ...evidenceApi, // Spread the base API to include all its methods
      cancelVerificationRequest,
      getVerificationRequestStatus,
      sendVerificationRequest,
    }),
    [cancelVerificationRequest, evidenceApi, getVerificationRequestStatus, sendVerificationRequest]
  )
}
