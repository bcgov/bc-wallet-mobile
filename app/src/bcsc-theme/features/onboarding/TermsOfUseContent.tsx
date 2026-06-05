import useApi from '@/bcsc-theme/api/hooks/useApi'
import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { createTermsOfUseHtml } from '@/bcsc-theme/utils/webview-utils'
import {
  Button,
  ButtonType,
  ContentGradient,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native'
import { WebViewContent } from '../webview/WebViewContent'

interface TermsOfUseContentProps {
  /**
   * Called when the user presses the accept button, with the terms that were displayed.
   */
  onAccept: (termsOfUse: TermsOfUseResponseData) => void | Promise<void>
  /**
   * Header text rendered above the terms. Defaults to the onboarding header.
   */
  headerText?: string
}

/**
 * Reusable Terms of Use content component that fetches and presents the terms of use to the user.
 *
 * Used by the onboarding Terms of Use screen and the updated terms re-acceptance modal.
 *
 * @returns {*} {React.ReactElement} The TermsOfUseContent component.
 */
export const TermsOfUseContent = ({ onAccept, headerText }: TermsOfUseContentProps): React.ReactElement => {
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
      paddingHorizontal: Spacing.sm,
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  const controls = (
    <View style={{ width: '100%' }}>
      <ContentGradient backgroundColor={ColorPalette.brand.primaryBackground} />
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
          onPress={async () => {
            if (termsOfUse) {
              await onAccept(termsOfUse)
            }
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={a11yLabel(t('BCSC.Onboarding.AcceptAndContinueButton'))}
          disabled={!webViewIsLoaded || isLoading}
        />
      )}
    </View>
  )

  if (!termsOfUse) {
    return (
      <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
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
    <ScreenWrapper scrollable={false} controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
      <WebViewContent
        html={createTermsOfUseHtml(
          {
            termsOfUse,
            colorPalette: ColorPalette,
            textColor: TextTheme.normal.color,
            headerText: headerText ?? t('BCSC.Onboarding.TermsOfUseHeader'),
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
