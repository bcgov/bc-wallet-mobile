import useApi from '@/bcsc-theme/api/hooks/useApi'
import useVideoCallApi from '@/bcsc-theme/api/hooks/useVideoCallApi'
import { formatServiceHours, checkIfWithinServiceHours } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const [sendVideoLoading, setSendVideoLoading] = useState(false)
  const [liveCallLoading, setLiveCallLoading] = useState(false)
  const { evidence } = useApi()
  const videoCallApi = useVideoCallApi()

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

  const handlePressLiveCall = async () => {
    try {
      setLiveCallLoading(true)

      // Check destinations and service hours
      const [destinations, serviceHours] = await Promise.all([
        videoCallApi.getVideoDestinations(),
        videoCallApi.getServiceHours(),
      ])

      const formattedHours = formatServiceHours(serviceHours)

      // Check if any agents are available
      const availableDestination = destinations.find((dest) => dest.destination_name === 'Test Harness Queue Destination')

      if (!availableDestination) {
        // No agents available - service is busy
        navigation.navigate(BCSCScreens.CallBusyOrClosed, { 
          busy: true,
          formattedHours
        })
        return
      }

      // Check if within service hours
      const isWithinServiceHours = checkIfWithinServiceHours(serviceHours)

      if (!isWithinServiceHours) {
        // Outside service hours - service is closed
        navigation.navigate(BCSCScreens.CallBusyOrClosed, { 
          busy: false,
          formattedHours
        })
        return
      }

      // Service is available - proceed to BeforeYouCall
      navigation.navigate(BCSCScreens.BeforeYouCall, { formattedHours })

    } catch (error) {
      console.warn('Error checking service availability:', error)
      // On error, default to BeforeYouCall screen with fallback hours
      navigation.navigate(BCSCScreens.BeforeYouCall, { 
        formattedHours: 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
      })
    } finally {
      setLiveCallLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <VerifyMethodActionButton
        title={'Send a video'}
        description={`Record a short video and we'll review it to verify your identity.`}
        icon={'send'}
        onPress={handlePressSendVideo}
        style={{ marginBottom: Spacing.xxl }}
        loading={sendVideoLoading}
        disabled={sendVideoLoading || liveCallLoading}
      />
      <ThemedText
        variant={'bold'}
        style={{ marginTop: Spacing.xl, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}
      >
        Cannot send a video?
      </ThemedText>
      <VerifyMethodActionButton
        title={'Video call'}
        description={`We will verify your identity during a video call.`}
        icon={'video'}
        onPress={handlePressLiveCall}
        style={{ borderBottomWidth: 0 }}
        loading={liveCallLoading}
        disabled={liveCallLoading || sendVideoLoading}
      />
      <VerifyMethodActionButton
        title={'In person'}
        description={`Find out where to go and what to bring.`}
        icon={'account'}
        onPress={() => navigation.navigate(BCSCScreens.VerifyInPerson)}
        disabled={liveCallLoading || sendVideoLoading}
      />
    </SafeAreaView>
  )
}
export default VerificationMethodSelectionScreen
