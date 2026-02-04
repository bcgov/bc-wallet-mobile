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
  const { updateAccountFlags } = useSecureActions()
  const cleanUpVerificationData = useCallback(() => {
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    updateAccountFlags({ userSubmittedVerificationVideo: false })
  }, [dispatch, updateAccountFlags])
  return {
    cleanUpVerificationData,
  }
}

export default useCancelledReviewViewModel
