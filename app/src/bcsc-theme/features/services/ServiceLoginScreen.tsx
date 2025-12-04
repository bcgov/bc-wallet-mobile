import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState, Mode } from '@/store'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ButtonType, testIdWithKey } from '@bifold/core'
import { TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { LocalState, useServiceLoginState } from './hooks/useServiceLoginState'

type ServiceLoginScreenProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.ServiceLogin>

const RenderState = {
  Loading: 1,
  Unavailable: 2,
  Default: 3,
} as const

const ServiceLoginLoadingView = () => (
  <SafeAreaView edges={['bottom']} style={{ flex: 1, justifyContent: 'center' }}>
    <ActivityIndicator size="large" />
  </SafeAreaView>
)

type ServiceLoginUnavailableViewProps = {
  state: LocalState
  styles: ReturnType<typeof StyleSheet.create>
  ColorPalette: ReturnType<typeof useTheme>['ColorPalette']
  t: (key: string) => string
  logger: any
}

const ServiceLoginUnavailableView = ({ state, styles, ColorPalette, t, logger }: ServiceLoginUnavailableViewProps) => (
  <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'}>{state.serviceTitle}</ThemedText>
        <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginInstructions')}</ThemedText>
        <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginProof')}</ThemedText>

        <TouchableOpacity
          onPress={() => {
            if (!state.serviceClientUri) {
              logger.error('ServiceLoginScreen: No service client URI available for navigation')
              return
            }

            Linking.openURL(state.serviceClientUri)
          }}
        >
          <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
            <ThemedText style={styles.infoHeader} ellipsizeMode="tail">
              {t('BCSC.Services.Goto')} {state.serviceTitle}
            </ThemedText>
            <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
          </View>
        </TouchableOpacity>

        <ThemedText variant={'bold'}>
          {t('BCSC.Services.ReportSuspiciousPrefix')} <ThemedText>{t('BCSC.Services.ReportSuspicious')}</ThemedText>
        </ThemedText>
      </View>
    </ScrollView>
  </SafeAreaView>
)

type ServiceLoginDefaultViewProps = {
  state: LocalState
  styles: ReturnType<typeof StyleSheet.create>
  ColorPalette: ReturnType<typeof useTheme>['ColorPalette']
  Spacing: ReturnType<typeof useTheme>['Spacing']
  t: (key: string) => string
  logger: any
  navigation: ServiceLoginScreenProps['navigation']
  onContinue: () => Promise<void>
}

const ServiceLoginDefaultView = ({
  state,
  styles,
  ColorPalette,
  Spacing,
  t,
  logger,
  navigation,
  onContinue,
}: ServiceLoginDefaultViewProps) => (
  <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal' }}>
          {`${t('BCSC.Services.WantToLogin')}\n`}
          <ThemedText variant={'headingThree'}>{state.serviceTitle}?</ThemedText>
        </ThemedText>

        <ThemedText style={styles.descriptionText}>{t('BCSC.Services.RequestedInformation')}</ThemedText>

        <View style={styles.cardsContainer}>
          <View style={styles.infoContainer}>
            <ThemedText style={[styles.infoHeader, { marginBottom: Spacing.sm }]}>
              {t('BCSC.Services.FromAccountPrefix')}
              <ThemedText variant={'bold'} style={{ color: ColorPalette.brand.primary }}>
                {' '}
                {t('BCSC.Services.FromAccount')}
              </ThemedText>
            </ThemedText>
            <ThemedText>{state.claimsDescription}</ThemedText>
          </View>

          {state.privacyPolicyUri ? (
            <TouchableOpacity
              onPress={() => {
                try {
                  navigation.navigate(BCSCScreens.MainWebView, {
                    url: state.privacyPolicyUri!,
                    title: t('BCSC.Services.PrivacyPolicy'),
                  })
                } catch (error) {
                  logger.error(
                    `ServiceLoginScreen: Error navigating to the service client privacy policy webview: ${error}`
                  )
                }
              }}
            >
              <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
                <ThemedText style={styles.infoHeader}>{t('BCSC.Services.PrivacyNotice')}</ThemedText>
                <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <ThemedText variant={'bold'}>
          {t('BCSC.Services.ReportSuspiciousPrefix')} <ThemedText>{t('BCSC.Services.ReportSuspicious')}</ThemedText>
        </ThemedText>
      </View>
      <View style={styles.buttonsContainer}>
        <View style={styles.continueButtonContainer}>
          <Button
            title="Continue"
            accessibilityLabel={'Continue'}
            testID={testIdWithKey('ServiceLoginContinue')}
            buttonType={ButtonType.Primary}
            onPress={onContinue}
          />
        </View>
        <Button
          title="Cancel"
          accessibilityLabel={'Cancel'}
          testID={testIdWithKey('ServiceLoginCancel')}
          buttonType={ButtonType.Tertiary}
          onPress={() => {
            navigation.goBack()
          }}
        />
      </View>
    </ScrollView>
  </SafeAreaView>
)

/**
 * Renders the service details screen component, which displays information about a specific serviceClient.
 *
 * @returns {*} {JSX.Element} The service screen component or null if not implemented.
 */
export const ServiceLoginScreen: React.FC<ServiceLoginScreenProps> = ({
  navigation,
  route,
}: ServiceLoginScreenProps) => {
  const { serviceClient, serviceTitle, pairingCode } = route.params ?? {}
  const serviceClientId = serviceClient?.client_ref_id
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isBCSCMode = store.mode === Mode.BCSC // isDarkMode? or isBCSCMode?
  const { pairing, metadata } = useApi()
  const getQuickLoginURL = useQuickLoginURL()
  const { state, isLoading, serviceHydrated } = useServiceLoginState({
    serviceClientId,
    serviceTitle,
    pairingCode,
    metadata,
    logger,
  })

  const styles = StyleSheet.create({
    screenContainer: {
      flexGrow: 1,
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    cardsContainer: {
      gap: Spacing.md,
    },
    descriptionText: {
      lineHeight: 30,
    },
    continueButtonContainer: {
      marginBottom: 10,
    },
    contentContainer: {
      flex: 1,
      gap: Spacing.md,
    },
    buttonsContainer: {
      marginTop: 'auto',
    },
    infoContainer: {
      display: 'flex',
      overflow: 'hidden',
      gap: Spacing.md,
      borderRadius: Spacing.sm,
      borderColor: isBCSCMode ? '#1E5189' : '#D8D8D8',
      borderWidth: 1,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      padding: Spacing.md,
    },
    infoHeader: {
      flexShrink: 1,
      fontSize: TextTheme.headerTitle.fontSize,
      color: ColorPalette.brand.primary,
    },
    infoIcon: {
      flexShrink: 0,
    },
    privacyNoticeContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    link: {
      color: ColorPalette.brand.primary,
    },
  })

  const onContinueWithPairingCode = useCallback(async () => {
    const code = state.pairingCode
    if (!code) {
      logger.error('ServiceLoginScreen: No pairing code found in state')
      return
    }

    try {
      await pairing.loginByPairingCode(code)
    } catch (error) {
      logger.error('ServiceLoginScreen: Error logging in by pairing code', error as Error)
      Alert.alert(t('BCSC.Services.LoginErrorTitle'), (error as Error).message)
    }
  }, [state.pairingCode, pairing, logger, t])

  const onContinueWithQuickLoginUrl = useCallback(async () => {
    if (!state.service) {
      logger.error('ServiceLoginScreen: No service context available for quick login')
      Alert.alert(t('BCSC.Services.LoginErrorTitle'), t('BCSC.Services.LoginErrorMessage'))
      return
    }

    const result = await getQuickLoginURL(state.service)

    if (result.success && result.url) {
      Linking.openURL(result.url)
      return
    }

    Alert.alert(t('BCSC.Services.LoginErrorTitle'), result.error)
  }, [getQuickLoginURL, logger, state.service, t])

  const onContinue = useCallback(async () => {
    if (state.pairingCode) {
      await onContinueWithPairingCode()
    } else if (state.authenticationUrl) {
      await onContinueWithQuickLoginUrl()
    } else {
      logger.error('ServiceLoginScreen: No authentication method available')
      Alert.alert(t('BCSC.Services.LoginErrorTitle'), t('BCSC.Services.LoginErrorMessage'))
    }
  }, [logger, onContinueWithPairingCode, onContinueWithQuickLoginUrl, state.authenticationUrl, state.pairingCode, t])

  const renderState = (() => {
    if (isLoading || !serviceHydrated) {
      return RenderState.Loading
    }

    if (!state.serviceInitiateLoginUri && !state.pairingCode) {
      return RenderState.Unavailable
    }

    return RenderState.Default
  })()

  switch (renderState) {
    case RenderState.Loading:
      return <ServiceLoginLoadingView />
    case RenderState.Unavailable:
      return (
        <ServiceLoginUnavailableView state={state} styles={styles} ColorPalette={ColorPalette} t={t} logger={logger} />
      )
    default:
      return (
        <ServiceLoginDefaultView
          state={state}
          styles={styles}
          ColorPalette={ColorPalette}
          Spacing={Spacing}
          t={t}
          logger={logger}
          navigation={navigation}
          onContinue={onContinue}
        />
      )
  }
}
