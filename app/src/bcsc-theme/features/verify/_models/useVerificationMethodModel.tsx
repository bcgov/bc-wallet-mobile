import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { formatServiceAndUnavailableHours, isLiveCallAvailable } from '@/bcsc-theme/utils/service-hours-formatter'
import { BCDispatchAction, BCState, IASEnvironment } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { VerificationVideoCache } from '../send-video/VideoReviewScreen'

const TEST_HARNESS_QUEUE_DESTINATION_NAME = 'Test Harness Queue Destination'
const PROD_HARNESS_QUEUE_DESTINATION_NAME = 'TODO: MD'

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

      navigation.navigate(BCSCScreens.InformationRequired)
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

      const [destinations, serviceHours] = await Promise.all([
        videoCallApi.getVideoDestinations(),
        videoCallApi.getServiceHours(),
      ])

      const formattedHours = formatServiceAndUnavailableHours(serviceHours)
      // TODO (bm): Look for prod queue(s) depending on environment
      const availableDestination = destinations.find((dest) =>
        store.developer.environment.name === IASEnvironment.PROD.name
          ? dest.destination_name === PROD_HARNESS_QUEUE_DESTINATION_NAME
          : dest.destination_name === TEST_HARNESS_QUEUE_DESTINATION_NAME
      )

      if (!availableDestination) {
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
  }, [videoCallApi, navigation, store.developer.environment.name, logger])

  return {
    handlePressSendVideo,
    handlePressLiveCall,
    sendVideoLoading,
    liveCallLoading,
    verificationOptions: store.bcscSecure.verificationOptions ?? [],
  }
}

export default useVerificationMethodModel
