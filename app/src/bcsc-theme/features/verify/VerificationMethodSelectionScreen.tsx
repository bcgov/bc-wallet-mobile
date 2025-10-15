import useApi from '@/bcsc-theme/api/hooks/useApi'
import { checkIfWithinServiceHours, formatServiceHours } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'
import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { useTranslation } from 'react-i18next'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [sendVideoLoading, setSendVideoLoading] = useState(false)
  const [liveCallLoading, setLiveCallLoading] = useState(false)
  const { evidence, video: videoCallApi } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
  })

  const handlePressSendVideo = useCallback(async () => {
    try {
      setSendVideoLoading(true)
      const { sha256, id, prompts } = await evidence.createVerificationRequest()
      dispatch({ type: BCDispatchAction.UPDATE_VERIFICATION_REQUEST, payload: [{ sha256, id }] })
      dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [prompts] })
      navigation.navigate(BCSCScreens.InformationRequired)
    } catch (error) {
      // TODO: Handle error, e.g., show an alert or log the error
      return
    } finally {
      setSendVideoLoading(false)
    }
  }, [dispatch, evidence, navigation])

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
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      {store.bcsc.verificationOptions
        .map((option, index) => {
          const borderBottomWidth = store.bcsc.verificationOptions.length === index + 1 ? 1 : undefined

          if (option === DeviceVerificationOption.LIVE_VIDEO_CALL) {
            return (
              <VerifyMethodActionButton
                key="video_call"
                title={t('Unified.VerificationMethods.VideoCallTitle')}
                description={t('Unified.VerificationMethods.VideoCallDescription')}
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
                title={t('Unified.VerificationMethods.SendVideoTitle')}
                description={t('Unified.VerificationMethods.SendVideoDescription')}
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
                title={t('Unified.VerificationMethods.InPersonTitle')}
                description={t('Unified.VerificationMethods.InPersonDescription')}
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
    </SafeAreaView>
  )
}
export default VerificationMethodSelectionScreen
