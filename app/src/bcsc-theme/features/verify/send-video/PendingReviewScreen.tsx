import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type PendingReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PendingReview>
}

const PendingReviewScreen = ({ navigation }: PendingReviewScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

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
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'}>{t('Unified.SendVideo.PendingReview.Heading')}</ThemedText>
        <ThemedText style={{ marginVertical: Spacing.md }}>
          {t('Unified.SendVideo.PendingReview.Description1')}
        </ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{t('Unified.SendVideo.PendingReview.Bullet1')}</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{t('Unified.SendVideo.PendingReview.Bullet2')}</ThemedText>
        </View>
        <ThemedText style={{ marginBottom: Spacing.md }}>
          {t('Unified.SendVideo.PendingReview.Description2')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>
          {t('Unified.SendVideo.PendingReview.Description3')}
        </ThemedText>
        <ThemedText>{t('Unified.SendVideo.PendingReview.Description4')}</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          testID={testIdWithKey('Ok')}
          accessibilityLabel={t('Unified.SendVideo.PendingReview.ButtonText')}
          title={t('Unified.SendVideo.PendingReview.ButtonText')}
          buttonType={ButtonType.Primary}
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  )
}
export default PendingReviewScreen
