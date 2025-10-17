import { TERMS_OF_USE_URL } from '@/constants'
import { BCState } from '@/store'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import { LockoutReason, ThemedText, TOKENS, useAuth, useServices, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { SettingsActionCard } from './components/SettingsActionCard'

/**
 * The Settings screen for the BCSC theme.
 *
 * @returns {*} {JSX.Element}
 */
const Settings: React.FC = () => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store] = useStore<BCState>()
  const auth = useAuth()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      padding: Spacing.md,
    },
    sectionHeader: {
      padding: Spacing.md,
      fontWeight: 'bold',
      fontSize: 16,
    },
    sectionContainer: {
      gap: Spacing.xs / 2,
    },
    cardContainer: {
      padding: Spacing.md,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    versionContainer: {
      padding: Spacing.md,
      gap: Spacing.xs,
    },
  })

  // TODO (MD): Deprecate this once all settings actions have been implemented
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

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        <View style={styles.sectionContainer}>
          <SettingsActionCard
            title={t('BCSCSettings.SignOut')}
            startAdornment={<Icon name="logout" size={24} color={ColorPalette.brand.secondary} />}
            onPress={() => {
              auth.lockOutUser(LockoutReason.Logout)
            }}
          />

          <ThemedText style={styles.sectionHeader}>{t('BCSCSettings.HeaderA')}</ThemedText>

          <SettingsActionCard
            title={t('BCSCSettings.Biometrics')}
            // TODO (MD): Export ToggleBiometry component from Bifold and make text content dynamic with props
            onPress={onPressActionTodo}
            endAdornmentText={store.preferences.useBiometry ? 'ON' : 'OFF'}
          />
          <SettingsActionCard
            title={t('BCSCSettings.ChangePIN')}
            // TODO (MD): Export ChangePIN component from Bifold and make text content dynamic with props
            onPress={onPressActionTodo}
          />
          {/* TODO (MD): Implement actions for these cards */}
          <SettingsActionCard
            title={t('BCSCSettings.AutoLockTime')}
            onPress={onPressActionTodo}
            endAdornmentText={`${store.preferences.autoLockTime} min`}
          />
          <SettingsActionCard title={t('BCSCSettings.Notifications')} onPress={onPressActionTodo} />
          <SettingsActionCard title={t('BCSCSettings.ForgetPairings')} onPress={onPressActionTodo} />

          <ThemedText style={styles.sectionHeader}>{t('BCSCSettings.HeaderB')}</ThemedText>

          <SettingsActionCard title={t('BCSCSettings.Help')} onPress={onPressActionTodo} />
          <SettingsActionCard title={t('BCSCSettings.Privacy')} onPress={onPressActionTodo} />
          <SettingsActionCard title={t('BCSCSettings.ContactUs')} onPress={onPressActionTodo} />
          <SettingsActionCard title={t('BCSCSettings.Feedback')} onPress={onPressActionTodo} />
          <SettingsActionCard title={t('BCSCSettings.Accessibility')} onPress={onPressActionTodo} />
          <SettingsActionCard title={t('BCSCSettings.TermsOfUse')} onPress={onPressTermsOfUse} />

          {/* TODO (MD): Add developer options */}

          <View style={styles.versionContainer}>
            <ThemedText variant="labelSubtitle">BC Services Card</ThemedText>
            <ThemedText variant="labelSubtitle">{`Version ${getVersion()}-${getBuildNumber()}`}</ThemedText>
          </View>
        </View>
      </View>
    </TabScreenWrapper>
  )
}

export default Settings
