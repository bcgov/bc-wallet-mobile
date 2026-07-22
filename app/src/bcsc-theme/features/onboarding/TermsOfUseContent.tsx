import useApi from '@/bcsc-theme/api/hooks/useApi'
import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { ContentShadow } from '@/bcsc-theme/components/ContentShadow'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { createTermsOfUseHtml, stripOuterDocumentTags } from '@/bcsc-theme/utils/webview-utils'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
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
import { a11yLabel } from '@utils/accessibility'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const { emitErrorModal } = useErrorAlert()
  const [termsOfUse, setTermsOfUse] = useState<TermsOfUseResponseData | null>(null)
  const [webViewIsLoaded, setWebViewIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const { fontScale } = useWindowDimensions()
  const loadFailedTitle = t('Alerts.TermsOfUseLoadFailed.Title')
  const loadFailedDescription = t('Alerts.TermsOfUseLoadFailed.Description')
  const resolvedHeaderText = headerText ?? t('BCSC.Onboarding.TermsOfUseHeader')

  const fetchTermsOfUse = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await config.getTermsOfUse()

      setError(false)
      setTermsOfUse(data)
    } catch (err) {
      logger.error('Failed to fetch Terms of Use', err instanceof Error ? err : new Error(String(err)))
      setError(true)
      // using translation tools directly causes an infinite re render loop
      // pass in the translated strings to avoid this
      emitErrorModal(loadFailedTitle, loadFailedDescription, ensureAppError(err, AppEventCode.TERMS_OF_USE_LOAD_FAILED))
    } finally {
      setIsLoading(false)
    }
  }, [config, logger, emitErrorModal, loadFailedTitle, loadFailedDescription])

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

  const termsOfUseHtml = useMemo(() => {
    // check if html is an empty string after clean up
    if (!termsOfUse || stripOuterDocumentTags(termsOfUse.html) === '') {
      return null
    }

    return createTermsOfUseHtml(
      {
        termsOfUse,
        colorPalette: ColorPalette,
        textColor: TextTheme.normal.color,
        headerText: resolvedHeaderText,
        subtitlePrefix: t('BCSC.Onboarding.TermsOfUseSubtitle'),
        versionLabel: t('BCSC.Onboarding.TermsOfUseVersion'),
      },
      fontScale
    )
  }, [termsOfUse, ColorPalette, TextTheme.normal.color, resolvedHeaderText, t, fontScale])

  useEffect(() => {
    // shortcut to wait for the api response to land
    if (!termsOfUse || termsOfUseHtml) {
      return
    }

    const err = new Error('Terms of Use response contained empty HTML content')
    logger.error('Failed to fetch Terms of Use', err)
    setError(true)
    // using translation tools directly causes an infinite re render loop
    // pass in the translated strings to avoid this
    emitErrorModal(loadFailedTitle, loadFailedDescription, ensureAppError(err, AppEventCode.TERMS_OF_USE_LOAD_FAILED))
  }, [termsOfUse, termsOfUseHtml, logger, emitErrorModal, loadFailedTitle, loadFailedDescription])

  const controls = (
    <View style={{ width: '100%' }}>
      {/* SVG shadow (not a CSS/elevation shadow) so it composites over the native WebView the
          terms render in; ControlContainer below gives the opaque button bar the content scrolls under. */}
      <ContentShadow />
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
      </ControlContainer>
    </View>
  )

  if (!termsOfUse || !termsOfUseHtml) {
    return (
      <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
        <View style={styles.loadingContainer}>
          {error && !isLoading ? (
            <View style={{ width: '100%' }}>
              <ThemedText style={{ textAlign: 'center', flexShrink: 1, flexWrap: 'wrap' }}>
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
      scrollable={false}
      padded={false}
      controls={controls}
      scrollViewContainerStyle={styles.scrollContainer}
    >
      <WebViewContent html={termsOfUseHtml} onLoaded={() => setWebViewIsLoaded(true)} />
    </ScreenWrapper>
  )
}
