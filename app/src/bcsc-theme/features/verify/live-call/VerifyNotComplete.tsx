import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

type VerifyNotCompleteScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerifyNotComplete>
}

const VerifyNotCompleteScreen = ({ navigation }: VerifyNotCompleteScreenProps) => {
  const { t } = useTranslation()
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
          {t('Unified.VideoCall.VerifyNotComplete.Title')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>
          {t('Unified.VideoCall.VerifyNotComplete.NotVerifiedYet')}
        </ThemedText>
        <Button
          buttonType={ButtonType.Secondary}
          testID={testIdWithKey('Trouble')}
          accessibilityLabel={t('Unified.VideoCall.VerifyNotComplete.HavingTrouble')}
          title={t('Unified.VideoCall.VerifyNotComplete.HavingTrouble')}
          onPress={onPressTrouble}
        >
          <Icon
            style={{ paddingRight: Spacing.sm }}
            name={'open-in-new'}
            color={ColorPalette.brand.primary}
            size={24}
          />
        </Button>
        <ThemedText style={{ marginTop: Spacing.sm }}>
          {t('Unified.VideoCall.VerifyNotComplete.TroubleshootingTips')}
        </ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          testID={testIdWithKey('SendVideo')}
          accessibilityLabel={t('Unified.VideoCall.VerifyNotComplete.SendVideoInstead')}
          title={t('Unified.VideoCall.VerifyNotComplete.SendVideoInstead')}
          onPress={onPressSendVideo}
        />
        <Button
          buttonType={ButtonType.Secondary}
          testID={testIdWithKey('TryAgain')}
          accessibilityLabel={t('Unified.VideoCall.VerifyNotComplete.TryAgain')}
          title={t('Unified.VideoCall.VerifyNotComplete.TryAgain')}
          onPress={onPressSendVideo}
        />
      </View>
    </SafeAreaView>
  )
}

export default VerifyNotCompleteScreen
