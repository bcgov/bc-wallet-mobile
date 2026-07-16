import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
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
  const { refreshPrompts, isRefreshingPrompts } = useVideoPrompts()
  const { videoPromptsMissingAlert } = useAlerts(navigation)

  // A plain back pops to TakeVideo, which re-arms recording on focus against the set the discarded
  // recording already answered — the replay Retake refreshes to avoid, reached without pressing Retake.
  // The two buttons below are this screen's deliberate exits, so back has nothing to offer here. This
  // covers Android's hardware back (it dispatches without a source, which is what the hook keys on, so
  // both buttons still navigate normally); `gestureEnabled: false` in VerifyStack covers the iOS swipe.
  usePreventGestureBack()

  /**
   * Goes straight back to the camera, which re-arms recording on focus, so the next attempt needs its
   * challenge set issued here. The over-long recording is discarded, so rotating the sha costs nothing.
   */
  const onPressRetake = async () => {
    const promptsReady = await refreshPrompts()
    if (!promptsReady) {
      videoPromptsMissingAlert()
      return
    }

    navigation.goBack()
  }

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.SendVideo.VideoTooLong.ButtonText')}
        onPress={onPressRetake}
        accessibilityLabel={t('BCSC.SendVideo.VideoTooLong.ButtonText')}
        disabled={isRefreshingPrompts}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.SendVideo.VideoTooLong.CancelButtonText')}
        onPress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: BCSCScreens.VerificationMethodSelection }],
            })
          )
        }}
        testID={'Cancel'}
        accessibilityLabel={t('BCSC.SendVideo.VideoTooLong.CancelButtonText')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      controls={controls}
      padded={false}
      edges={['top', 'bottom', 'left', 'right']}
      scrollViewContainerStyle={{ padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.SendVideo.VideoTooLong.Heading')}
      </ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.SendVideo.VideoTooLong.Description1')}</ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.SendVideo.VideoTooLong.Description2', { videoLengthSeconds })}</ThemedText>
    </ScreenWrapper>
  )
}

export default VideoTooLongScreen
