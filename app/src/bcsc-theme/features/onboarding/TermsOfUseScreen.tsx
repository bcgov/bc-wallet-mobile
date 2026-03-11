import useApi from '@/bcsc-theme/api/hooks/useApi'
import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
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
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'
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
  const { Spacing, ColorPalette } = useTheme()
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
          accessibilityLabel={t('Init.Retry')}
          disabled={isLoading}
        />
      ) : (
        <Button
          title={t('BCSC.Onboarding.AcceptAndContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={async () => {
            const status = await PushNotifications.status()

            // if permission is granted, skip notification screen
            if (status === PushNotifications.NotificationPermissionStatus.GRANTED) {
              return navigation.navigate(BCSCScreens.OnboardingSecureApp)
            }

            navigation.navigate(BCSCScreens.OnboardingNotifications)
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={t('BCSC.Onboarding.AcceptAndContinueButton')}
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
