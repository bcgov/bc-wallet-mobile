import type { BCSCEndpoints } from '@/bcsc-theme/api/client'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { TOKENS, useServices, useTheme } from '@bifold/core'
import { getUserAgentString } from '@utils/user-agent'
import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Linking, StyleSheet, useWindowDimensions, View } from 'react-native'
import { WebView } from 'react-native-webview'
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview/lib/WebViewTypes'

interface WebViewUrlSource {
  /** The URL to load in the WebView. */
  url: string
  html?: never
}

interface WebViewHtmlSource {
  /** Raw HTML content to render in the WebView. */
  html: string
  url?: never
}

type WebViewContentProps = (WebViewUrlSource | WebViewHtmlSource) & {
  /**
   * Optional callback function that is called when the WebView has finished loading.
   * Loading test url: 'https://httpbin.org/delay/2'
   *
   * @type {() => void}
   */
  onLoaded?: () => void
}

/** The endpoint itself or a path below it; a bare prefix test would also match `/accountant`. */
const isUnder = (url: string, endpoint: string): boolean => {
  const base = endpoint.replace(/\/$/, '')
  return url === base || ['/', '?', '#'].some((delimiter) => url.startsWith(base + delimiter))
}

/** Only the IAS account pages take the bearer; help-centre and privacy pages are public and must not receive it. */
const isBearerProtectedUrl = (url: string, endpoints: BCSCEndpoints): boolean =>
  isUnder(url, endpoints.account) || isUnder(url, endpoints.accountDevices)

/** Query strings are dropped so a redirect target's parameters never land in a problem report. */
const reportableUrl = (url?: string): string | undefined => url?.split('?')[0]

/** What the WebView can render itself; tel:, mailto: and app schemes belong to another app. */
const isWebSchemeUrl = (url: string): boolean => /^(https?|about):/i.test(url)

/**
 * A WebView component that loads a given URL or renders HTML content.
 * Automatically applies accessibility font scaling based on device settings.
 *
 * @param {WebViewContentProps} props - The component props.
 * @returns {*} {React.ReactElement} The rendered WebView component.
 */
const WebViewContent: React.FC<WebViewContentProps> = ({ url, html, onLoaded }) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitErrorModal } = useErrorAlert()
  const { fontScale } = useWindowDimensions()
  const needsBearer = Boolean(url) && isBearerProtectedUrl(url!, client.endpoints)
  // Set by the one-shot 401 recovery: forces the next token fetch and is reported if that fetch fails too.
  const rejectedStatus = useRef<number | undefined>(undefined)

  const styles = StyleSheet.create({
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: ColorPalette.brand.primaryBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  const loading = (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size={'large'} />
    </View>
  )

  const showPageUnavailable = useCallback(
    (error: unknown, context: Record<string, unknown>) => {
      const appError = ensureAppError(error, AppEventCode.WEBVIEW_HTTP_ERROR)
      appError.addContext(context)
      emitErrorModal(t('Alerts.WebViewHttpError.Title'), t('Alerts.WebViewHttpError.Description'), appError)
    },
    [emitErrorModal, t]
  )

  // Bearer pages load only once a valid token is in hand instead of whatever the cache holds.
  const {
    data: accessToken,
    error: accessTokenError,
    isLoading: isLoadingAccessToken,
    load: loadAccessToken,
    refresh: refreshAccessToken,
  } = useDataLoader(() => client.getAccessToken({ forceRefresh: rejectedStatus.current !== undefined }), {
    onError: (error) => {
      logger.error('WebView: no access token for a bearer-protected page', error as Error)
      showPageUnavailable(error, {
        url: reportableUrl(url),
        ...(rejectedStatus.current === undefined ? {} : { statusCode: rejectedStatus.current }),
      })
    },
  })

  useEffect(() => {
    if (needsBearer) {
      loadAccessToken()
    }
  }, [needsBearer, loadAccessToken])

  const handleError = useCallback(
    (syntheticEvent: WebViewErrorEvent) => {
      const { nativeEvent } = syntheticEvent
      logger.error('WebView Error:', { ...nativeEvent })
      const appError = ensureAppError(new Error(nativeEvent.description), AppEventCode.WEBVIEW_LOAD_FAILED)
      appError.addContext({ url: reportableUrl(nativeEvent.url) })
      emitErrorModal(t('Alerts.WebViewLoadFailed.Title'), t('Alerts.WebViewLoadFailed.Description'), appError)
    },
    [logger, emitErrorModal, t]
  )

  const handleHttpError = useCallback(
    (syntheticEvent: WebViewHttpErrorEvent) => {
      const { nativeEvent } = syntheticEvent
      logger.error('WebView HTTP Error:', {
        url: nativeEvent.url,
        statusCode: nativeEvent.statusCode,
        description: nativeEvent.description,
      })

      // Same recovery as the API client: a locally valid token the server rejects gets one refresh + reload.
      if (nativeEvent.statusCode === 401 && needsBearer && rejectedStatus.current === undefined) {
        rejectedStatus.current = nativeEvent.statusCode
        logger.info('WebView: access token rejected (401); refreshing tokens and reloading once')
        refreshAccessToken()
        return
      }

      // iOS reports no description, so don't leave a dangling separator behind the status code.
      const message = [nativeEvent.statusCode, nativeEvent.description].filter(Boolean).join(': ')
      showPageUnavailable(new Error(message), {
        url: reportableUrl(nativeEvent.url),
        statusCode: nativeEvent.statusCode,
      })
    },
    [logger, needsBearer, refreshAccessToken, showPageUnavailable]
  )

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      if (isWebSchemeUrl(request.url)) {
        return true
      }

      // openURL needs no LSApplicationQueriesSchemes entry, unlike the library's own canOpenURL hand-off.
      const openInOtherApp = async () => {
        try {
          await Linking.openURL(request.url)
        } catch (error) {
          logger.error(`WebView: could not hand a ${request.url.split(':')[0]}: link to another app`, error as Error)
        }
      }
      void openInOtherApp()
      return false
    },
    [logger]
  )

  if (!html && !url) {
    logger.error('WebViewContent: Neither url nor html provided')
    return loading
  }

  // Also covers a refresh in flight or a failed one, so a rejected token is never sent again.
  if (needsBearer && (isLoadingAccessToken || !accessToken || accessTokenError)) {
    return loading
  }

  const source = html
    ? { html, baseUrl: '' }
    : { uri: url!, ...(needsBearer ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}) }

  return (
    <WebView
      source={source}
      startInLoadingState={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsBackForwardNavigationGestures={true}
      bounces={false}
      style={{ backgroundColor: ColorPalette.brand.primaryBackground }}
      renderLoading={() => loading}
      onError={handleError}
      onHttpError={handleHttpError}
      // Everything passes the whitelist so handleShouldStartLoad is the single place that decides.
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      mixedContentMode="compatibility"
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
      userAgent={getUserAgentString()}
      textZoom={Math.round(fontScale * 100)}
      onLoad={onLoaded}
    />
  )
}

export { WebViewContent }
