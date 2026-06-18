import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { formatServiceAndUnavailableHours, isLiveCallAvailable } from '@/bcsc-theme/utils/service-hours-formatter'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { getLiveCallVideoQueue } from '../live-call/utils/videoDestinations'
import { VerificationVideoCache } from '../send-video/VideoReviewScreen'

type useVerificationMethodModelProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const useVerificationMethodModel = ({ navigation }: useVerificationMethodModelProps) => {
  const [store, dispatch] = useStore<BCState>()
  const [sendVideoLoading, setSendVideoLoading] = useState(false)
  const [liveCallLoading, setLiveCallLoading] = useState(false)
  const { evidence, video: videoCallApi } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateVerificationRequest } = useSecureActions()
  const { videoPromptsMissingAlert } = useAlerts(navigation)

  const handlePressSendVideo = useCallback(async () => {
    try {
      setSendVideoLoading(true)

      let verificationRequest
      if (!store.bcscSecure.verificationRequestId) {
        // NOTE: Making this request too many times will be rate limited by the server.
        verificationRequest = await evidence.createVerificationRequest()
      }

      if (
        store.bcscSecure.verificationRequestId &&
        (!store.bcscSecure.verificationRequestSha || !store.bcsc.prompts?.length)
      ) {
        try {
          verificationRequest = await evidence.getVerificationRequestPrompts(store.bcscSecure.verificationRequestId)
        } catch (error) {
          // IAS returns 500 for any call against a verification id that has been deleted
          // server-side (TTL expired, agent cancelled, etc.). The local id is now useless —
          // start a fresh request so the user isn't stuck on a stale id across cycles.
          logger.warn(
            `[useVerificationMethodModel] Failed to fetch prompts for stored verification id; creating a fresh request: ${error instanceof Error ? error.message : String(error)}`
          )
          verificationRequest = await evidence.createVerificationRequest()
        }
      }

      if (verificationRequest) {
        updateVerificationRequest(verificationRequest.id, verificationRequest.sha256)
        dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [verificationRequest.prompts] })
      }

      // Never advance into the video flow without prompts. The server can return an empty prompt set,
      // and TakeVideoScreen hard-stops when prompts are missing — surface a retryable alert here instead.
      const resolvedPrompts = verificationRequest?.prompts ?? store.bcsc.prompts
      if (!resolvedPrompts?.length) {
        logger.error('[useVerificationMethodModel] No verification prompts available; aborting Send Video')
        videoPromptsMissingAlert()
        return
      }

      await Promise.allSettled([
        removeFileSafely(store.bcsc.videoPath, logger),
        removeFileSafely(store.bcsc.photoPath, logger),
        removeFileSafely(store.bcsc.videoThumbnailPath, logger),
      ])

      VerificationVideoCache.clearCache()

      dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })

      navigation.navigate(BCSCScreens.InformationRequired)
    } catch (error) {
      logger.error('Error sending video:', error as Error)
      return
    } finally {
      setSendVideoLoading(false)
    }
  }, [
    store.bcscSecure.verificationRequestId,
    store.bcscSecure.verificationRequestSha,
    store.bcsc.prompts,
    store.bcsc.videoPath,
    store.bcsc.photoPath,
    store.bcsc.videoThumbnailPath,
    logger,
    dispatch,
    navigation,
    evidence,
    updateVerificationRequest,
    videoPromptsMissingAlert,
  ])

  const handlePressLiveCall = useCallback(async () => {
    try {
      setLiveCallLoading(true)

      const [destinations, serviceHours] = await Promise.all([
        videoCallApi.getVideoDestinations(),
        videoCallApi.getServiceHours(),
      ])

      const formattedHours = formatServiceAndUnavailableHours(serviceHours)
      const liveCallVideoQueue = getLiveCallVideoQueue(store.developer.environment, destinations)

      if (!liveCallVideoQueue) {
        navigation.navigate(BCSCScreens.CallBusyOrClosed, {
          busy: true,
          formattedHours,
        })
        return
      }

      const isWithinServiceHours = isLiveCallAvailable(serviceHours)

      if (!isWithinServiceHours) {
        navigation.navigate(BCSCScreens.CallBusyOrClosed, {
          busy: false,
          formattedHours,
        })
        return
      }

      navigation.navigate(BCSCScreens.BeforeYouCall, { formattedHours })
    } catch (error) {
      logger.error('Error checking service availability:', error as Error)
      navigation.navigate(BCSCScreens.CallBusyOrClosed, {
        busy: false,
        formattedHours: [{ title: 'Unable to retrieve service hours at this time.' }],
      })
    } finally {
      setLiveCallLoading(false)
    }
  }, [videoCallApi, store.developer.environment, navigation, logger])

  return {
    handlePressSendVideo,
    handlePressLiveCall,
    sendVideoLoading,
    liveCallLoading,
    verificationOptions: store.bcscSecure.verificationOptions ?? [],
  }
}

export default useVerificationMethodModel
