import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { checkIfWithinServiceHours, formatServiceHours } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
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

  const handlePressSendVideo = useCallback(async () => {
    try {
      setSendVideoLoading(true)

      const { sha256, id, prompts } = await evidence.createVerificationRequest()

      await Promise.allSettled([
        removeFileSafely(store.bcsc.videoPath, logger),
        removeFileSafely(store.bcsc.photoPath, logger),
        removeFileSafely(store.bcsc.videoThumbnailPath, logger),
      ])

      VerificationVideoCache.clearCache()

      dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
      updateVerificationRequest(id, sha256)
      dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [prompts] })

      navigation.navigate(BCSCScreens.InformationRequired)
    } catch (error) {
      logger.error('Error sending video:', error as Error)
      return
    } finally {
      setSendVideoLoading(false)
    }
  }, [
    updateVerificationRequest,
    dispatch,
    evidence,
    logger,
    navigation,
    store.bcsc.photoPath,
    store.bcsc.videoPath,
    store.bcsc.videoThumbnailPath,
  ])

  const handlePressLiveCall = useCallback(async () => {
    try {
      setLiveCallLoading(true)

      const [destinations, serviceHours] = await Promise.all([
        videoCallApi.getVideoDestinations(),
        videoCallApi.getServiceHours(),
      ])

      const formattedHours = formatServiceHours(serviceHours)

      // TODO (bm): Look for prod queue(s) depending on environment
      const availableDestination = destinations.find(
        (dest) => dest.destination_name === 'Test Harness Queue Destination'
      )

      if (!availableDestination) {
        navigation.navigate(BCSCScreens.CallBusyOrClosed, {
          busy: true,
          formattedHours,
        })
        return
      }

      const isWithinServiceHours = checkIfWithinServiceHours(serviceHours)

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
        formattedHours: 'Unavailable',
      })
    } finally {
      setLiveCallLoading(false)
    }
  }, [videoCallApi, logger, navigation])

  return {
    handlePressSendVideo,
    handlePressLiveCall,
    sendVideoLoading,
    liveCallLoading,
    verificationOptions: store.bcscSecure.verificationOptions || [],
  }
}
export default useVerificationMethodModel
