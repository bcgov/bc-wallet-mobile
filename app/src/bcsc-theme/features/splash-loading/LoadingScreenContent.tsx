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
  /**
   * An optional boolean to determine if the loading icon appears above the provided message or below.
   * This defaults to true, meaning the icon is above the message.
   */
  iconOnTop?: boolean
}

/**
 * Renders the LoadingScreenContent component with a message and a loading icon.
 *
 * @returns The LoadingScreenContent component.
 */
export const LoadingScreenContent = ({ message, iconOnTop = true }: LoadingScreenContentProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const iconSize = 113
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
        {iconOnTop && <BCAnimatedLoadingIcon size={iconSize} />}
        <View style={styles.textContainer}>
          <ThemedText style={styles.text} variant="headingFour">
            {message ?? t('BCSC.Loading.DefaultMessage')}
          </ThemedText>
        </View>
        {!iconOnTop && <BCAnimatedLoadingIcon size={iconSize} />}
      </View>
    </SafeAreaView>
  )
}
