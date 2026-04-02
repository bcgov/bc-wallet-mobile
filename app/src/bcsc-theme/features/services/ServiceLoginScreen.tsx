import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl, hitSlop, REPORT_SUSPICIOUS_URL } from '@/constants'
import { isHandledAppError } from '@/errors/appError'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState, Mode } from '@/store'
import {
  Button,
  ButtonType,
  Link,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { usePairingService } from '../pairing'
import { LocalState, useServiceLoginState } from './hooks/useServiceLoginState'

type ServiceLoginScreenProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.ServiceLogin>

type ServiceLoginDefaultViewProps = {
  state: LocalState
  styles: ReturnType<typeof StyleSheet.create>
  ColorPalette: ReturnType<typeof useTheme>['ColorPalette']
  Spacing: ReturnType<typeof useTheme>['Spacing']
  t: (key: string, options?: Record<string, unknown>) => string
  onContinue: () => Promise<void>
  onCancel: () => void
  onOpenInfoShared: () => void
  onOpenPrivacyPolicy: () => void
}

type ServiceLoginUnavailableViewProps = {
  state: LocalState
  styles: ReturnType<typeof StyleSheet.create>
  ColorPalette: ReturnType<typeof useTheme>['ColorPalette']
  Spacing: ReturnType<typeof useTheme>['Spacing']
  t: (key: string, options?: Record<string, unknown>) => string
  logger: any
}

const RenderState = {
  Loading: 'Loading',
  Unavailable: 'Unavailable', // quick login in 'unavailable' so the links take the user out of the app
  Default: 'Default', // Quick login is available
} as const

const ServiceLoginLoadingView = () => (
  <SafeAreaView edges={['bottom']} style={{ flex: 1, justifyContent: 'center' }}>
    <ActivityIndicator size="large" />
  </SafeAreaView>
)

type DevicePreferenceURLViewProps = {
  serviceClientUri?: string
  ColorPalette: ReturnType<typeof useTheme>['ColorPalette']
  t: (key: string, options?: Record<string, unknown>) => string
  Spacing: ReturnType<typeof useTheme>['Spacing']
  isQuickLogin: boolean
}

const DevicePreferenceURLView: React.FC<DevicePreferenceURLViewProps> = ({
  serviceClientUri,
  ColorPalette,
  t,
  Spacing,
  isQuickLogin,
}: DevicePreferenceURLViewProps) =>
  serviceClientUri ? (
    <View style={{ marginTop: Spacing.lg }}>
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: ColorPalette.grayscale.lightGrey,
          marginBottom: Spacing.lg,
        }}
      />
      <ThemedText variant={'bold'}>{t('BCSC.Services.PreferOtherDevice')}</ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.Services.Goto')}</ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>
        {isQuickLogin ? (
          serviceClientUri
        ) : (
          <Link
            style={{ textAlign: 'center' }}
            linkText={serviceClientUri}
            testID={testIdWithKey('ServiceClientLink')}
            onPress={() => Linking.openURL(serviceClientUri)}
          />
        )}
      </ThemedText>
    </View>
  ) : null

type ReportSuspiciousLinkProps = {
  t: (key: string, options?: Record<string, unknown>) => string
  testID?: string
}

const ReportSuspiciousLink: React.FC<ReportSuspiciousLinkProps> = ({ t, testID }: ReportSuspiciousLinkProps) => (
  <ThemedText variant={'bold'}>
    {t('BCSC.Services.ReportSuspiciousPrefix')}{' '}
    <Link
      linkText={t('BCSC.Services.ReportSuspicious')}
      testID={testID}
      onPress={() => Linking.openURL(REPORT_SUSPICIOUS_URL)}
    />
  </ThemedText>
)

const ServiceLoginUnavailableView = ({
  state,
  styles,
  ColorPalette,
  t,
  logger,
  Spacing,
}: ServiceLoginUnavailableViewProps) => (
  <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'}>{state.serviceTitle}</ThemedText>
        <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginInstructions')}</ThemedText>
        <ThemedText style={styles.descriptionText}>{t('BCSC.Services.NoLoginProof')}</ThemedText>

        <TouchableOpacity
          testID={testIdWithKey('GoToServiceClient')}
          accessibilityLabel={a11yLabel(t('BCSC.Services.GotoService', { service: state.serviceTitle }))}
          accessibilityRole="link"
          hitSlop={hitSlop}
          onPress={async () => {
            if (!state.serviceClientUri) {
              logger.error('ServiceLoginScreen: No service client URI available for navigation')
              return
            }

            try {
              await Linking.openURL(state.serviceClientUri)
            } catch (error) {
              logger.error('ServiceLoginScreen: Failed to open service client URL', error as Error)
              Alert.alert(t('BCSC.Services.OpenUrlErrorTitle'), t('BCSC.Services.OpenUrlErrorMessage'))
            }
          }}
        >
          <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
            <ThemedText style={styles.infoHeader} ellipsizeMode="tail">
              {t('BCSC.Services.GotoService', { service: state.serviceTitle })}
            </ThemedText>
            <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
          </View>
        </TouchableOpacity>
        <DevicePreferenceURLView
          serviceClientUri={state.serviceClientUri}
          ColorPalette={ColorPalette}
          t={t}
          Spacing={Spacing}
          isQuickLogin={false}
        />
        <ReportSuspiciousLink t={t} testID={testIdWithKey('ReportSuspiciousLink')} />
      </View>
    </ScrollView>
  </SafeAreaView>
)

const ServiceLoginDefaultView = ({
  state,
  styles,
  ColorPalette,
  Spacing,
  t,
  onContinue,
  onCancel,
  onOpenInfoShared,
  onOpenPrivacyPolicy,
}: ServiceLoginDefaultViewProps) => {
  const lastPressRef = useRef(0)
  return (
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
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: Spacing.sm,
                }}
              >
                <ThemedText style={styles.infoHeader}>
                  {t('BCSC.Services.FromAccountPrefix')}
                  <ThemedText variant={'bold'} style={{ color: ColorPalette.brand.primary }}>
                    {' '}
                    {t('BCSC.Services.FromAccount')}
                  </ThemedText>
                </ThemedText>
                <TouchableOpacity
                  testID={testIdWithKey('HelpButton')}
                  accessibilityLabel={a11yLabel(t('BCSC.Screens.HelpCentre'))}
                  accessibilityRole="button"
                  hitSlop={hitSlop}
                  onPress={onOpenInfoShared}
                >
                  <Icon name="help-outline" size={24} color={ColorPalette.brand.primary} />
                </TouchableOpacity>
              </View>
              <ThemedText>{state.claimsDescription}</ThemedText>
            </View>

            {state.privacyPolicyUri ? (
              <TouchableOpacity
                testID={testIdWithKey('ReadPrivacyPolicy')}
                accessibilityLabel={a11yLabel(t('BCSC.Services.PrivacyNotice'))}
                accessibilityRole="link"
                hitSlop={hitSlop}
                onPress={onOpenPrivacyPolicy}
              >
                <View style={[styles.infoContainer, styles.privacyNoticeContainer]}>
                  <ThemedText style={styles.infoHeader}>{t('BCSC.Services.PrivacyNotice')}</ThemedText>
                  <Icon name="open-in-new" size={30} color={ColorPalette.brand.primary} />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.buttonsContainer}>
          <View style={styles.continueButtonContainer}>
            <Button
              title="Continue"
              accessibilityLabel={a11yLabel('Continue')}
              testID={testIdWithKey('ServiceLoginContinue')}
              buttonType={ButtonType.Primary}
              onPress={async () => {
                const now = Date.now()
                // debounce added to give time for navigation before allowing another button press
                if (now - lastPressRef.current < 1000) {
                  return
                }
                lastPressRef.current = now
                await onContinue()
              }}
            />
          </View>
          <Button
            title="Cancel"
            accessibilityLabel={a11yLabel('Cancel')}
            testID={testIdWithKey('ServiceLoginCancel')}
            buttonType={ButtonType.Secondary}
            onPress={onCancel}
          />
        </View>
        <DevicePreferenceURLView
          serviceClientUri={state.serviceClientUri}
          ColorPalette={ColorPalette}
          t={t}
          Spacing={Spacing}
          isQuickLogin={true}
        />
        <ReportSuspiciousLink t={t} testID={testIdWithKey('ReportSuspiciousLink')} />
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * Renders the service details screen component, which displays information about a specific serviceClient.
 *
 * @returns {*} {React.ReactElement} The service screen component or null if not implemented.
 */
export const ServiceLoginScreen: React.FC<ServiceLoginScreenProps> = ({
  navigation,
  route,
}: ServiceLoginScreenProps) => {
  const { serviceClientId, serviceTitle, pairingCode, fromAppSwitch } = route.params ?? {}
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const alerts = useAlerts(navigation)
  const pairingService = usePairingService()
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
      marginTop: Spacing.lg,
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

  /**
   * Handles navigation to login by pairing code flow
   * If successful, navigates to the pairing confirmation screen
   * If unsuccessful, displays an error alert
   *
   */
  const onContinueWithPairingCode = useCallback(async () => {
    const code = state.pairingCode
    if (!code) {
      logger.error('ServiceLoginScreen: No pairing code found in state')
      return
    }

    try {
      const client = await pairing.loginByPairingCode(code)

      navigation.navigate(BCSCScreens.PairingConfirmation, {
        serviceId: client.client_ref_id,
        serviceName: client.client_name,
        fromAppSwitch,
      })
    } catch (error) {
      logger.error('ServiceLoginScreen: Error logging in by pairing code', error as Error)
      if (!isHandledAppError(error)) {
        alerts.loginServerErrorAlert()
      }
    }
  }, [state.pairingCode, pairing, navigation, logger, alerts, fromAppSwitch])

  /**
   * Handles quick login and navigation
   * If successful, opens the quick login URL and navigates to the home screen
   * If unsuccessful, displays an error alert
   *
   */
  const onContinueWithQuickLoginUrl = useCallback(async () => {
    if (!state.service) {
      logger.error('ServiceLoginScreen: No service context available for quick login')
      alerts.loginServerErrorAlert()
      return
    }

    const result = await getQuickLoginURL(state.service)

    if (result.success) {
      logger.debug('ServiceLoginScreen: Generated quick login URL successfully, opening URL')

      try {
        await Linking.openURL(result.url)
        navigation.reset({
          index: 0,
          routes: [{ name: BCSCStacks.Tab, params: { screen: BCSCScreens.Home } }],
        })
        return
      } catch (error) {
        logger.error('ServiceLoginScreen: Failed to open quick login URL', error as Error)
        Alert.alert(t('BCSC.Services.OpenUrlErrorTitle'), t('BCSC.Services.OpenUrlErrorMessage'))
        return
      }
    }

    if ('error' in result) {
      logger.debug(`ServiceLoginScreen: Error generating quick login URL ${result.error}`)
      alerts.loginServerErrorAlert()
    }
  }, [getQuickLoginURL, logger, state.service, navigation, alerts, t])

  const onContinue = useCallback(async () => {
    if (state.pairingCode) {
      await onContinueWithPairingCode()
    } else if (state.service) {
      await onContinueWithQuickLoginUrl()
    } else {
      logger.error('ServiceLoginScreen: No authentication method available')
      alerts.loginServerErrorAlert()
    }
  }, [logger, onContinueWithPairingCode, onContinueWithQuickLoginUrl, state.service, state.pairingCode, alerts])

  const onOpenInfoShared = useCallback(() => {
    try {
      navigation.navigate(BCSCScreens.MainWebView, {
        url: HelpCentreUrl.INFO_SHARED,
        title: t('BCSC.Screens.HelpCentre'),
      })
    } catch (error) {
      logger.error('ServiceLoginScreen: Error navigating to info shared help page', error as Error)
    }
  }, [navigation, t, logger])

  const onOpenPrivacyPolicy = useCallback(async () => {
    if (!state.privacyPolicyUri) {
      return
    }
    try {
      await Linking.openURL(state.privacyPolicyUri)
    } catch (error) {
      logger.error('ServiceLoginScreen: Error opening privacy policy URL', error as Error)
      Alert.alert(t('BCSC.Services.OpenUrlErrorTitle'), t('BCSC.Services.OpenUrlErrorMessage'))
    }
  }, [state.privacyPolicyUri, logger, t])

  const onCancel = useCallback(() => {
    // For cold start pairing, clear the pending pairing so RootStack switches stacks
    if (pairingService.hasPendingPairing) {
      pairingService.consumePendingPairing()
      return
    }

    // If the app already has history, go back
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    // No pending pairing and no back stack (e.g., pairing navigated directly onto main stack)
    navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })
    logger.info('ServiceLoginScreen: Cancel pressed without history, redirecting to Home tab')
  }, [logger, navigation, pairingService])

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
        <ServiceLoginUnavailableView
          state={state}
          styles={styles}
          ColorPalette={ColorPalette}
          t={t}
          logger={logger}
          Spacing={Spacing}
        />
      )
    default:
      return (
        <ServiceLoginDefaultView
          state={state}
          styles={styles}
          ColorPalette={ColorPalette}
          Spacing={Spacing}
          t={t}
          onContinue={onContinue}
          onCancel={onCancel}
          onOpenInfoShared={onOpenInfoShared}
          onOpenPrivacyPolicy={onOpenPrivacyPolicy}
        />
      )
  }
}
