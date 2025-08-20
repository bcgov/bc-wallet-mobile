import useVideoCallApi from '@/bcsc-theme/api/hooks/useVideoCallApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type CallBusyOrClosedScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.CallBusyOrClosed>
  route: RouteProp<BCSCVerifyIdentityStackParams, BCSCScreens.CallBusyOrClosed>
}

const CallBusyOrClosedScreen = ({ navigation, route }: CallBusyOrClosedScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { busy } = route.params
  const [serviceHours, setServiceHours] = useState<string>('Monday to Friday\n7:30am - 5:00pm Pacific Time')
  const [isCheckingHours, setIsCheckingHours] = useState(false)
  
  const videoCallApi = useVideoCallApi()

  useEffect(() => {
    fetchServiceHours()
  }, [])

  const fetchServiceHours = async () => {
    try {
      setIsCheckingHours(true)
      const hours = await videoCallApi.getServiceHours()
      
      if (hours?.regular_service_periods?.length) {
        const timezone = hours.time_zone || 'Pacific Time'
        const hoursText = hours.regular_service_periods.map((period: any) => 
          `${period.start_day} to ${period.end_day}\n${period.start_time} - ${period.end_time} ${timezone}`
        ).join('\n')
        setServiceHours(hoursText)
      }
    } catch (error) {
      console.warn('Error fetching service hours:', error)
      // Keep default hours
    } finally {
      setIsCheckingHours(false)
    }
  }
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlsContainer: {
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    iconContainer: {
      marginBottom: Spacing.lg,
    }
  })

  const getContent = () => {
    if (busy) {
      return {
        icon: 'phone-busy' as const,
        title: 'Service Currently Busy',
        message: 'All agents are currently assisting other customers. Please try again in a few minutes.',
        color: ColorPalette.semantic.error
      }
    } else {
      return {
        icon: 'clock-outline' as const,
        title: 'Service Currently Closed',
        message: 'Video calling service is outside of operating hours. Please try again during service hours.',
        color: ColorPalette.brand.primary
      }
    }
  }

  const content = getContent()

  const onPressCallBack = () => {
    // Navigate back to BeforeYouCall to check availability again
    navigation.goBack()
  }

  const onPressSendVideo = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.VerificationMethodSelection }],
      })
    )
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Icon name={content.icon} size={80} color={content.color} />
        </View>
        
        <ThemedText variant={'headingTwo'} style={{ 
          textAlign: 'center', 
          marginBottom: Spacing.md,
          color: content.color 
        }}>
          {content.title}
        </ThemedText>
        
        <ThemedText style={{ 
          textAlign: 'center', 
          marginBottom: Spacing.lg 
        }}>
          {content.message}
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.sm }}>
          Hours of Service
        </ThemedText>
        <ThemedText style={{ 
          textAlign: 'center',
          marginBottom: Spacing.md 
        }}>
          {isCheckingHours ? 'Loading service hours...' : serviceHours}
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Reminder
        </ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>{`You'll need to add your card again if you don't finish verifying by ${store.bcsc.deviceCodeExpiresAt?.toLocaleString(
          'en-CA',
          { month: 'long', day: 'numeric', year: 'numeric' }
        )}.`}</ThemedText>
      </View>

      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          testID={testIdWithKey('TryAgain')}
          accessibilityLabel={'Try Again'}
          title={'Try Again'}
          onPress={onPressCallBack}
        />
        <Button
          buttonType={ButtonType.Secondary}
          testID={testIdWithKey('SendVideo')}
          accessibilityLabel={'Send video instead'}
          title={'Send video instead'}
          onPress={onPressSendVideo}
        />
      </View>
    </SafeAreaView>
  )
}

export default CallBusyOrClosedScreen
