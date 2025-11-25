import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

type PendingReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PendingReview>
}

const PendingReviewScreen = ({ navigation }: PendingReviewScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

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
    <Button
      testID={testIdWithKey('Ok')}
      accessibilityLabel={t('BCSC.SendVideo.PendingReview.ButtonText')}
      title={t('BCSC.SendVideo.PendingReview.ButtonText')}
      buttonType={ButtonType.Primary}
      onPress={() => navigation.goBack()}
    />
  )

  return (
    <ScreenWrapper padded controls={controls}>
      <ThemedText variant={'headingThree'}>{t('BCSC.SendVideo.PendingReview.Heading')}</ThemedText>
      <ThemedText style={{ marginVertical: Spacing.md }}>{t('BCSC.SendVideo.PendingReview.Description1')}</ThemedText>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.PendingReview.Bullet1')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.PendingReview.Bullet2')}</ThemedText>
      </View>
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.SendVideo.PendingReview.Description2')}</ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.SendVideo.PendingReview.Description3')}</ThemedText>
      <ThemedText>{t('BCSC.SendVideo.PendingReview.Description4')}</ThemedText>
    </ScreenWrapper>
  )
}
export default PendingReviewScreen
