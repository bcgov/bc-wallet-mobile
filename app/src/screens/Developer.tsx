import { useTheme, useStore, testIdWithKey, DispatchAction } from '@hyperledger/aries-bifold-core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, Switch, Text, Pressable, View, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BCState } from '../store'

import IASEnvironment from './IASEnvironment'

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { SettingsTheme, TextTheme, ColorPallet } = useTheme()
  const [environmentModalVisible, setEnvironmentModalVisible] = useState<boolean>(false)
  const [devMode, setDevMode] = useState<boolean>(true)
  const [useVerifierCapability, setUseVerifierCapability] = useState<boolean>(!!store.preferences.useVerifierCapability)
  const [acceptDevCredentials, setAcceptDevCredentials] = useState<boolean>(!!store.preferences.acceptDevCredentials)
  const [useConnectionInviterCapability, setConnectionInviterCapability] = useState(
    !!store.preferences.useConnectionInviterCapability
  )
  const [useDevVerifierTemplates, setDevVerifierTemplates] = useState(!!store.preferences.useDevVerifierTemplates)
  const [enableWalletNaming, setEnableWalletNaming] = useState(!!store.preferences.enableWalletNaming)
  const [preventAutoLock, setPreventAutoLock] = useState(!!store.preferences.preventAutoLock)

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.primaryBackground,
      width: '100%',
    },
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      paddingTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingBottom: 0,
    },
    sectionSeparator: {
      marginBottom: 10,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowTitle: {
      ...TextTheme.headingFour,
      flex: 1,
      fontWeight: 'normal',
      flexWrap: 'wrap',
    },
    rowSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.secondary,
      marginTop: 10,
    },
    logo: {
      height: 64,
      width: '50%',
      marginVertical: 16,
    },
    footer: {
      marginVertical: 25,
      alignItems: 'center',
    },
  })

  const shouldDismissModal = () => {
    setEnvironmentModalVisible(false)
  }

  const SectionHeader = ({ title }: { title: string }): JSX.Element => (
    <>
      <View style={[styles.section, styles.sectionHeader]}>
        <Text style={[TextTheme.headingThree, { flexShrink: 1 }]}>{title}</Text>
      </View>
    </>
  )

  interface SectionRowProps {
    title: string
    accessibilityLabel?: string
    testID?: string
    children: JSX.Element
    showRowSeparator?: boolean
    subContent?: JSX.Element
    onPress?: () => void
  }
  const SectionRow = ({
    title,
    accessibilityLabel,
    testID,
    onPress,
    children,
    showRowSeparator,
    subContent,
  }: SectionRowProps) => (
    <>
      <View style={[styles.section]}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Pressable
            onPress={onPress}
            accessible={true}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
            style={styles.sectionRow}
          >
            {children}
          </Pressable>
        </View>
        {subContent}
      </View>
      {showRowSeparator && (
        <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
          <View style={[styles.rowSeparator]}></View>
        </View>
      )}
    </>
  )

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

  const togglePreventAutoLockSwitch = () => {
    dispatch({
      type: DispatchAction.PREVENT_AUTO_LOCK,
      payload: [!preventAutoLock],
    })

    setPreventAutoLock((previousState) => !previousState)
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']}>
      <Modal
        visible={environmentModalVisible}
        transparent={false}
        animationType={'slide'}
        onRequestClose={() => {
          return
        }}
      >
        <IASEnvironment shouldDismissModal={shouldDismissModal} />
      </Modal>
      <ScrollView style={styles.container}>
        <SectionHeader title={t('Settings.Developer')} />
        <SectionRow
          title={t('Developer.DeveloperMode')}
          accessibilityLabel={t('Developer.Toggle')}
          testID={testIdWithKey('ToggleDeveloper')}
          showRowSeparator
        >
          <Switch
            trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
            thumbColor={devMode ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
            ios_backgroundColor={ColorPallet.grayscale.lightGrey}
            onValueChange={toggleSwitch}
            value={devMode}
          />
        </SectionRow>
        <View style={[styles.sectionSeparator]}></View>

        <SectionRow
          title={t('Developer.Environment')}
          accessibilityLabel={t('Developer.Environment')}
          testID={testIdWithKey(t('Developer.Environment').toLowerCase())}
          showRowSeparator={true}
          onPress={() => {
            setEnvironmentModalVisible(true)
          }}
        >
          <Text style={[TextTheme.headingFour, { fontWeight: 'normal', color: ColorPallet.brand.link }]}>
            {store.developer.environment.name}
          </Text>
        </SectionRow>
        <View style={[styles.sectionSeparator]}></View>
        <SectionRow
          title={t('Verifier.UseVerifierCapability')}
          accessibilityLabel={t('Verifier.Toggle')}
          testID={testIdWithKey('ToggleVerifierCapability')}
          showRowSeparator
        >
          <Switch
            trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
            thumbColor={useVerifierCapability ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
            ios_backgroundColor={ColorPallet.grayscale.lightGrey}
            onValueChange={toggleVerifierCapabilitySwitch}
            value={useVerifierCapability}
          />
        </SectionRow>
        <SectionRow
          title={t('Verifier.AcceptDevCredentials')}
          accessibilityLabel={t('Verifier.Toggle')}
          testID={testIdWithKey('ToggleAcceptDevCredentials')}
          showRowSeparator
        >
          <Switch
            trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
            thumbColor={acceptDevCredentials ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
            ios_backgroundColor={ColorPallet.grayscale.lightGrey}
            onValueChange={toggleAcceptDevCredentialsSwitch}
            value={acceptDevCredentials}
          />
        </SectionRow>
        <SectionRow
          title={t('Connection.UseConnectionInviterCapability')}
          accessibilityLabel={t('Connection.Toggle')}
          testID={testIdWithKey('ToggleConnectionInviterCapabilitySwitch')}
          showRowSeparator
        >
          <Switch
            trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
            thumbColor={useConnectionInviterCapability ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
            ios_backgroundColor={ColorPallet.grayscale.lightGrey}
            onValueChange={toggleConnectionInviterCapabilitySwitch}
            value={useConnectionInviterCapability}
          />
        </SectionRow>
        <SectionRow
          title={t('Verifier.UseDevVerifierTemplates')}
          accessibilityLabel={t('Verifier.ToggleDevTemplates')}
          testID={testIdWithKey('ToggleDevVerifierTemplatesSwitch')}
          showRowSeparator
        >
          <Switch
            trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
            thumbColor={useDevVerifierTemplates ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
            ios_backgroundColor={ColorPallet.grayscale.lightGrey}
            onValueChange={toggleDevVerifierTemplatesSwitch}
            value={useDevVerifierTemplates}
          />
        </SectionRow>
        {!store.onboarding.didCreatePIN && (
          <SectionRow
            title={t('NameWallet.EnableWalletNaming')}
            accessibilityLabel={t('NameWallet.ToggleWalletNaming')}
            testID={testIdWithKey('ToggleWalletNamingSwitch')}
            showRowSeparator
          >
            <Switch
              trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
              thumbColor={enableWalletNaming ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
              ios_backgroundColor={ColorPallet.grayscale.lightGrey}
              onValueChange={toggleWalletNamingSwitch}
              value={enableWalletNaming}
            />
          </SectionRow>
        )}
        <SectionRow
          title={t('Settings.PreventAutoLock')}
          accessibilityLabel={t('Settings.TogglePreventAutoLock')}
          testID={testIdWithKey('TogglePreventAutoLockSwitch')}
        >
          <Switch
            trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
            thumbColor={preventAutoLock ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
            ios_backgroundColor={ColorPallet.grayscale.lightGrey}
            onValueChange={togglePreventAutoLockSwitch}
            value={preventAutoLock}
          />
        </SectionRow>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Settings
