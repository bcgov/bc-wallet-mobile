import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

type VideoTooLongScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VideoTooLong>
  route: {
    params: {
      videoLengthSeconds: number
    }
  }
}

const VideoTooLongScreen = ({ navigation, route }: VideoTooLongScreenProps) => {
  const { Spacing } = useTheme()
  const { videoLengthSeconds } = route.params
  const { t } = useTranslation()

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.SendVideo.VideoTooLong.ButtonText')}
        onPress={() => {
          navigation.goBack()
        }}
        accessibilityLabel={t('BCSC.SendVideo.VideoTooLong.ButtonText')}
      />
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
    <ScreenWrapper controls={controls} edges={['top', 'bottom', 'left', 'right']}>
      <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.SendVideo.VideoTooLong.Heading')}
      </ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.SendVideo.VideoTooLong.Description1')}</ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.SendVideo.VideoTooLong.Description2', { videoLengthSeconds })}</ThemedText>
    </ScreenWrapper>
  )
}

export default VideoTooLongScreen
