import { ACCESSIBILITY_URL, FEEDBACK_URL, TERMS_OF_USE_URL } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import {
  LockoutReason,
  ThemedText,
  TOKENS,
  useAuth,
  useDeveloperMode,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableWithoutFeedback, Vibration, View } from 'react-native'
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
}) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const auth = useAuth()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

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

  return (
    <TabScreenWrapper edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        {store.bcsc.verified ? (
          <>
            <View style={styles.sectionContainer}>
              <SettingsActionCard
                title={t('BCSCSettings.SignOut')}
                startAdornment={<Icon name="logout" size={24} color={ColorPalette.brand.secondary} />}
                onPress={() => {
                  auth.lockOutUser(LockoutReason.Logout)
                  dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [undefined] })
                }}
              />
            </View>

            <ThemedText variant={'bold'} style={styles.sectionHeader}>
              {t('BCSCSettings.HeaderA')}
            </ThemedText>
            <View style={styles.sectionContainer}>
              <SettingsActionCard
                // TODO (MD + BM): Update with like for like device auth screen if that is their chosen auth method
                // only show one or the other (device auth or change pin)
                title={t('BCSCSettings.Biometrics')}
                onPress={onPressActionTodo}
                endAdornmentText={store.preferences.useBiometry ? 'ON' : 'OFF'}
              />
              <SettingsActionCard
                // TODO (MD + BM): Update with like for like change pin screen if that is their chosen auth method
                // only show one or the other (device auth or change pin)
                title={t('BCSCSettings.ChangePIN')}
                onPress={onPressActionTodo}
              />
              {onEditNickname ? (
                <SettingsActionCard title={t('BCSCSettings.EditNickname')} onPress={onEditNickname} />
              ) : null}
              {/* TODO (MD + BM): Implement actions for these two cards */}
              <SettingsActionCard
                title={t('BCSCSettings.AutoLockTime')}
                onPress={onPressActionTodo}
                endAdornmentText={`${store.preferences.autoLockTime} min`}
              />
              <SettingsActionCard title={t('BCSCSettings.Notifications')} onPress={onPressActionTodo} />
              {onForgetAllPairings ? (
                <SettingsActionCard title={t('BCSCSettings.ForgetPairings')} onPress={onForgetAllPairings} />
              ) : null}
            </View>
          </>
        ) : null}

        <ThemedText variant={'bold'} style={styles.sectionHeader}>
          {t('BCSCSettings.HeaderB')}
        </ThemedText>
        <View style={styles.sectionContainer}>
          <SettingsActionCard title={t('BCSCSettings.Help')} onPress={onHelp} />
          <SettingsActionCard title={t('BCSCSettings.Privacy')} onPress={onPrivacy} />
          <SettingsActionCard title={t('BCSCSettings.ContactUs')} onPress={onContactUs} />
          <SettingsActionCard title={t('BCSCSettings.Feedback')} onPress={onPressFeedback} />
          <SettingsActionCard title={t('BCSCSettings.Accessibility')} onPress={onPressAccessibility} />
          <SettingsActionCard title={t('BCSCSettings.TermsOfUse')} onPress={onPressTermsOfUse} />
          {store.preferences.developerModeEnabled ? (
            <SettingsActionCard title={t('Developer.DeveloperMode')} onPress={onPressDeveloperMode} />
          ) : null}
        </View>

        <View style={styles.versionContainer}>
          <TouchableWithoutFeedback
            onPress={incrementDeveloperMenuCounter}
            disabled={store.preferences.developerModeEnabled}
          >
            <View>
              <ThemedText variant="labelSubtitle">{t('Unified.BCSC')}</ThemedText>
              <ThemedText variant="labelSubtitle">{`Version ${getVersion()} (${getBuildNumber()})`}</ThemedText>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    </TabScreenWrapper>
  )
}
