import { ListButton, ListButtonGroup, ListButtonProps } from '@/bcsc-theme/components/ListButton'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { Switch } from '@/components/Switch'
import { BCThemeNames, Mode } from '@/constants'
import { useFeatureFlags } from '@/remote-config/FeatureFlags'
import { useRemoteConfig } from '@/remote-config/RemoteConfig'
import { AutoCredentialMonitor } from '@/services/auto-credential'
import { BCDispatchAction, BCState } from '@/store'
import {
  CredentialProvisioningEventTypes,
  DispatchAction,
  LockoutReason,
  SafeAreaModal,
  Screens,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAuth,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { RemoteLogger, RemoteLoggerEventTypes } from '@bifold/remote-logs'
import { useNavigation } from '@react-navigation/native'
import React, { ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, StyleSheet, View } from 'react-native'
import { deleteToken, TokenType } from 'react-native-bcsc-core'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import Icon from 'react-native-vector-icons/MaterialIcons'
import ErrorAlertTest from './ErrorAlertTest'
import IASEnvironment from './IASEnvironment'
import RemoteLogWarning from './RemoteLogWarning'
import WalletEnvironment from './WalletEnvironment'

const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => {
  const { TextTheme, Spacing } = useTheme()

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md }}
      accessibilityRole="header"
    >
      <Icon name={icon} size={22} color={TextTheme.bold.color} />
      <ThemedText variant="bold" style={{ flexShrink: 1 }}>
        {title}
      </ThemedText>
    </View>
  )
}

interface RowProps {
  title: string
  bold?: boolean
  endAdornment?: ReactNode
  subContent?: ReactNode
}

const Row: React.FC<RowProps> = ({ title, bold, endAdornment, subContent }) => {
  const { ColorPalette, Spacing } = useTheme()

  return (
    <View style={{ flex: 1, gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <ThemedText
          variant={bold ? 'bold' : 'normal'}
          style={{ flex: 1, flexWrap: 'wrap', color: ColorPalette.brand.headerText }}
        >
          {title}
        </ThemedText>
        {endAdornment}
      </View>
      {subContent}
    </View>
  )
}

interface ToggleRowProps {
  title: string
  value: boolean
  onToggle: () => void
  accessibilityLabel: string
  testID: string
  bold?: boolean
  disabled?: boolean
  subContent?: ReactNode
  position?: ListButtonProps['position']
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  value,
  onToggle,
  accessibilityLabel,
  testID,
  bold,
  disabled,
  subContent,
  position,
}) => (
  <ListButton
    onPress={onToggle}
    disabled={disabled}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="switch"
    accessibilityState={{ checked: value, disabled }}
    testID={testID}
    position={position}
  >
    <Row
      title={title}
      bold={bold}
      subContent={subContent}
      endAdornment={<Switch value={value} disabled={disabled} presentational />}
    />
  </ListButton>
)

/** `Label: value` line shown beneath a row's title. */
const RowDetail: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { ColorPalette } = useTheme()

  return (
    <ThemedText style={{ color: ColorPalette.brand.headerText }}>
      {`${label}: `}
      <ThemedText variant="bold" style={{ color: ColorPalette.brand.headerText }}>
        {value}
      </ThemedText>
    </ThemedText>
  )
}

const Developer: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { lockOutUser } = useAuth()
  const { client: apiClient } = useBCSCApiClientState()
  const { ColorPalette, Spacing, setTheme, themeName } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER]) as [RemoteLogger]
  const [credentialProvisioningMonitor] = useServices([TOKENS.UTIL_CREDENTIAL_PROVISIONING_MONITOR])
  const [environmentModalVisible, setEnvironmentModalVisible] = useState<boolean>(false)
  const [errorAlertTestModalVisible, setErrorAlertTestModalVisible] = useState<boolean>(false)
  const [devMode, setDevMode] = useState<boolean>(true)
  const [useVerifierCapability, setUseVerifierCapability] = useState<boolean>(!!store.preferences.useVerifierCapability)
  const [acceptDevCredentials, setAcceptDevCredentials] = useState<boolean>(!!store.preferences.acceptDevCredentials)
  const [useConnectionInviterCapability, setConnectionInviterCapability] = useState(
    !!store.preferences.useConnectionInviterCapability
  )
  const [remoteLoggingWarningModalVisible, setRemoteLoggingWarningModalVisible] = useState(false)
  const [useDevVerifierTemplates, setDevVerifierTemplates] = useState(!!store.preferences.useDevVerifierTemplates)
  const [enableWalletNaming, setEnableWalletNaming] = useState(!!store.preferences.enableWalletNaming)
  const [preventAutoLock, setPreventAutoLock] = useState(!!store.preferences.preventAutoLock)
  const [remoteLoggingEnabled, setRemoteLoggingEnabled] = useState(logger?.remoteLoggingEnabled)
  const [enableShareableLink, setEnableShareableLink] = useState(!!store.preferences.enableShareableLink)
  const [enableProxy, setEnableProxy] = useState(!!store.developer.enableProxy)
  const [enableAppToAppPersonFlow, setEnableAppToAppPersonFlow] = useState(!!store.developer.enableAppToAppPersonFlow)
  const [tokensDeleted, setTokensDeleted] = useState<boolean>(false)
  const [personCredentialFetchStatus, setPersonCredentialFetchStatus] = useState<string>('idle')
  const remoteConfig = useRemoteConfig()
  const { featureFlags, setFeatureFlag } = useFeatureFlags()
  const navigation = useNavigation()

  useEffect(() => {
    const handleStarted = () => setPersonCredentialFetchStatus('started')
    const handleCompleted = () => setPersonCredentialFetchStatus('completed')
    const handleFailed = (eventName: string) => (error: Error) => {
      logger.error(`Developer: Person Credential test fetch failed (${eventName})`, error)
      setPersonCredentialFetchStatus(`failed (${eventName}): ${error.message}`)
    }

    const subscriptions = [
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.Started, handleStarted),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.Completed, handleCompleted),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.FailedHandleProof, handleFailed('proof')),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.FailedHandleOffer, handleFailed('offer')),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.FailedRequestCredential, handleFailed('request')),
    ]

    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
    }
  }, [logger])

  const BCSCMode = store.mode === Mode.BCSC

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.lg,
    },
    sectionContainer: {
      gap: Spacing.xs / 2,
      borderRadius: Spacing.sm,
      overflow: 'hidden',
    },
    footer: {
      paddingTop: Spacing.lg,
      alignItems: 'center',
    },
  })

  const shouldDismissModal = () => {
    setEnvironmentModalVisible(false)
  }

  const toggleSwitch = () => {
    dispatch({
      type: DispatchAction.ENABLE_DEVELOPER_MODE,
      payload: [!devMode],
    })
    setDevMode(!devMode)
  }

  const toggleVerifierCapabilitySwitch = () => {
    // if verifier feature is switched off then also turn off the dev templates
    if (useVerifierCapability) {
      dispatch({
        type: DispatchAction.USE_DEV_VERIFIER_TEMPLATES,
        payload: [false],
      })
      setDevVerifierTemplates(false)
    }
    dispatch({
      type: DispatchAction.USE_VERIFIER_CAPABILITY,
      payload: [!useVerifierCapability],
    })
    setUseVerifierCapability((previousState) => !previousState)
  }

  const toggleAcceptDevCredentialsSwitch = () => {
    dispatch({
      type: DispatchAction.ACCEPT_DEV_CREDENTIALS,
      payload: [!acceptDevCredentials],
    })
    setAcceptDevCredentials((previousState) => !previousState)
  }

  const toggleConnectionInviterCapabilitySwitch = () => {
    dispatch({
      type: DispatchAction.USE_CONNECTION_INVITER_CAPABILITY,
      payload: [!useConnectionInviterCapability],
    })
    setConnectionInviterCapability((previousState) => !previousState)
  }

  const toggleDevVerifierTemplatesSwitch = () => {
    // if we switch on dev templates we can assume the user also
    // wants to enable the verifier capability
    if (!useDevVerifierTemplates) {
      dispatch({
        type: DispatchAction.USE_VERIFIER_CAPABILITY,
        payload: [true],
      })
      setUseVerifierCapability(true)
    }
    dispatch({
      type: DispatchAction.USE_DEV_VERIFIER_TEMPLATES,
      payload: [!useDevVerifierTemplates],
    })
    setDevVerifierTemplates((previousState) => !previousState)
  }

  const toggleWalletNamingSwitch = () => {
    dispatch({
      type: DispatchAction.ENABLE_WALLET_NAMING,
      payload: [!enableWalletNaming],
    })

    setEnableWalletNaming((previousState) => !previousState)
  }

  const toggleRemoteLoggingSwitch = () => {
    if (remoteLoggingEnabled) {
      const remoteLoggingEnabled = false

      DeviceEventEmitter.emit(RemoteLoggerEventTypes.ENABLE_REMOTE_LOGGING, remoteLoggingEnabled)
      setRemoteLoggingEnabled(remoteLoggingEnabled)

      dispatch({
        type: BCDispatchAction.REMOTE_DEBUGGING_STATUS_UPDATE,
        payload: [{ enabled: remoteLoggingEnabled, expireAt: undefined }],
      })

      return
    }

    setRemoteLoggingWarningModalVisible(true)
  }

  const onEnableRemoteLoggingPressed = () => {
    const remoteLoggingEnabled = true
    DeviceEventEmitter.emit(RemoteLoggerEventTypes.ENABLE_REMOTE_LOGGING, remoteLoggingEnabled)
    dispatch({
      type: BCDispatchAction.REMOTE_DEBUGGING_STATUS_UPDATE,
      payload: [{ enabledAt: new Date(), sessionId: logger.sessionId }],
    })
    setRemoteLoggingEnabled(remoteLoggingEnabled)

    setRemoteLoggingWarningModalVisible(false)

    if (store.authentication.didAuthenticate) {
      navigation.navigate(Screens.Home as never)
    }
  }

  const onRemoteLoggingBackPressed = () => {
    setRemoteLoggingWarningModalVisible(false)
  }

  const togglePreventAutoLockSwitch = () => {
    dispatch({
      type: DispatchAction.PREVENT_AUTO_LOCK,
      payload: [!preventAutoLock],
    })

    setPreventAutoLock((previousState) => !previousState)
  }

  const toggleShareableLinkSwitch = () => {
    dispatch({
      type: DispatchAction.USE_SHAREABLE_LINK,
      payload: [!enableShareableLink],
    })
    setEnableShareableLink((previousState) => !previousState)
  }

  const toggleEnableProxySwitch = () => {
    dispatch({
      type: BCDispatchAction.TOGGLE_PROXY,
      payload: [!enableProxy],
    })
    setEnableProxy((previousState) => !previousState)
  }

  const toggleEnableAppToAppPersonFlowSwitch = () => {
    dispatch({
      type: BCDispatchAction.TOGGLE_APP_TO_APP_PERSON_FLOW,
      payload: [!enableAppToAppPersonFlow],
    })
    setEnableAppToAppPersonFlow((previousState) => !previousState)
  }

  const toggleTheme = () => {
    if (themeName === BCThemeNames.Dark) {
      setTheme(BCThemeNames.Light)
    } else {
      setTheme(BCThemeNames.Dark)
    }
  }

  const staleTermsOfUseAcceptance = () => {
    // Set a version that will never match the server's, so the Terms of Use
    // re-acceptance modal is presented on the next unlock (MainStack mount)
    dispatch({
      type: BCDispatchAction.UPDATE_ACCEPTED_TERMS_OF_USE_VERSION,
      payload: ['-1'],
    })
  }

  const resetOnboardingIntro = () => {
    // Clear the "seen" flag so the welcome/intro is shown again the next time AuthStack mounts
    // (i.e. the next app launch or unlock) — mirrors how the intro is gated for returning users.
    dispatch({
      type: BCDispatchAction.SEEN_ONBOARDING_INTRO,
      payload: [false],
    })
  }

  const deleteTokens = async () => {
    // Deletes tokens from native keychain storage and clears the in-memory cache
    // Testing getTokenWithDiagnostics() will show correct error message
    try {
      await Promise.all([
        deleteToken(TokenType.Refresh),
        deleteToken(TokenType.Registration),
        deleteToken(TokenType.Access),
      ])
      apiClient?.clearTokens()
      logger.info('Developer: Deleted all tokens from native storage and cleared in-memory cache')
      setTokensDeleted(true)
    } catch (error) {
      logger.error('Developer: Failed to delete tokens', error as Error)
    }
  }

  const fetchPersonCredentialTest = () => {
    const monitor = credentialProvisioningMonitor as AutoCredentialMonitor | undefined
    if (!monitor || typeof monitor.triggerTestWorkflow !== 'function') {
      logger.warn('Developer: No AutoCredentialMonitor registered, cannot trigger test fetch')
      setPersonCredentialFetchStatus('unavailable — monitor not registered')
      return
    }

    setPersonCredentialFetchStatus('triggering...')
    const started = monitor.triggerTestWorkflow()
    if (!started) {
      setPersonCredentialFetchStatus('not started — already in progress or agent not ready')
    }
  }

  const toggleMode = () => {
    lockOutUser(LockoutReason.Logout)

    const newMode = BCSCMode ? Mode.BCWallet : Mode.BCSC
    const newTheme = BCSCMode ? BCThemeNames.BCWallet : BCThemeNames.Light

    setTheme(newTheme)
    dispatch({
      type: BCDispatchAction.UPDATE_MODE,
      payload: [newMode],
    })
  }

  return (
    <ScreenWrapper padded={false} scrollViewContainerStyle={styles.container}>
      <SafeAreaModal
        visible={remoteLoggingWarningModalVisible}
        transparent={false}
        animationType={'fade'}
        onRequestClose={() => {
          return
        }}
      >
        <RemoteLogWarning onBackPressed={onRemoteLoggingBackPressed} onEnablePressed={onEnableRemoteLoggingPressed} />
      </SafeAreaModal>
      <SafeAreaModal
        visible={environmentModalVisible}
        transparent={false}
        animationType={'slide'}
        onRequestClose={() => {
          return
        }}
      >
        {BCSCMode ? (
          <IASEnvironment shouldDismissModal={shouldDismissModal} />
        ) : (
          <WalletEnvironment shouldDismissModal={shouldDismissModal} />
        )}
      </SafeAreaModal>
      <SafeAreaModal
        visible={errorAlertTestModalVisible}
        transparent={false}
        animationType={'slide'}
        onRequestClose={() => {
          setErrorAlertTestModalVisible(false)
        }}
      >
        <ErrorAlertTest onBack={() => setErrorAlertTestModalVisible(false)} />
      </SafeAreaModal>

      <View style={styles.sectionContainer}>
        <ListButtonGroup>
          <ToggleRow
            title={t('Developer.DeveloperMode')}
            bold
            value={devMode}
            onToggle={toggleSwitch}
            accessibilityLabel={t('Developer.Toggle')}
            testID={testIdWithKey('ToggleDeveloper')}
          />
        </ListButtonGroup>
      </View>

      <SectionHeader icon={'apartment'} title={'IAS'} />
      <View style={styles.sectionContainer}>
        <ListButtonGroup>
          {[
            <ListButton
              key="environment"
              onPress={() => setEnvironmentModalVisible(true)}
              accessibilityLabel={t('Developer.Environment')}
              testID={testIdWithKey(t('Developer.Environment').toLowerCase())}
            >
              <Row
                title={t('Developer.Environment')}
                endAdornment={
                  <ThemedText variant="bold" style={{ color: ColorPalette.brand.primary }}>
                    {store.developer.environment.name.toUpperCase()}
                  </ThemedText>
                }
              />
            </ListButton>,
            BCSCMode ? null : (
              <ToggleRow
                key="shareableLink"
                title={t('PasteUrl.UseShareableLink')}
                value={enableShareableLink}
                onToggle={toggleShareableLinkSwitch}
                disabled={!store.authentication.didAuthenticate}
                accessibilityLabel={t('PasteUrl.UseShareableLink')}
                testID={testIdWithKey('ToggleUseShareableLink')}
              />
            ),
            BCSCMode ? null : (
              <ToggleRow
                key="verifierCapability"
                title={t('Verifier.UseVerifierCapability')}
                value={useVerifierCapability}
                onToggle={toggleVerifierCapabilitySwitch}
                accessibilityLabel={t('Verifier.Toggle')}
                testID={testIdWithKey('ToggleVerifierCapability')}
              />
            ),
            BCSCMode ? null : (
              <ToggleRow
                key="acceptDevCredentials"
                title={t('Verifier.AcceptDevCredentials')}
                value={acceptDevCredentials}
                onToggle={toggleAcceptDevCredentialsSwitch}
                accessibilityLabel={t('Verifier.Toggle')}
                testID={testIdWithKey('ToggleAcceptDevCredentials')}
              />
            ),
            BCSCMode ? null : (
              <ToggleRow
                key="connectionInviter"
                title={t('Connection.UseConnectionInviterCapability')}
                value={useConnectionInviterCapability}
                onToggle={toggleConnectionInviterCapabilitySwitch}
                accessibilityLabel={t('Connection.Toggle')}
                testID={testIdWithKey('ToggleConnectionInviterCapabilitySwitch')}
              />
            ),
            BCSCMode ? null : (
              <ToggleRow
                key="devVerifierTemplates"
                title={t('Verifier.UseDevVerifierTemplates')}
                value={useDevVerifierTemplates}
                onToggle={toggleDevVerifierTemplatesSwitch}
                accessibilityLabel={t('Verifier.ToggleDevTemplates')}
                testID={testIdWithKey('ToggleDevVerifierTemplatesSwitch')}
              />
            ),
            !BCSCMode && !store.onboarding.didCreatePIN ? (
              <ToggleRow
                key="walletNaming"
                title={t('NameWallet.EnableWalletNaming')}
                value={enableWalletNaming}
                onToggle={toggleWalletNamingSwitch}
                accessibilityLabel={t('NameWallet.ToggleWalletNaming')}
                testID={testIdWithKey('ToggleWalletNamingSwitch')}
              />
            ) : null,
            BCSCMode ? null : (
              <ToggleRow
                key="preventAutoLock"
                title={t('Settings.PreventAutoLock')}
                value={preventAutoLock}
                onToggle={togglePreventAutoLockSwitch}
                accessibilityLabel={t('Settings.TogglePreventAutoLock')}
                testID={testIdWithKey('TogglePreventAutoLockSwitch')}
              />
            ),
            BCSCMode ? null : (
              <ToggleRow
                key="appToAppPersonFlow"
                title={t('Developer.EnableAppToAppPersonFlow')}
                value={enableAppToAppPersonFlow}
                onToggle={toggleEnableAppToAppPersonFlowSwitch}
                accessibilityLabel={t('Developer.EnableAppToAppPersonFlow')}
                testID={testIdWithKey('ToggleEnableAppToAppPersonFlow')}
              />
            ),
          ]}
        </ListButtonGroup>
      </View>

      <SectionHeader icon={'tune'} title={t('Developer.AppSection')} />
      <View style={styles.sectionContainer}>
        <ListButtonGroup>
          <ToggleRow
            title={'Remote Logging'}
            value={!!remoteLoggingEnabled}
            onToggle={toggleRemoteLoggingSwitch}
            accessibilityLabel={t('RemoteLogging.ScreenTitle')}
            testID={testIdWithKey('ToggleRemoteLoggingSwitch')}
            subContent={
              remoteLoggingEnabled ? (
                <RowDetail label={t('RemoteLogging.SessionID')} value={logger.sessionId.toString()} />
              ) : null
            }
          />
          <ToggleRow
            title={t('Developer.EnableProxy')}
            value={enableProxy}
            onToggle={toggleEnableProxySwitch}
            accessibilityLabel={t('Developer.EnableProxy')}
            testID={testIdWithKey('ToggleEnableProxy')}
          />
          <ToggleRow
            title={t('Developer.SwitchTheme')}
            value={themeName === BCThemeNames.Dark}
            onToggle={toggleTheme}
            accessibilityLabel={t('Developer.SwitchTheme')}
            testID={testIdWithKey('ToggleTheme')}
          />
          <ToggleRow
            title={t('Developer.SwitchMode')}
            value={BCSCMode}
            onToggle={toggleMode}
            accessibilityLabel={t('Developer.SwitchMode')}
            testID={testIdWithKey('ToggleMode')}
          />
        </ListButtonGroup>
      </View>

      {BCSCMode ? (
        <>
          <SectionHeader icon={'bug-report'} title={t('Developer.Testing')} />
          <View style={styles.sectionContainer}>
            <ListButtonGroup>
              <ListButton
                onPress={() => setErrorAlertTestModalVisible(true)}
                accessibilityLabel={t('Developer.ErrorAlertTest')}
                testID={testIdWithKey('ErrorAlertTest')}
              >
                <Row title={t('Developer.ErrorAlertTest')} />
              </ListButton>
              <ListButton
                onPress={staleTermsOfUseAcceptance}
                accessibilityLabel={t('Developer.StaleTermsOfUse')}
                testID={testIdWithKey('StaleTermsOfUse')}
              >
                <Row
                  title={t('Developer.StaleTermsOfUse')}
                  endAdornment={<Icon name="restore" size={24} color={ColorPalette.brand.primary} />}
                  subContent={
                    <RowDetail
                      label={t('Developer.AcceptedTermsVersion')}
                      value={store.bcsc.acceptedTermsOfUseVersion ?? '—'}
                    />
                  }
                />
              </ListButton>
              <ListButton
                onPress={resetOnboardingIntro}
                accessibilityLabel={t('Developer.ResetOnboardingIntro')}
                testID={testIdWithKey('ResetOnboardingIntro')}
              >
                <Row
                  title={t('Developer.ResetOnboardingIntro')}
                  endAdornment={<Icon name="restore" size={24} color={ColorPalette.brand.primary} />}
                  subContent={
                    <RowDetail
                      label={t('Developer.OnboardingIntroSeen')}
                      value={String(store.bcsc.hasSeenOnboardingIntro ?? false)}
                    />
                  }
                />
              </ListButton>
              <ListButton
                onPress={deleteTokens}
                accessibilityLabel={t('Developer.DeleteTokens')}
                testID={testIdWithKey('DeleteTokens')}
              >
                <Row
                  title={t('Developer.DeleteTokens')}
                  endAdornment={<Icon name="delete" size={24} color={ColorPalette.brand.primary} />}
                  subContent={<RowDetail label={t('Developer.DeletedTokens')} value={String(tokensDeleted)} />}
                />
              </ListButton>
              <ListButton
                accessibilityLabel={t('Developer.FetchPersonCredentialTest')}
                testID={testIdWithKey('FetchPersonCredentialTest')}
                onPress={fetchPersonCredentialTest}
              >
                <Row
                  title={t('Developer.FetchPersonCredentialTest')}
                  endAdornment={<Icon name="badge" size={24} color={ColorPalette.brand.link} />}
                  subContent={
                    <RowDetail label={t('Developer.FetchPersonCredentialStatus')} value={personCredentialFetchStatus} />
                  }
                />
              </ListButton>
            </ListButtonGroup>
          </View>
        </>
      ) : null}

      {BCSCMode ? (
        <>
          <SectionHeader icon={'flag'} title={'Local Feature Flags'} />
          {Object.entries(featureFlags).map(([flag, value]) => (
            <ToggleRow
              key={flag}
              title={flag}
              value={value}
              onToggle={() => {
                // Override the feature flag value in local state for testing purposes
                remoteConfig.setValue('featureFlags', { ...featureFlags, [flag]: !value })
              }}
              accessibilityLabel={flag}
              testID={`toggle-${flag}`}
            />
          ))}
        </>
      ) : null}

      <View style={styles.footer}>
        <ThemedText variant="caption">{`Version ${getVersion()} (${getBuildNumber()})`}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}

export default Developer
