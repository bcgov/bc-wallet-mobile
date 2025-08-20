import useVideoCallApi from '@/bcsc-theme/api/hooks/useVideoCallApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  testIdWithKey,
  ThemedText,
  useTheme
} from '@bifold/core'
import { useNetInfo } from '@react-native-community/netinfo'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type BeforeYouCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.BeforeYouCall>
}

const BeforeYouCallScreen = ({ navigation }: BeforeYouCallScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { isWifiEnabled } = useNetInfo()
  const [isCheckingService, setIsCheckingService] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<{
    available: boolean
    message: string
    hoursText: string
  }>({ available: true, message: '', hoursText: 'Monday to Friday\n7:30am - 5:00pm Pacific Time' })

  const videoCallApi = useVideoCallApi()

  useEffect(() => {
    checkServiceAvailability()
  }, [])

  const checkServiceAvailability = async () => {
    try {
      setIsCheckingService(true)

      // Check destinations and service hours
      const [destinations, serviceHours] = await Promise.all([
        videoCallApi.getVideoDestinations(),
        videoCallApi.getServiceHours(),
      ])

      // Check if any agents are available
      const availableDestination = destinations.find((dest) => dest.numberOfAgents > 0)

      if (!availableDestination) {
        setServiceStatus({
          available: false,
          message: 'Video calling service is currently unavailable. No agents are online.',
          hoursText: formatServiceHours(serviceHours),
        })
      } else {
        // Check if within service hours
        const isWithinServiceHours = checkIfWithinServiceHours(serviceHours)

        if (!isWithinServiceHours) {
          setServiceStatus({
            available: false,
            message: 'Video calling service is outside of operating hours.',
            hoursText: formatServiceHours(serviceHours),
          })
        } else {
          setServiceStatus({
            available: true,
            message: `${availableDestination.numberOfAgents} agent${
              availableDestination.numberOfAgents > 1 ? 's' : ''
            } available`,
            hoursText: formatServiceHours(serviceHours),
          })
        }
      }
    } catch (error) {
      console.warn('Error checking service availability:', error)
      setServiceStatus({
        available: false,
        message: 'Unable to check service availability. Please try again later.',
        hoursText: 'Monday to Friday\n7:30am - 5:00pm Pacific Time',
      })
    } finally {
      setIsCheckingService(false)
    }
  }

  const formatServiceHours = (serviceHours: any): string => {
    if (!serviceHours?.regular_service_periods?.length) {
      return 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
    }

    // Format service hours from API response
    // This is a simplified version - you might want more sophisticated formatting
    const periods = serviceHours.regular_service_periods
    const timezone = serviceHours.time_zone || 'Pacific Time'

    return periods
      .map(
        (period: any) =>
          `${period.start_day} to ${period.end_day}\n${period.start_time} - ${period.end_time} ${timezone}`
      )
      .join('\n')
  }

  const checkIfWithinServiceHours = (serviceHours: any): boolean => {
    // Simplified check - in production you'd want proper timezone handling
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Basic check for Monday-Friday, 7:30 AM - 5:00 PM
    if (currentDay === 0 || currentDay === 6) return false // Weekend
    if (currentHour < 7 || currentHour >= 17) return false // Outside hours

    return true
  }

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flexGrow: 1,
    },
    controlsContainer: {
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
  })

  const onPressContinue = async () => {
    if (!serviceStatus.available) {
      Alert.alert(
        'Service Unavailable',
        'Video calling service is currently unavailable. Please try again during service hours.',
        [{ text: 'OK' }]
      )
      return
    }

    navigation.navigate(BCSCScreens.TakePhoto, {
      forLiveCall: true,
      deviceSide: 'front',
      cameraInstructions: '',
      cameraLabel: '',
    })
  }

  const onPressAssistance = () => {
    // TODO (bm)
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          Before you call
        </ThemedText>
        <ThemedText variant={'headingFour'}>Wi-Fi Recommended</ThemedText>
        <ThemedText>
          {isWifiEnabled ? '' : `The app detected you're on a cellular network. `}Standard data charges apply for calls
          over a cellular network.
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Service Status
        </ThemedText>
        <ThemedText
          style={{
            color: serviceStatus.available ? ColorPalette.semantic.success : ColorPalette.semantic.error,
          }}
        >
          {isCheckingService ? 'Checking service availability...' : serviceStatus.message}
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Find a Private Place to Talk
        </ThemedText>
        <ThemedText>Make sure you'll be the only person in the video.</ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Hours of Service
        </ThemedText>
        <ThemedText>{serviceStatus.hoursText}</ThemedText>
        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Contact Centre Privacy
        </ThemedText>
        <ThemedText>{`During a video call, Service BC will ask for and collect personal information. The personal information you will provide is collected for the purpose of verification of your BC Services Card. This information is collected under the authority of Section 26(c) and 26(e) of the Freedom of Information and Protection of Privacy Act (FIPPA).`}</ThemedText>
        <ThemedText
          style={{ marginTop: Spacing.md }}
        >{`If you have further questions about privacy, please contact Chief Privacy Officer, 100 - 722 Johnson Street, Victoria, BC, V8W 1N1, or by phone\n250-405-3726`}</ThemedText>

        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            testID={testIdWithKey('Continue')}
            accessibilityLabel={'Continue'}
            title={'Continue'}
            onPress={onPressContinue}
            disabled={!serviceStatus.available || isCheckingService}
          ></Button>
          <Button
            buttonType={ButtonType.Tertiary}
            testID={testIdWithKey('Assistance')}
            accessibilityLabel={'Need assistance?'}
            title={'Need assistance?'}
            onPress={onPressAssistance}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
export default BeforeYouCallScreen
