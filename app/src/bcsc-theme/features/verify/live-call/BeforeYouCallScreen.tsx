import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNetInfo } from '@react-native-community/netinfo'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type BeforeYouCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.BeforeYouCall>
  route: RouteProp<BCSCVerifyIdentityStackParams, BCSCScreens.BeforeYouCall>
}

const BeforeYouCallScreen = ({ navigation, route }: BeforeYouCallScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { type: networkType, isConnected } = useNetInfo()
  const { formattedHours } = route.params || {}

  // Use the passed formatted hours or fallback to default
  const hoursText = formattedHours || 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
  const isCellular = useMemo(() => networkType === 'cellular' && isConnected === true, [networkType, isConnected])

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
    navigation.navigate(BCSCScreens.TakePhoto, {
      forLiveCall: true,
      deviceSide: 'front',
      cameraInstructions: '',
      cameraLabel: '',
    })
  }

  const onPressAssistance = () => {
    // TODO (bm): webview or external link here presumeably
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          Before you call
        </ThemedText>
        <ThemedText variant={'headingFour'}>Wi-Fi Recommended</ThemedText>
        <ThemedText>
          {isCellular ? "The app detected you're on a cellular network. " : ''}
          Standard data charges may apply for calls over a cellular network.
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Find a Private Place to Talk
        </ThemedText>
        <ThemedText>{`Make sure you'll be the only person in the video.`}</ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          Hours of Service
        </ThemedText>
        <ThemedText>{hoursText}</ThemedText>
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
          />
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
