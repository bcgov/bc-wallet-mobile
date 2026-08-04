import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback } from 'react'

const useCancelledReviewViewModel = () => {
  const [, dispatch] = useStore<BCState>()
  const { updateAccountFlags, updateVerificationRequest } = useSecureActions()
  const cleanUpVerificationData = useCallback(() => {
    updateVerificationRequest(null, null)
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
    dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: [undefined] })
    dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
    dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [undefined] })
    updateAccountFlags({ userSubmittedVerificationVideo: false })
  }, [dispatch, updateAccountFlags, updateVerificationRequest])
  return {
    cleanUpVerificationData,
  }
}

export default useCancelledReviewViewModel
