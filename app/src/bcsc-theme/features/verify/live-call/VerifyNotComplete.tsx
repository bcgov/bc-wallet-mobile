import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VerifyNotCompleteScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyNotComplete>
}

const VerifyNotCompleteScreen = ({ navigation }: VerifyNotCompleteScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing, Buttons } = useTheme()

  const styles = StyleSheet.create({
    linkButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      flexWrap: 'wrap',
      flexShrink: 1,
    },
  })

  const onPressSendVideo = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    )
  }

  const controls = (
    <ControlContainer>
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
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.VideoCall.VerifyNotComplete.Title')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>
        {t('BCSC.VideoCall.VerifyNotComplete.NotVerifiedYet')}
      </ThemedText>
      <Button
        buttonType={ButtonType.Secondary}
        title={''}
        onPress={() => Linking.openURL(HelpCentreUrl.AUDIO_VIDEO_TROUBLESHOOTING)}
        accessibilityLabel={t('BCSC.VideoCall.VerifyNotComplete.HavingTrouble')}
        testID={testIdWithKey('Trouble')}
      >
        <View style={styles.linkButtonContent}>
          <ThemedText style={Buttons.secondaryText}>{t('BCSC.VideoCall.VerifyNotComplete.HavingTrouble')}</ThemedText>
          <Icon
            style={{ paddingRight: Spacing.sm }}
            name={'open-in-new'}
            color={ColorPalette.brand.primary}
            size={24}
          />
        </View>
      </Button>
      <ThemedText style={{ marginTop: Spacing.sm }}>
        {t('BCSC.VideoCall.VerifyNotComplete.TroubleshootingTips')}
      </ThemedText>
    </ScreenWrapper>
  )
}

export default VerifyNotCompleteScreen
