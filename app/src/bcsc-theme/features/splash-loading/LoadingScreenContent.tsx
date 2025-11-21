import { ThemedText, useTheme } from '@bifold/core'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

interface LoadingScreenContentDefaultProps {
  message?: string
  loading?: never
  onLoaded?: never
}

interface LoadingScreenContentActionProps {
  /**
   * The optional message to display on the loading screen.
   * Defaults to a localized loading message if not provided.
   * ie: "A secure way to prove who you are online"
   *
   * @type {string | undefined}
   */
  message?: string
  /**
   * Indicates whether the loading process is ongoing.
   *
   * @type {boolean}
   */
  loading: boolean
  /**
   * Callback function to be called when loading is complete.
   * Usually used to navigate to the next screen.
   *
   * @type {() => void}
   */
  onLoaded: () => void
}

type LoadingScreenContentProps = LoadingScreenContentDefaultProps | LoadingScreenContentActionProps

/**
 * Renders the LoadingScreenContent component with a message and an activity indicator.
 *
 * Note: Props `loading` + `onLoaded` are optional, but must be provided together.
 *
 * @returns {*} {JSX.Element} The LoadingScreenContent component.
 */
export const LoadingScreenContent = ({ message, loading, onLoaded }: LoadingScreenContentProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.lg,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    divider: {
      height: 2,
      backgroundColor: ColorPalette.brand.primaryLight,
    },
    message: {
      fontSize: 26,
    },
  })

  useEffect(() => {
    if (loading || !onLoaded) {
      return
    }

    onLoaded()
  }, [loading, onLoaded])

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <ThemedText variant="bold" style={styles.message}>
        {message ?? t('BCSC.Loading.DefaultMessage')}
      </ThemedText>
      <ActivityIndicator size={'large'} />
    </View>
  )
}
