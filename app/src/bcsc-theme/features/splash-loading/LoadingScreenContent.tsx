import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCAnimatedLoadingIcon } from './BCAnimatedLoadingIcon'

export interface LoadingScreenContentProps {
  /**
   * The optional message to override the default loading message.
   * default: "A secure way to prove who you are online"
   * @type {string | undefined}
   */
  message?: string
}

/**
 * Renders the LoadingScreenContent component with a message and an activity indicator.
 *
 * @returns The LoadingScreenContent component.
 */
export const LoadingScreenContent = ({ message }: LoadingScreenContentProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    textContainer: {
      padding: Spacing.lg,
    },
    text: {
      textAlign: 'center',
    },
  })

  return (
    <SafeAreaView style={styles.container} testID={testIdWithKey('LoadingScreenContent')}>
      <View style={styles.contentContainer}>
        <BCAnimatedLoadingIcon size={113} />
        <View style={styles.textContainer}>
          <ThemedText style={styles.text} variant="headingFour">
            {message ?? t('BCSC.Loading.DefaultMessage')}
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  )
}
