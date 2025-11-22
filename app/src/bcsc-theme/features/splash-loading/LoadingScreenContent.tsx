import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import HomeHeader from '../home/components/HomeHeader'

interface LoadingScreenContentDefaultProps {
  message?: string
  loading?: never
  onLoaded?: never
}

interface LoadingScreenContentActionProps {
  /**
   * The optional message to override the default loading message.
   * default: "A secure way to prove who you are online"
   *
   * QUESTION (MD): Does this need to cycle through different messages?
   *
   * @type {string | undefined}
   */
  message?: string
  /**
   * Indicates whether the loading process is ongoing.
   * Pairs with `onLoaded` callback
   *
   * @type {boolean}
   */
  loading: boolean
  /**
   * Callback function to be called when loading is complete. ie: navigation
   * Pairs with `loading` prop
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
  const { Spacing, ColorPalette, Assets } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: Spacing.xxl,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    topContainer: {
      flex: 4,
      justifyContent: 'flex-end',
      marginBottom: Spacing.xs,
    },
    bottomContainer: {
      flex: 6,
      justifyContent: 'space-between',
      marginTop: Spacing.xl,
    },
    divider: {
      height: 1,
      width: '100%',
      backgroundColor: ColorPalette.brand.primary,
    },
    message: {
      fontSize: 26,
      textAlign: 'center',
    },
    logoContainer: {
      alignSelf: 'center',
      marginBottom: 30,
    },
  })

  useEffect(() => {
    if (loading || !onLoaded) {
      return
    }

    onLoaded()
  }, [loading, onLoaded])

  return (
    <SafeAreaView style={styles.container} testID={testIdWithKey('LoadingScreenContent')}>
      <View style={styles.topContainer}>
        <HomeHeader name={t('BCSC.FullTitle')} fontSize={18} />
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomContainer}>
        <ThemedText variant="bold" style={styles.message}>
          {message ?? t('BCSC.Loading.DefaultMessage')}
        </ThemedText>

        <ActivityIndicator size={50} color={ColorPalette.brand.primaryLight} />

        <View style={styles.logoContainer}>
          <Image
            source={Assets.img.logoPrimary.src}
            style={{ width: 150, height: 150 }}
            testID={testIdWithKey('BCGovLogo')}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}
