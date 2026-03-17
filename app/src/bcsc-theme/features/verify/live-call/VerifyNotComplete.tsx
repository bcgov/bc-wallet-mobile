import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VerifyNotCompleteScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyNotComplete>
}

const VerifyNotCompleteScreen = ({ navigation }: VerifyNotCompleteScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()

  const navigateToWebView = useCallback(
    (url: string, title: string) => {
      navigation.navigate(BCSCScreens.VerifyWebView, { url, title })
    },
    [navigation]
  )

  const onPressTrouble = () => {
    navigateToWebView(HelpCentreUrl.AUDIO_VIDEO_TROUBLESHOOTING, t('HelpCentre.Title'))
  }

  const onPressSendVideo = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.VerificationMethodSelection }],
      })
    )
  }

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        testID={testIdWithKey('SendVideo')}
        accessibilityLabel={t('BCSC.VideoCall.VerifyNotComplete.SendVideoInstead')}
        title={t('BCSC.VideoCall.VerifyNotComplete.SendVideoInstead')}
        onPress={onPressSendVideo}
      />
      <Button
        buttonType={ButtonType.Secondary}
        testID={testIdWithKey('TryAgain')}
        accessibilityLabel={t('BCSC.VideoCall.VerifyNotComplete.TryAgain')}
        title={t('BCSC.VideoCall.VerifyNotComplete.TryAgain')}
        onPress={onPressSendVideo}
      />
    </>
  )

  return (
    <ScreenWrapper controls={controls}>
      <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.VideoCall.VerifyNotComplete.Title')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>
        {t('BCSC.VideoCall.VerifyNotComplete.NotVerifiedYet')}
      </ThemedText>
      <Button
        buttonType={ButtonType.Secondary}
        testID={testIdWithKey('Trouble')}
        accessibilityLabel={t('BCSC.VideoCall.VerifyNotComplete.HavingTrouble')}
        title={t('BCSC.VideoCall.VerifyNotComplete.HavingTrouble')}
        onPress={onPressTrouble}
      >
        <Icon style={{ paddingRight: Spacing.sm }} name={'open-in-new'} color={ColorPalette.brand.primary} size={24} />
      </Button>
      <ThemedText style={{ marginTop: Spacing.sm }}>
        {t('BCSC.VideoCall.VerifyNotComplete.TroubleshootingTips')}
      </ThemedText>
    </ScreenWrapper>
  )
}

export default VerifyNotCompleteScreen
