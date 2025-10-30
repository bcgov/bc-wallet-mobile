import { ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from 'react-native-vector-icons/Icon'

/**
 *
 * @returns {*} {JSX.Element} The InternetDisconnected component.
 */
export const InternetDisconnected = (): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scollContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <Icon name="wifi-off" size={64} />
        <ThemedText variant="headingThree">{t('Modals.InternetDisconnected.Header')}</ThemedText>
      </ScrollView>
    </SafeAreaView>
  )
}
