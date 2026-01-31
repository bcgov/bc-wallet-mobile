import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'

const useCancelledReviewViewModel = () => {
  const [, dispatch] = useStore<BCState>()
  const { updateAccountFlags } = useSecureActions()
  const cleanUpVerificationData = () => {
    dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_USER_SUBMITTED_VERIFICATION_VIDEO,
      payload: [false],
    })
    updateAccountFlags({ userSubmittedVerificationVideo: false })
  }
  return {
    cleanUpVerificationData,
  }
}

export default useCancelledReviewViewModel
