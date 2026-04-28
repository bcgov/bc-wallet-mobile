import useApi from '@/bcsc-theme/api/hooks/useApi'
import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createTermsOfUseHtml } from '@/bcsc-theme/utils/webview-utils'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native'
import { WebViewContent } from '../webview/WebViewContent'

interface TermsOfUseScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingTermsOfUse>
}

/**
 * Terms of Use screen component that presents the application's terms of use to the user.
 *
 * @returns {*} {React.ReactElement} The TermsOfUseScreen component.
 */
export const TermsOfUseScreen = ({ navigation }: TermsOfUseScreenProps): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { config } = useApi()
  const [termsOfUse, setTermsOfUse] = useState<TermsOfUseResponseData | null>(null)
  const [webViewIsLoaded, setWebViewIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const { fontScale } = useWindowDimensions()

  const fetchTermsOfUse = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await config.getTermsOfUse()
      setError(false)
      setTermsOfUse(data)
    } catch (err) {
      logger.error('Failed to fetch Terms of Use', err as Error)
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [config, logger])

  useEffect(() => {
    fetchTermsOfUse()
  }, [fetchTermsOfUse])

  const styles = StyleSheet.create({
    scrollContainer: {
      padding: Spacing.lg,
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  const controls = (
    <ControlContainer>
      {error ? (
        <Button
          title={t('Init.Retry')}
          buttonType={ButtonType.Primary}
          onPress={fetchTermsOfUse}
          testID={testIdWithKey('RetryTermsOfUse')}
          accessibilityLabel={a11yLabel(t('Init.Retry'))}
          disabled={isLoading}
        />
      ) : (
        <Button
          title={t('BCSC.Onboarding.AcceptAndContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.OnboardingOptInAnalytics)
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={a11yLabel(t('BCSC.Onboarding.AcceptAndContinueButton'))}
          disabled={!webViewIsLoaded || isLoading}
        />
      )}
    </ControlContainer>
  )

  if (!termsOfUse) {
    return (
      <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
        <View style={styles.loadingContainer}>
          {error && !isLoading ? (
            <View style={{ flexDirection: 'row' }}>
              <ThemedText style={{ flexWrap: 'wrap', flexShrink: 1, textAlign: 'center' }}>
                {t('BCSC.Onboarding.TermsOfUseLoadError')}
              </ThemedText>
            </View>
          ) : (
            <ActivityIndicator size="large" />
          )}
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper
      padded={false}
      scrollable={false}
      controls={controls}
      scrollViewContainerStyle={styles.scrollContainer}
    >
      <WebViewContent
        html={createTermsOfUseHtml(
          {
            termsOfUse,
            colorPalette: ColorPalette,
            textColor: TextTheme.normal.color,
            headerText: t('BCSC.Onboarding.TermsOfUseHeader'),
            subtitlePrefix: t('BCSC.Onboarding.TermsOfUseSubtitle'),
            versionLabel: t('BCSC.Onboarding.TermsOfUseVersion'),
          },
          fontScale
        )}
        onLoaded={() => setWebViewIsLoaded(true)}
      />
    </ScreenWrapper>
  )
}
