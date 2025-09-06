import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VerifyNotCompleteScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerifyNotComplete>
}

const VerifyNotCompleteScreen = ({ navigation }: VerifyNotCompleteScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
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
      marginTop: 'auto',
      gap: Spacing.sm,
    },
  })

  const onPressTrouble = () => {
    // TODO (bm): Help webview here, not sure which url
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
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          Verify not complete
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>Your identity is not verified yet.</ThemedText>
        <Button
          buttonType={ButtonType.Secondary}
          testID={testIdWithKey('Trouble')}
          accessibilityLabel={'Having trouble?'}
          title={'Having trouble?'}
          onPress={onPressTrouble}
        >
          <Icon
            style={{ paddingRight: Spacing.sm }}
            name={'open-in-new'}
            color={ColorPalette.brand.primary}
            size={24}
          />
        </Button>
        <ThemedText
          style={{ marginTop: Spacing.sm }}
        >{`If you are having issues with audio or video, try out the following tips. If you're still having trouble, call us.`}</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          testID={testIdWithKey('SendVideo')}
          accessibilityLabel={'Send video instead'}
          title={'Send video instead'}
          onPress={onPressSendVideo}
        />
        <Button
          buttonType={ButtonType.Secondary}
          testID={testIdWithKey('TryAgain')}
          accessibilityLabel={'Try again'}
          title={'Try again'}
          onPress={onPressSendVideo}
        />
      </View>
    </SafeAreaView>
  )
}

export default VerifyNotCompleteScreen
