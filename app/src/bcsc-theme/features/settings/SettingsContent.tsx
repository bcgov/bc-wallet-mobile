import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { ACCESSIBILITY_URL, ANALYTICS_URL, FEEDBACK_URL, TERMS_OF_USE_URL } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import { ThemedText, TOKENS, useDeveloperMode, useServices, useStore, useTheme } from '@bifold/core'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableWithoutFeedback, Vibration, View } from 'react-native'
import { AccountSecurityMethod, getAccountSecurityMethod } from 'react-native-bcsc-core'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { SettingsActionCard } from './components/SettingsActionCard'

interface SettingsContentProps {
  onContactUs: () => void
  onHelp: () => void
  onPrivacy: () => void
  onPressDeveloperMode: () => void
  onEditNickname?: () => void
  onForgetAllPairings?: () => void
  onAutoLock?: () => void
}

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
  onForgetAllPairings,
  onAutoLock,
}) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const { logout } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [accountSecurityMethod, setAccountSecurityMethod] = useState<AccountSecurityMethod>()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.md,
    },
    sectionHeader: {
      paddingVertical: Spacing.md,
    },
    sectionContainer: {
      gap: Spacing.xs / 2,
      borderRadius: Spacing.sm,
      overflow: 'hidden',
    },
    cardContainer: {
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    versionContainer: {
      paddingTop: Spacing.md,
      gap: Spacing.xs,
    },
  })

  const onDevModeTriggered = () => {
    Vibration.vibrate()
    onPressDeveloperMode()
  }
  const { incrementDeveloperMenuCounter } = useDeveloperMode(onDevModeTriggered)

  useEffect(() => {
    const fetchAccountSecurityMethod = async () => {
      try {
        const method = await getAccountSecurityMethod()
        setAccountSecurityMethod(method)
      } catch (error) {
        logger.error('Error fetching app security method', error instanceof Error ? error : new Error(String(error)))
      }
    }
    fetchAccountSecurityMethod()
  }, [logger])

  // TODO (MD): Remove this once all settings actions have been implemented
  const onPressActionTodo = () => {
    logger.info('TODO: Settings action pressed')
  }

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

  const onPressAnalytics = async () => {
    try {
      await Linking.openURL(ANALYTICS_URL)
    } catch (error) {
      logger.error('Error opening Analytics URL', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const onPressOptInAnalytics = async () => {
    if (store.bcsc.analyticsOptIn) {
      Analytics.stopTracking()
      dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [false] })
      return
    }

    try {
      dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [true] })
      await Analytics.initializeTracker()
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

  return (
    <TabScreenWrapper edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        {store.authentication.didAuthenticate ? (
          <>
            <View style={styles.sectionContainer}>
              <SettingsActionCard
                title={t('BCSC.Settings.SignOut')}
                startAdornment={<Icon name="logout" size={24} color={ColorPalette.brand.secondary} />}
                onPress={() => {
                  logout()
                }}
              />
            </View>

            <ThemedText variant={'bold'} style={styles.sectionHeader}>
              {t('BCSC.Settings.HeaderA')}
            </ThemedText>
            <View style={styles.sectionContainer}>
              {/* TODO (bm): like for like with v3 feature still needed here (and translation) */}
              <SettingsActionCard onPress={onPressActionTodo} title={'Change App Security'} />
              {accountSecurityMethod !== AccountSecurityMethod.DeviceAuth ? (
                // TODO (MD + BM): update with like for like change pin screen if that is their chosen auth method
                // only show one or the other (device auth or change pin)
                <SettingsActionCard title={t('BCSC.Settings.ChangePIN')} onPress={onPressActionTodo} />
              ) : null}
              {store.bcscSecure.verified && onEditNickname ? (
                <SettingsActionCard title={t('BCSC.Settings.EditNickname')} onPress={onEditNickname} />
              ) : null}
              {onAutoLock ? (
                <SettingsActionCard
                  title={t('BCSC.Settings.AutoLockTime')}
                  onPress={onAutoLock}
                  endAdornmentText={`${store.preferences.autoLockTime} min`}
                />
              ) : null}
              {/* TODO: (AR) Keeping this hidden for phase 1 */}
              {/* <SettingsActionCard title={t('BCSC.Settings.Notifications')} onPress={onPressActionTodo} /> */}
              {onForgetAllPairings ? (
                <SettingsActionCard title={t('BCSC.Settings.ForgetPairings')} onPress={onForgetAllPairings} />
              ) : null}
              <SettingsActionCard
                title={t('BCSC.Settings.AnalyticsOptIn')}
                onPress={onPressOptInAnalytics}
                endAdornmentText={store.bcsc.analyticsOptIn ? 'ON' : 'OFF'}
              />
            </View>
          </>
        ) : null}

        <ThemedText variant={'bold'} style={styles.sectionHeader}>
          {t('BCSC.Settings.HeaderB')}
        </ThemedText>
        <View style={styles.sectionContainer}>
          <SettingsActionCard title={t('BCSC.Settings.Help')} onPress={onHelp} />
          <SettingsActionCard title={t('BCSC.Settings.Privacy')} onPress={onPrivacy} />
          <SettingsActionCard title={t('BCSC.Settings.ContactUs')} onPress={onContactUs} />
          <SettingsActionCard title={t('BCSC.Settings.Feedback')} onPress={onPressFeedback} />
          <SettingsActionCard title={t('BCSC.Settings.Accessibility')} onPress={onPressAccessibility} />
          <SettingsActionCard title={t('BCSC.Settings.TermsOfUse')} onPress={onPressTermsOfUse} />
          <SettingsActionCard title={t('BCSC.Settings.Analytics')} onPress={onPressAnalytics} />
          {store.preferences.developerModeEnabled ? (
            <SettingsActionCard title={t('Developer.DeveloperMode')} onPress={onPressDeveloperMode} />
          ) : null}
        </View>

        <View style={styles.versionContainer}>
          <TouchableWithoutFeedback
            onPress={incrementDeveloperMenuCounter}
            disabled={store.preferences.developerModeEnabled}
          >
            <View style={{ alignItems: 'center' }}>
              <ThemedText variant="labelSubtitle">{t('BCSC.Title')}</ThemedText>
              <ThemedText variant="labelSubtitle">{`Version ${getVersion()} (${getBuildNumber()})`}</ThemedText>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    </TabScreenWrapper>
  )
}
