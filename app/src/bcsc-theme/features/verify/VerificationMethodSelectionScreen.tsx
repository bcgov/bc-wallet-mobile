import useApi from '@/bcsc-theme/api/hooks/useApi'
import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { checkIfWithinServiceHours, formatServiceHours } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { ScreenWrapper, TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'
import { VerificationVideoCache } from './send-video/VideoReviewScreen'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [sendVideoLoading, setSendVideoLoading] = useState(false)
  const [liveCallLoading, setLiveCallLoading] = useState(false)
  const { evidence, video: videoCallApi } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handlePressSendVideo = useCallback(async () => {
    try {
      setSendVideoLoading(true)

      const { sha256, id, prompts } = await evidence.createVerificationRequest()

      await Promise.allSettled([
        VerificationVideoCache.removeMediaAndClearCache(store.bcsc.videoPath, logger),
        removeFileSafely(store.bcsc.photoPath, logger),
        removeFileSafely(store.bcsc.videoThumbnailPath, logger),
      ])

      dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
      dispatch({ type: BCDispatchAction.UPDATE_VERIFICATION_REQUEST, payload: [{ sha256, id }] })
      dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [prompts] })

      navigation.navigate(BCSCScreens.InformationRequired)
    } catch (error) {
      logger.error('Error sending video:', error as Error)
      return
    } finally {
      setSendVideoLoading(false)
    }
  }, [
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

  return (
    <ScreenWrapper padded={false}>
      {store.bcsc.verificationOptions
        .map((option, index) => {
          const borderBottomWidth = store.bcsc.verificationOptions.length === index + 1 ? 1 : undefined

          if (option === DeviceVerificationOption.LIVE_VIDEO_CALL) {
            return (
              <VerifyMethodActionButton
                key="video_call"
                title={t('BCSC.VerificationMethods.VideoCallTitle')}
                description={t('BCSC.VerificationMethods.VideoCallDescription')}
                icon={'video'}
                onPress={handlePressLiveCall}
                loading={liveCallLoading}
                disabled={liveCallLoading || sendVideoLoading}
                style={{ borderBottomWidth }}
              />
            )
          }

          if (option === DeviceVerificationOption.SEND_VIDEO) {
            return (
              <VerifyMethodActionButton
                key="send_video"
                title={t('BCSC.VerificationMethods.SendVideoTitle')}
                description={t('BCSC.VerificationMethods.SendVideoDescription')}
                icon={'send'}
                onPress={handlePressSendVideo}
                loading={sendVideoLoading}
                disabled={sendVideoLoading || liveCallLoading}
                style={{ borderBottomWidth }}
              />
            )
          }

          if (option === DeviceVerificationOption.IN_PERSON) {
            return (
              <VerifyMethodActionButton
                key="in_person"
                title={t('BCSC.VerificationMethods.InPersonTitle')}
                description={t('BCSC.VerificationMethods.InPersonDescription')}
                icon={'account'}
                onPress={() => navigation.navigate(BCSCScreens.VerifyInPerson)}
                disabled={liveCallLoading || sendVideoLoading}
                style={{ borderBottomWidth }}
              />
            )
          }
          return null
        })
        .filter(Boolean)}
    </ScreenWrapper>
  )
}
export default VerificationMethodSelectionScreen
