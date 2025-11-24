import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

type VideoTooLongScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VideoTooLong>
  route: {
    params: {
      videoLengthSeconds: number
    }
  }
}

const VideoTooLongScreen = ({ navigation, route }: VideoTooLongScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { videoLengthSeconds } = route.params
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      padding: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
    },
  })

  const controls = (
    <>
      <View style={{ marginBottom: Spacing.md }}>
        <Button
          buttonType={ButtonType.Primary}
          title={t('BCSC.SendVideo.VideoTooLong.ButtonText')}
          onPress={() => {
            navigation.goBack()
          }}
          accessibilityLabel={t('BCSC.SendVideo.VideoTooLong.ButtonText')}
        />
      </View>
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.SendVideo.VideoTooLong.CancelButtonText')}
        onPress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: BCSCScreens.SetupSteps }],
            })
          )
        }}
        testID={'Cancel'}
        accessibilityLabel={t('BCSC.SendVideo.VideoTooLong.CancelButtonText')}
      />
    </>
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          {t('BCSC.SendVideo.VideoTooLong.Heading')}
        </ThemedText>
        <ThemedText variant={'bold'}>{t('BCSC.SendVideo.VideoTooLong.Description1')}</ThemedText>
        <ThemedText variant={'bold'}>
          {t('BCSC.SendVideo.VideoTooLong.Description2', { videoLengthSeconds })}
        </ThemedText>
      </View>
    </ScreenWrapper>
  )
}

export default VideoTooLongScreen
