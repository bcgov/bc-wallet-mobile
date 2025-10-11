import { ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const PrivacyPolicyScreen: React.FC = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: theme.Spacing.md,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText>{t('BCSCOnboarding.PrivacyContentA')}</ThemedText>
        <ThemedText>{t('BCSCOnboarding.PrivacyContentB')}</ThemedText>
        <ThemedText>{t('BCSCOnboarding.PrivacyContentC')}</ThemedText>
      </ScrollView>
    </SafeAreaView>
  )
}
