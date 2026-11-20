import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useVerificationState } from '@/bcsc-theme/state/verification/useVerificationState'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'

/** ViewModel for CancelledReview: clears verification artifacts and re-enters the verify flow. */
const useCancelledReviewViewModel = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const { isVerificationInProgress } = useVerificationState()
  const { updateAccountFlags, updateVerificationRequest, continueVerificationProcess } = useSecureActions()
  const cleanUpVerificationData = useCallback(async () => {
    await updateVerificationRequest(undefined, null)
    getBCSCState().session.update({
      photoPath: undefined,
      photoMetadata: undefined,
      videoPath: undefined,
      videoDuration: undefined,
      videoThumbnailPath: undefined,
    })
    getBCSCState().session.update({
      prompts: undefined,
      verificationRequestStatus: undefined,
      verificationRequestStatusMessage: undefined,
      verificationVideoSubmittedAt: undefined,
    })
    // TODO (bm): should be awaited
    void updateAccountFlags({ userSubmittedVerificationVideo: false })
  }, [updateAccountFlags, updateVerificationRequest])
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
