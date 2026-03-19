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
  const { updateAccountFlags, updateVerificationRequest } = useSecureActions()
  const cleanUpVerificationData = useCallback(() => {
    updateVerificationRequest(null, null)
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
    updateAccountFlags({ userSubmittedVerificationVideo: false })
  }, [dispatch, updateAccountFlags, updateVerificationRequest])
  return {
    cleanUpVerificationData,
  }
}

export default useCancelledReviewViewModel
