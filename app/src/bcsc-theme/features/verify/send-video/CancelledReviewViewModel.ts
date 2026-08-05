import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback } from 'react'

/**
 * ViewModel hook for the CancelledReview component that provides
 * the method to clean up verification related data from storage
 */
const useCancelledReviewViewModel = () => {
  const [, dispatch] = useStore<BCState>()
  const { updateAccountFlags, updateVerificationRequest, continueVerificationProcess } = useSecureActions()
  const cleanUpVerificationData = useCallback(() => {
    updateVerificationRequest(null, null)
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
    dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: [undefined] })
    dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
    dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [undefined] })
    updateAccountFlags({ userSubmittedVerificationVideo: false })
  }, [dispatch, updateAccountFlags, updateVerificationRequest])
  // Deliberately not named for a screen: this flips verification back to in-progress and lets
  // VerifyStack pick the landing step via getResumeStepRoute, which resolves to IdentitySelection
  // after a full reset and moves whenever the resume rules do.
  const resumeVerification = () => continueVerificationProcess()
  return {
    cleanUpVerificationData,
    resumeVerification,
  }
}

export default useCancelledReviewViewModel
