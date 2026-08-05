import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback } from 'react'

/** ViewModel for CancelledReview: clears verification artifacts and re-enters the verify flow. */
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
  // Not named for a screen: VerifyStack picks the landing step via getResumeStepRoute
  // (IdentitySelection after a full reset).
  const resumeVerification = () => continueVerificationProcess()
  return {
    cleanUpVerificationData,
    resumeVerification,
  }
}

export default useCancelledReviewViewModel
