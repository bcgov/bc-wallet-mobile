import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type CallBusyOrClosedScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.CallBusyOrClosed>
  route: RouteProp<BCSCVerifyIdentityStackParams, BCSCScreens.CallBusyOrClosed>
}

const CallBusyOrClosedScreen = ({ navigation, route }: CallBusyOrClosedScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { busy, formattedHours } = route.params
  const serviceHours = formattedHours || 'Monday to Friday\n7:30am - 5:00pm Pacific Time'

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    iconContainer: {
      marginBottom: Spacing.lg,
    },
  })

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
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.lg }}>
          {busy ? 'All agents are busy' : 'Call us later'}
        </ThemedText>

        <ThemedText style={{ marginBottom: Spacing.lg }}>
          {busy
            ? `We're sorry your call couldn't be answered. All of our agents are busy at the moment. Please call us back during our hours of service.`
            : `We are currently closed. To talk to one of our agents to verify by video, call us during our hours of service.`}
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.sm }}>
          Hours of Service
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>{serviceHours}</ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Reminder
        </ThemedText>
        <ThemedText>{`You'll need to add your card again if you don't finish verifying by ${store.bcsc.deviceCodeExpiresAt?.toLocaleString(
          'en-CA',
          { month: 'long', day: 'numeric', year: 'numeric' }
        )}.`}</ThemedText>
      </View>

      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
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
