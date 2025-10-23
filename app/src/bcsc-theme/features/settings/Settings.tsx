import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ACCESSIBILITY_URL, FEEDBACK_URL, TERMS_OF_USE_URL } from '@/constants'
import { BCState } from '@/store'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import { LockoutReason, ThemedText, TOKENS, useAuth, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { SettingsActionCard } from './components/SettingsActionCard'

type SettingsScreenProps = {
  navigation: StackNavigationProp<BCSCRootStackParams>
}

/**
 * The Settings screen for the BCSC theme.
 *
 * @returns {*} {JSX.Element}
 */
const Settings: React.FC<SettingsScreenProps> = ({ navigation }: SettingsScreenProps) => {
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

  const onPressFeedback = async () => {
    try {
      await Linking.openURL(FEEDBACK_URL)
    } catch (error) {
      logger.error('Error opening Feedback URL', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const onPressContactUs = () => {
    navigation.navigate(BCSCScreens.ContactUsScreen)
  }

  const onPressAccessibility = async () => {
    try {
      await Linking.openURL(ACCESSIBILITY_URL)
    } catch (error) {
      logger.error('Error opening Accessibility URL', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const onPressHelp = () => {
    navigation.navigate(BCSCScreens.HelpCentreScreen)
  }

  const onPressPrivacy = () => {
    navigation.navigate(BCSCScreens.PrivacyPolicyScreen, { nonInteractive: true })
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

          <SettingsActionCard title={t('BCSCSettings.Help')} onPress={onPressHelp} />
          <SettingsActionCard title={t('BCSCSettings.Privacy')} onPress={onPressPrivacy} />
          <SettingsActionCard title={t('BCSCSettings.ContactUs')} onPress={onPressContactUs} />
          <SettingsActionCard title={t('BCSCSettings.Feedback')} onPress={onPressFeedback} />
          <SettingsActionCard title={t('BCSCSettings.Accessibility')} onPress={onPressAccessibility} />
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
