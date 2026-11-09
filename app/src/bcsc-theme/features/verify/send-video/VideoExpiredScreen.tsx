import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

type VideoExpiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VideoExpired>
}

/**
 * Where a recording that sat on the review screen past its expiry window ends up. IAS
 * rejects a finalize whose video capture date is over five minutes old
 */
const VideoExpiredScreen = ({ navigation }: VideoExpiredScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const onPressRetake = () => {
    navigation.navigate(BCSCScreens.VideoInstructions)
  }

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.SendVideo.VideoExpired.ButtonText')}
        onPress={onPressRetake}
        testID={testIdWithKey(TestIds.verify.videoExpired.retake)}
        accessibilityLabel={t('BCSC.SendVideo.VideoExpired.ButtonText')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      controls={controls}
      padded={false}
      edges={['bottom', 'left', 'right']}
      scrollViewContainerStyle={{ padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.SendVideo.VideoExpired.Heading')}
      </ThemedText>
      <ThemedText>{t('BCSC.SendVideo.VideoExpired.Description')}</ThemedText>
    </ScreenWrapper>
  )
}

export default VideoExpiredScreen
