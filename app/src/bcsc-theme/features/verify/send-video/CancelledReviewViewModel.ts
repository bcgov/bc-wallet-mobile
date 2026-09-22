import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'

/** ViewModel for CancelledReview: clears verification artifacts and re-enters the verify flow. */
const useCancelledReviewViewModel = () => {
  const [, dispatch] = useStore<BCState>()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const { isVerificationInProgress } = useVerificationStatus()
  const { updateAccountFlags, updateVerificationRequest, continueVerificationProcess } = useSecureActions()
  const cleanUpVerificationData = useCallback(async () => {
    await updateVerificationRequest(undefined, null)
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

  /**
   * Keeps the user's ID, address and email — only the selfie photo and video are redone. Both routes
   * land on Verification Method Selection, which opens the fresh verification request and purges the
   * cached capture files before entering the photo steps.
   */
  const retryWithNewVideo = useCallback(() => {
    if (isVerificationInProgress) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.VerificationMethodSelection }] })
      )
      return
    }

    continueVerificationProcess()
  }, [continueVerificationProcess, isVerificationInProgress, navigation])

  return {
    cleanUpVerificationData,
    resumeVerification,
    retryWithNewVideo,
  }
}

export default useCancelledReviewViewModel
