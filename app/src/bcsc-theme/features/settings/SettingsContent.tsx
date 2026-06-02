import { ListButton, ListButtonGroup } from '@/bcsc-theme/components/ListButton'
import { BCSCIdTokenContext } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { toAppError } from '@/bcsc-theme/utils/native-error-map'
import { PressableOpacity } from '@/components/PressableOpacity'
import { ACCESSIBILITY_URL, DEFAULT_AUTO_LOCK_TIME_MIN, FEEDBACK_URL, hitSlop, TERMS_OF_USE_URL } from '@/constants'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { BCDispatchAction, BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import {
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useDeveloperMode,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import React, { ReactNode, useCallback, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableWithoutFeedback, Vibration, View } from 'react-native'
import { AccountSecurityMethod, getAccountSecurityMethod } from 'react-native-bcsc-core'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface SettingsContentProps {
  onContactUs: () => void
  onHelp: () => void
  onPrivacy: () => void
  onPressDeveloperMode: () => void
  onEditNickname?: () => void
  onAccountDetails?: () => void
  onContacts?: () => void
  onForgetAllPairings?: () => void
  onAutoLock?: () => void
  onAppSecurity?: () => void
  onChangePIN?: () => void
  onResetWallet?: () => void
  onRemoveAccount?: () => void
  onScanMyQR?: () => void
  onSendProofRequest?: () => void
  onAddDevice?: () => void
  onMyDevices?: () => void
  // TODO (bm): stubs
  onNotifications?: () => void
}

type SectionStyles = ReturnType<typeof makeStyles>

const SectionHeader: React.FC<{
  title: string
  iconName: string
  styles: SectionStyles
}> = ({ title, iconName, styles }) => {
  const { TextTheme } = useTheme()
  return (
    <View style={styles.sectionHeader}>
      <Icon name={iconName} size={22} color={TextTheme.bold.color} />
      <ThemedText variant="bold" style={styles.sectionHeaderText}>
        {title}
      </ThemedText>
    </View>
  )
}

const Row: React.FC<{
  title: string
  endAdornment?: string
  textColor?: string
  startAdornment?: ReactNode
}> = ({ title, endAdornment, textColor, startAdornment }) => {
  const { ColorPalette, Spacing } = useTheme()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    title: {
      flex: 1,
      color: textColor ?? ColorPalette.brand.headerText,
    },
    end: {
      fontWeight: 'bold',
      color: ColorPalette.brand.primary,
    },
  })
  return (
    <View style={styles.container}>
      {startAdornment}
      <ThemedText style={styles.title}>{title}</ThemedText>
      {endAdornment ? <ThemedText style={styles.end}>{endAdornment}</ThemedText> : null}
    </View>
  )
}

interface AuthenticatedSectionProps {
  styles: SectionStyles
  accountSecurityMethod: AccountSecurityMethod | undefined
  onAppSecurity?: () => void
  onChangePIN?: () => void
  onEditNickname?: () => void
  onAccountDetails?: () => void
  onAutoLock?: () => void
  onForgetAllPairings?: () => void
  onResetWallet?: () => void
  onContacts?: () => void
  onScanMyQR?: () => void
  onSendProofRequest?: () => void
  onNotifications?: () => void
  onAddDevice?: () => void
  onMyDevices?: () => void
  onPressOptInAnalytics: () => void | Promise<void>
  onPressRemoveAccount?: () => void
}

const AuthenticatedSection: React.FC<AuthenticatedSectionProps> = ({
  styles,
  accountSecurityMethod,
  onAppSecurity,
  onChangePIN,
  onEditNickname,
  onAccountDetails,
  onAutoLock,
  onForgetAllPairings,
  onResetWallet,
  onContacts,
  onScanMyQR,
  onSendProofRequest,
  onNotifications,
  onAddDevice,
  onMyDevices,
  onPressOptInAnalytics,
  onPressRemoveAccount,
}) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const [store] = useStore<BCState>()
  // useContext (not useIdToken) so we don't throw when the BCSCIdTokenProvider
  // isn't mounted — settings is reachable before verification completes.
  const deviceCount = useContext(BCSCIdTokenContext)?.data?.bcsc_devices_count
  const isVerified = store.bcscSecure.verified

  const showChangePIN = accountSecurityMethod !== AccountSecurityMethod.DeviceAuth && onChangePIN
  const analyticsOptInText = store.bcsc.analyticsOptIn ? 'ON' : 'OFF'
  const autoLockTimeText = `${store.preferences.autoLockTime ?? DEFAULT_AUTO_LOCK_TIME_MIN} min`
  const profileName = store.bcsc.selectedNickname?.trim() || t('BCSC.Title')

  const noop = () => {
    // TODO: wire to real handler once the destination screen exists
  }

  return (
    <>
      {store.bcscSecure.verified ? (
        <View style={styles.sectionContainer}>
          <View style={styles.profileCard}>
            <PressableOpacity
              style={styles.profileMain}
              onPress={onAccountDetails ?? noop}
              accessibilityRole="button"
              accessibilityLabel={profileName}
              testID={testIdWithKey('Profile')}
            >
              <Icon name="account" size={24} color={ColorPalette.brand.primary} />
              <ThemedText variant="bold" style={styles.profileName}>
                {profileName}
              </ThemedText>
            </PressableOpacity>
            {onEditNickname ? (
              <PressableOpacity
                onPress={onEditNickname}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={t('BCSC.Settings.EditNickname')}
                testID={testIdWithKey('EditProfile')}
              >
                <Icon name="pencil" size={20} color={ColorPalette.brand.primary} />
              </PressableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <SectionHeader title={t('BCSC.Settings.Features.Header')} iconName="bullhorn-outline" styles={styles} />
      <View style={styles.sectionContainer}>
        <ListButtonGroup>
          {[
            onContacts ? (
              <ListButton key="contacts" onPress={onContacts} testID={testIdWithKey('Contacts')}>
                {t('BCSC.Settings.Features.Contacts')}
              </ListButton>
            ) : null,
            <ListButton key="scanqr" onPress={onScanMyQR ?? noop} testID={testIdWithKey('ScanQR')}>
              {t('BCSC.Settings.Features.ScanQR')}
            </ListButton>,
            <ListButton key="proof" onPress={onSendProofRequest ?? noop} testID={testIdWithKey('SendProofRequest')}>
              {t('BCSC.Settings.Features.SendProofRequest')}
            </ListButton>,
          ]}
        </ListButtonGroup>
      </View>

      <SectionHeader title={t('BCSC.Settings.HeaderA')} iconName="cog-outline" styles={styles} />
      <View style={styles.sectionContainer}>
        <ListButtonGroup>
          {[
            onAppSecurity ? (
              <ListButton key="security" onPress={onAppSecurity} testID={testIdWithKey('AppSecurity')}>
                {t('BCSC.Settings.AppSecurity.ChangeAppSecurity')}
              </ListButton>
            ) : null,
            showChangePIN ? (
              <ListButton key="pin" onPress={onChangePIN!} testID={testIdWithKey('ChangePIN')}>
                {t('BCSC.Settings.ChangePIN.ButtonTitle')}
              </ListButton>
            ) : null,
            onAutoLock ? (
              <ListButton key="lock" onPress={onAutoLock} testID={testIdWithKey('AutoLock')}>
                <Row title={t('BCSC.Settings.AutoLockTime')} endAdornment={autoLockTimeText} />
              </ListButton>
            ) : null,
            <ListButton key="notifications" onPress={onNotifications ?? noop} testID={testIdWithKey('Notifications')}>
              {t('BCSC.Settings.Notifications')}
            </ListButton>,
            <ListButton key="analytics" onPress={onPressOptInAnalytics} testID={testIdWithKey('AnalyticsOptIn')}>
              <Row title={t('BCSC.Settings.AnalyticsOptIn')} endAdornment={analyticsOptInText} />
            </ListButton>,
            isVerified ? (
              <ListButton key="adddevice" onPress={onAddDevice ?? noop} testID={testIdWithKey('AddDevice')}>
                {t('BCSC.Settings.AddDevice')}
              </ListButton>
            ) : null,
            isVerified ? (
              <ListButton key="mydevices" onPress={onMyDevices ?? noop} testID={testIdWithKey('MyDevices')}>
                <Row
                  title={t('BCSC.Settings.MyDevices')}
                  endAdornment={deviceCount ? t('BCSC.Settings.MyDevicesCount', { count: deviceCount }) : undefined}
                />
              </ListButton>
            ) : null,
            isVerified && onForgetAllPairings ? (
              <ListButton key="forget" onPress={onForgetAllPairings} testID={testIdWithKey('ForgetPairings')}>
                {t('BCSC.Settings.ForgetPairings')}
              </ListButton>
            ) : null,
            onResetWallet ? (
              <ListButton key="reset" onPress={onResetWallet} testID={testIdWithKey('ResetWallet')}>
                <Row title={t('BCSC.Settings.ResetWallet')} />
              </ListButton>
            ) : null,
            onPressRemoveAccount ? (
              <ListButton key="remove" onPress={onPressRemoveAccount} testID={testIdWithKey('RemoveAccount')}>
                <Row title={t('BCSC.Settings.RemoveAccount')} />
              </ListButton>
            ) : null,
          ]}
        </ListButtonGroup>
      </View>
    </>
  )
}

const makeStyles = (
  Spacing: { lg: number; md: number; sm: number; xs: number },
  ColorPalette: { brand: { tertiaryBackground: string; headerText: string } }
) =>
  StyleSheet.create({
    container: {
      padding: Spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
    },
    sectionHeaderText: {
      flexShrink: 1,
    },
    sectionContainer: {
      gap: Spacing.xs / 2,
      borderRadius: Spacing.sm,
      overflow: 'hidden',
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.tertiaryBackground,
      borderRadius: Spacing.sm,
    },
    profileMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    profileName: {
      flexShrink: 1,
      color: ColorPalette.brand.headerText,
    },
    versionContainer: {
      paddingTop: Spacing.md,
      gap: Spacing.xs,
    },
  })

/**
 * Shared settings content component that can be used across different navigation stacks.
 * Receives navigation callbacks as props to handle stack-specific navigation.
 */
export const SettingsContent: React.FC<SettingsContentProps> = ({
  onContactUs,
  onHelp,
  onPrivacy,
  onPressDeveloperMode,
  onEditNickname,
  onAccountDetails,
  onForgetAllPairings,
  onAutoLock,
  onAppSecurity,
  onChangePIN,
  onResetWallet,
  onRemoveAccount,
  onContacts,
  onScanMyQR,
  onSendProofRequest,
  onNotifications,
  onAddDevice,
  onMyDevices,
}) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [accountSecurityMethod, setAccountSecurityMethod] = useState<AccountSecurityMethod>()

  const styles = makeStyles(Spacing, ColorPalette)

  const onDevModeTriggered = () => {
    Vibration.vibrate()
    onPressDeveloperMode()
  }
  const { incrementDeveloperMenuCounter } = useDeveloperMode(onDevModeTriggered)

  useFocusEffect(
    useCallback(() => {
      const fetchAccountSecurityMethod = async () => {
        try {
          const method = await getAccountSecurityMethod()
          setAccountSecurityMethod(method)
        } catch (error) {
          const appError = toAppError(error, ErrorRegistry.DEVICE_AUTHORIZATION_ERROR)
          logger.error(`Error fetching app security method [${appError.appEvent}]`, appError)
        }
      }
      fetchAccountSecurityMethod()
    }, [logger])
  )

  const onPressTermsOfUse = async () => {
    try {
      await Linking.openURL(TERMS_OF_USE_URL)
    } catch (error) {
      logger.error('Error opening Terms of Use URL', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const onPressFeedback = async () => {
    try {
      await Linking.openURL(FEEDBACK_URL)
    } catch (error) {
      logger.error('Error opening Feedback URL', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const onPressAccessibility = async () => {
    try {
      await Linking.openURL(ACCESSIBILITY_URL)
    } catch (error) {
      logger.error('Error opening Accessibility URL', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const onPressOptInAnalytics = async () => {
    if (store.bcsc.analyticsOptIn) {
      Analytics.stopTracking()
      dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [false] })
      return
    }

    try {
      await Analytics.initializeTracker(store.developer.environment.analyticsAppId)
      dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [true] })
    } catch (error) {
      logger.error(
        'Failed to initialize analytics tracker on opt-in',
        {
          file: 'SettingsContent.tsx',
        },
        error as Error
      )
    }
  }

  const isAuthenticated = store.authentication.didAuthenticate

  return (
    <ScreenWrapper padded={false} scrollViewContainerStyle={styles.container}>
      {isAuthenticated ? (
        <AuthenticatedSection
          styles={styles}
          accountSecurityMethod={accountSecurityMethod}
          onAppSecurity={onAppSecurity}
          onChangePIN={onChangePIN}
          onEditNickname={onEditNickname}
          onAccountDetails={onAccountDetails}
          onAutoLock={onAutoLock}
          onForgetAllPairings={onForgetAllPairings}
          onResetWallet={onResetWallet}
          onPressOptInAnalytics={onPressOptInAnalytics}
          onPressRemoveAccount={onRemoveAccount}
          onContacts={onContacts}
          onScanMyQR={onScanMyQR}
          onSendProofRequest={onSendProofRequest}
          onNotifications={onNotifications}
          onAddDevice={onAddDevice}
          onMyDevices={onMyDevices}
        />
      ) : null}

      <SectionHeader title={t('BCSC.Settings.HelpHeader')} iconName="help-circle-outline" styles={styles} />
      <View style={styles.sectionContainer}>
        <ListButtonGroup>
          <ListButton onPress={onHelp} testID={testIdWithKey('Help')}>
            {t('BCSC.Settings.HelpUsingApp')}
          </ListButton>
          <ListButton onPress={onContactUs} testID={testIdWithKey('ContactUs')}>
            {t('BCSC.Settings.ContactUs')}
          </ListButton>
          <ListButton
            onPress={onPressFeedback}
            testID={testIdWithKey('Feedback')}
            accessibilityHint={t('Global.A11y.OpensInBrowser')}
          >
            {t('BCSC.Settings.GiveFeedback')}
          </ListButton>
        </ListButtonGroup>
      </View>

      <SectionHeader title={t('BCSC.Settings.MoreInfoHeader')} iconName="information-outline" styles={styles} />
      <View style={styles.sectionContainer}>
        <ListButtonGroup>
          <ListButton
            onPress={onPressAccessibility}
            testID={testIdWithKey('Accessibility')}
            accessibilityHint={t('Global.A11y.OpensInBrowser')}
          >
            {t('BCSC.Settings.Accessibility')}
          </ListButton>
          <ListButton
            onPress={onPressTermsOfUse}
            testID={testIdWithKey('TermsOfUse')}
            accessibilityHint={t('Global.A11y.OpensInBrowser')}
          >
            {t('BCSC.Settings.TermsOfUse')}
          </ListButton>
          <ListButton onPress={onPrivacy} testID={testIdWithKey('Privacy')}>
            {t('BCSC.Settings.Privacy')}
          </ListButton>
          {store.preferences.developerModeEnabled ? (
            <ListButton key="dev" onPress={onPressDeveloperMode} testID={testIdWithKey('DeveloperMode')}>
              {t('BCSC.Settings.DeveloperOptions')}
            </ListButton>
          ) : null}
        </ListButtonGroup>
      </View>

      <View style={styles.versionContainer}>
        <TouchableWithoutFeedback
          onPress={incrementDeveloperMenuCounter}
          disabled={store.preferences.developerModeEnabled}
          accessible={false}
        >
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="labelSubtitle">{t('BCSC.Title')}</ThemedText>
            <ThemedText variant="labelSubtitle">{`Version ${getVersion()} (${getBuildNumber()})`}</ThemedText>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </ScreenWrapper>
  )
}
