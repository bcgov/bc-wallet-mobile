import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useVerificationPendingActions } from '@/bcsc-theme/hooks/useVerificationPendingActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

type PendingReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PendingReview>
}

const PendingReviewScreen = ({ navigation }: PendingReviewScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const { isCheckingStatus, handleCheckStatus, handleCancelVerification } = useVerificationPendingActions(navigation)

  const styles = StyleSheet.create({
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey('CheckStatus')}
        accessibilityLabel={t('BCSC.Steps.CheckStatus')}
        title={t('BCSC.Steps.CheckStatus')}
        buttonType={ButtonType.Primary}
        disabled={isCheckingStatus}
        onPress={handleCheckStatus}
      />
      <Button
        testID={testIdWithKey('ChooseAnotherWayToVerify')}
        accessibilityLabel={t('BCSC.Steps.ChooseAnotherWayToVerify')}
        title={t('BCSC.Steps.ChooseAnotherWayToVerify')}
        buttonType={ButtonType.Secondary}
        onPress={handleCancelVerification}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.SendVideo.PendingReview.Heading')}</ThemedText>
      <ThemedText style={{ marginVertical: Spacing.md }}>{t('BCSC.SendVideo.PendingReview.Description1')}</ThemedText>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'•'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.PendingReview.Bullet1')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'•'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.PendingReview.Bullet2')}</ThemedText>
      </View>
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.SendVideo.PendingReview.Description2')}</ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.SendVideo.PendingReview.Description3')}</ThemedText>
      <ThemedText>{t('BCSC.SendVideo.PendingReview.Description4')}</ThemedText>
    </ScreenWrapper>
  )
}
export default PendingReviewScreen
