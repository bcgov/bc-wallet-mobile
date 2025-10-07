import useApi from '@/bcsc-theme/api/hooks/useApi'
import { checkIfWithinServiceHours, formatServiceHours } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'
import Spinner from '@/components/Spinner'
import { BCSCAccountType } from '@/bcsc-theme/utils/id-token'
import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
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

  const handlePressSendVideo = async () => {
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
  }

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

  /**
   * Returns a sorted array of verification method buttons based on the available options.
   *
   * @param {DeviceVerificationOption[]} deviceVerificationOptions - The available verification options.
   * @returns {JSX.Element[]} An array of JSX elements representing the verification method buttons.
   */
  const getSortedVerificationMethods = useCallback(
    (deviceVerificationOptions: DeviceVerificationOption[]): JSX.Element[] => {
      const verificationMethods: JSX.Element[] = []

      for (let index = 0; index < deviceVerificationOptions.length; index++) {
        const verificationOption = deviceVerificationOptions[index]
        const borderBottomWidth = deviceVerificationOptions.length === index + 1 ? 1 : undefined

        if (verificationOption === DeviceVerificationOption.LIVE_VIDEO_CALL) {
          verificationMethods.push(
            <VerifyMethodActionButton
              key="video_call"
              title={'Video call'}
              description={`We will verify your identity during a video call.`}
              icon={'video'}
              onPress={handlePressLiveCall}
              loading={liveCallLoading}
              disabled={liveCallLoading || sendVideoLoading}
              style={{ borderBottomWidth }}
            />
          )
        }

        if (verificationOption === DeviceVerificationOption.SEND_VIDEO) {
          verificationMethods.push(
            <VerifyMethodActionButton
              key="send_video"
              title={'Send a video'}
              description={`Record a short video and we'll review it to verify your identity.`}
              icon={'send'}
              onPress={handlePressSendVideo}
              loading={sendVideoLoading}
              disabled={sendVideoLoading || liveCallLoading}
              style={{ borderBottomWidth }}
            />
          )
        }

        if (verificationOption === DeviceVerificationOption.IN_PERSON) {
          verificationMethods.push(
            <VerifyMethodActionButton
              key="in_person"
              title={'In person'}
              description={`Find out where to go and what to bring.`}
              icon={'account'}
              onPress={() => navigation.navigate(BCSCScreens.VerifyInPerson)}
              disabled={liveCallLoading || sendVideoLoading}
              style={{ borderBottomWidth }}
            />
          )
        }
      }

      return verificationMethods
    },
    [handlePressLiveCall, handlePressSendVideo, liveCallLoading, navigation, sendVideoLoading]
  )

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      {getSortedVerificationMethods(store.bcsc.verificationOptions)}
    </SafeAreaView>
  )
}
export default VerificationMethodSelectionScreen
