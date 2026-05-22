import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ServiceHours, VideoDestinations } from '@/bcsc-theme/api/hooks/useVideoCallApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { formatServiceAndUnavailableHours, isLiveCallAvailable } from '@/bcsc-theme/utils/service-hours-formatter'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { getLiveCallVideoQueue } from '../live-call/utils/videoDestinations'
import { VerificationVideoCache } from '../send-video/VideoReviewScreen'

type useVerificationMethodModelProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const useVerificationMethodModel = ({ navigation }: useVerificationMethodModelProps) => {
  const [store, dispatch] = useStore<BCState>()
  const [sendVideoLoading, setSendVideoLoading] = useState(false)
  const [liveCallLoading, setLiveCallLoading] = useState(false)
  const [hoursLoading, setHoursLoading] = useState(true)
  const [serviceHours, setServiceHours] = useState<ServiceHours | undefined>()
  const [destinations, setDestinations] = useState<VideoDestinations | undefined>()
  const { evidence, video: videoCallApi } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateVerificationRequest } = useSecureActions()

  useEffect(() => {
    Promise.all([videoCallApi.getVideoDestinations(), videoCallApi.getServiceHours()])
      .then(([destinations, serviceHours]) => {
        setDestinations(destinations)
        setServiceHours(serviceHours)
      })
      .catch((error) => {
        logger.error('Error loading verification method service hours:', error as Error)
        setDestinations(undefined)
        setServiceHours(undefined)
      })
      .finally(() => setHoursLoading(false))
  }, [logger, videoCallApi])

  const handlePressSendVideo = useCallback(async () => {
    try {
      setSendVideoLoading(true)

      let verificationRequest
      if (!store.bcscSecure.verificationRequestId) {
        // NOTE: Making this request too many times will be rate limited by the server.
        verificationRequest = await evidence.createVerificationRequest()
      }

      if (store.bcscSecure.verificationRequestId && !store.bcsc.prompts) {
        // NOTE: Making this request too many times will be rate limited by the server.
        verificationRequest = await evidence.getVerificationRequestPrompts(store.bcscSecure.verificationRequestId)
      }

      if (verificationRequest) {
        updateVerificationRequest(verificationRequest.id, verificationRequest.sha256)
        dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [verificationRequest.prompts] })
      }

      await Promise.allSettled([
        removeFileSafely(store.bcsc.videoPath, logger),
        removeFileSafely(store.bcsc.photoPath, logger),
        removeFileSafely(store.bcsc.videoThumbnailPath, logger),
      ])

      VerificationVideoCache.clearCache()

      dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })

      navigation.navigate(BCSCScreens.PhotoInstructions, { forLiveCall: false })
    } catch (error) {
      logger.error('Error sending video:', error as Error)
      return
    } finally {
      setSendVideoLoading(false)
    }
  }, [
    store.bcscSecure.verificationRequestId,
    store.bcsc.prompts,
    store.bcsc.videoPath,
    store.bcsc.photoPath,
    store.bcsc.videoThumbnailPath,
    logger,
    dispatch,
    navigation,
    evidence,
    updateVerificationRequest,
  ])

  const handlePressLiveCall = useCallback(async () => {
    try {
      setLiveCallLoading(true)

      const [resolvedDestinations, resolvedServiceHours] =
        destinations && serviceHours
          ? [destinations, serviceHours]
          : await Promise.all([videoCallApi.getVideoDestinations(), videoCallApi.getServiceHours()])

      const formattedHours = formatServiceAndUnavailableHours(resolvedServiceHours)
      const liveCallVideoQueue = getLiveCallVideoQueue(store.developer.environment, resolvedDestinations)

      if (!liveCallVideoQueue) {
        navigation.navigate(BCSCScreens.CallBusyOrClosed, {
          busy: true,
          formattedHours,
        })
        return
      }

      if (!isLiveCallAvailable(resolvedServiceHours)) {
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
  }, [store.developer.environment, navigation, logger, destinations, serviceHours, videoCallApi])

  return {
    handlePressSendVideo,
    handlePressLiveCall,
    sendVideoLoading,
    liveCallLoading,
    hoursLoading,
    verificationOptions: store.bcscSecure.verificationOptions ?? [],
    formattedHours: serviceHours ? formatServiceAndUnavailableHours(serviceHours) : undefined,
  }
}

export default useVerificationMethodModel
