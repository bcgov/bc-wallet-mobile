import { UserInfoResponseData } from '@/bcsc-theme/api/hooks/useUserApi'
import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState, Mode } from '@/store'
import useApi from '@bcsc-theme/api/hooks/useApi'
import { ServerStatusResponseData, TermsOfUseResponseData } from '@bcsc-theme/api/hooks/useConfigApi'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import useDataLoader from '@bcsc-theme/hooks/useDataLoader'
import {
  Button,
  ButtonType,
  isBiometricsActive,
  LockoutReason,
  ThemedText,
  TOKENS,
  useAuth,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import SampleApiDisplay from './components/SampleApiDisplay'
import { SettingsActionCard } from './components/SettingsActionCard'
import { useTranslation } from 'react-i18next'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { getBuildNumber, getSystemName, getSystemVersion, getVersion } from 'react-native-device-info'

// Placeholder for now, not sure if we want to reuse our
// existing settings screen or create a new one, prob create new
const Settings: React.FC = () => {
  const { t } = useTranslation()
  const { Spacing, setTheme, themeName, ColorPalette } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const auth = useAuth()
  const { config, evidence, user } = useApi()
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

  const onServerStatusError = (error: unknown) => {
    logger.error(`Error loading server status: ${error}`)
  }
  const onTermsOfUseError = (error: unknown) => {
    logger.error(`Error loading terms of use: ${error}`)
  }

  const isBiometricsActive = useDataLoader(auth.isBiometricsActive, {
    onError: (error: unknown) => logger.error(`Error loading biometrics: ${error}`),
  })

  const serverStatusDataLoader = useDataLoader<ServerStatusResponseData>(() => config.getServerStatus(), {
    onError: onServerStatusError,
  })
  const termsDataLoader = useDataLoader<TermsOfUseResponseData>(() => config.getTermsOfUse(), {
    onError: onTermsOfUseError,
  })
  const evidenceStart = useDataLoader<any>(
    async () => {
      if (!store.bcsc.deviceCode) {
        throw new Error('Device code is not available. Something went wrong.')
      }
      // need to store id and SHA! for later
      const response = await evidence.createVerificationRequest()
      dispatch({ type: BCDispatchAction.UPDATE_VERIFICATION_REQUEST, payload: [response] })
      return response
    },
    {
      onError: (error: unknown) => logger.error(`Error loading: ${error}`),
    }
  )

  const deleteRequest = useDataLoader<any>(
    async () => {
      if (store.bcsc.verificationRequestId && store.bcsc.deviceCode) {
        await evidence.cancelVerificationRequest(store.bcsc.verificationRequestId)

        return 'DELETED REQUEST FOR ID: ' + store.bcsc.verificationRequestId
      } else {
        return 'No ID found to delete'
      }
    },
    {
      onError: (error: unknown) => logger.error(`Error loading: ${error}`),
    }
  )

  const userAccount = useDataLoader<any>(() => user.getUserInfo(), {
    onError: (error: unknown) => logger.error(`Error loading: ${error}`),
  })

  const onPressMode = () => {
    lockOutUser(LockoutReason.Logout)
    const newTheme = store.mode === Mode.BCWallet ? BCThemeNames.BCSC : BCThemeNames.BCWallet
    setTheme(newTheme)
    dispatch({ type: BCDispatchAction.UPDATE_MODE, payload: [Mode.BCWallet] })
  }

  const onPressTheme = () => {
    if (themeName === BCThemeNames.BCSC) {
      setTheme(BCThemeNames.BCWallet)
    } else {
      setTheme(BCThemeNames.BCSC)
    }
  }

  // TODO (MD): Deprecate this once all settings actions have been implemented
  const onPressActionTodo = () => {
    logger.info('TODO: Settings action pressed')
  }

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        <ScrollView style={styles.sectionContainer}>
          <SettingsActionCard
            title={t('BCSCSettings.SignOut')}
            startAdornment={<Icon name="logout" size={24} color={ColorPalette.brand.secondary} />}
            onPress={() => {
              auth.lockOutUser(LockoutReason.Logout)
            }}
          />

          <ThemedText style={styles.sectionHeader}>{t('BCSCSettings.HeaderA')}</ThemedText>

          {/* TODO (MD): Implement actions for these cards */}
          <SettingsActionCard
            title={t('BCSCSettings.Biometrics')}
            onPress={onPressActionTodo}
            endAdornmentText={isBiometricsActive.data ? 'OFF' : 'ON'}
          />
          <SettingsActionCard title={t('BCSCSettings.ChangePIN')} onPress={onPressActionTodo} />
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
          <SettingsActionCard title={t('BCSCSettings.TermsOfUse')} onPress={onPressActionTodo} />

          <View style={styles.versionContainer}>
            <ThemedText>BC Services Card</ThemedText>
            <ThemedText>{`Version: ${getVersion()}`}</ThemedText>
            <ThemedText>{`Build: ${getBuildNumber()}`}</ThemedText>
          </View>
        </ScrollView>
      </View>
    </TabScreenWrapper>
  )
}

export default Settings
