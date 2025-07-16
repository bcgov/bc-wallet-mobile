import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type VideoTooLongScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VideoTooLong>
  route: {
    params: {
      videoLengthSeconds: number
    }
  }
}

const VideoTooLongScreen = ({ navigation, route }: VideoTooLongScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()
  const { videoLengthSeconds } = route.params

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
  })
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          Sorry, your video is too long.
        </ThemedText>
        <ThemedText variant={'bold'}>Your video has to be less than 30 seconds.</ThemedText>
        <ThemedText variant={'bold'}>Your video was {videoLengthSeconds} seconds.</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <View style={{ marginBottom: Spacing.md }}>
          <Button
            buttonType={ButtonType.Primary}
            title={'Retake'}
            onPress={() => {
              navigation.goBack()
            }}
            accessibilityLabel={'Retake'}
          />
        </View>
        <Button
          buttonType={ButtonType.Secondary}
          title={'Cancel'}
          onPress={() => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: BCSCScreens.SetupSteps }],
              })
            )
          }}
          testID={'Cancel'}
          accessibilityLabel={'Cancel'}
        />
      </View>
    </SafeAreaView>
  )
}

export default VideoTooLongScreen
