import {
  DispatchAction,
  SafeAreaModal,
  Screens,
  testIdWithKey,
  TOKENS,
  useAuth,
  useServices,
  useStore,
  useTheme,
  LockoutReason,
} from '@bifold/core'
import { RemoteLogger, RemoteLoggerEventTypes } from '@bifold/remote-logs'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import { BCDispatchAction, BCState, Mode } from '@/store'
import IASEnvironment from './IASEnvironment'
import RemoteLogWarning from './RemoteLogWarning'
import { BCThemeNames } from '@/constants'

const Developer: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { lockOutUser } = useAuth()
  const { SettingsTheme, TextTheme, ColorPalette, setTheme, themeName } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER]) as [RemoteLogger]
  const [environmentModalVisible, setEnvironmentModalVisible] = useState<boolean>(false)
  const [devMode, setDevMode] = useState<boolean>(true)

  const [remoteLoggingWarningModalVisible, setRemoteLoggingWarningModalVisible] = useState(false)
  const [remoteLoggingEnabled, setRemoteLoggingEnabled] = useState(logger?.remoteLoggingEnabled)
  const [enableProxy, setEnableProxy] = useState(!!store.developer.enableProxy)
  const navigation = useNavigation()

  const BCSCMode = store.mode === Mode.BCSC

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      width: '100%',
    },
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      padding: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
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
      borderBottomColor: ColorPalette.brand.primaryBackground,
      marginHorizontal: 24,
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

  const SectionHeader = ({ icon, title }: { icon: string; title: string }): JSX.Element => (
    <View style={[styles.section, styles.sectionHeader]}>
      <Icon name={icon} size={24} style={{ marginRight: 10, color: TextTheme.normal.color }} />
      <Text style={[TextTheme.headingThree, { flexShrink: 1 }]}>{title}</Text>
    </View>
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
      <View style={styles.section}>
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
          <View style={styles.rowSeparator}></View>
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

  const toggleEnableProxySwitch = () => {
    dispatch({
      type: BCDispatchAction.TOGGLE_PROXY,
      payload: [!enableProxy],
    })
    setEnableProxy((previousState) => !previousState)
  }

  const toggleTheme = () => {
    if (themeName === BCThemeNames.BCSC) {
      setTheme(BCThemeNames.BCWallet)
    } else {
      setTheme(BCThemeNames.BCSC)
    }
  }

  const toggleMode = () => {
    lockOutUser(LockoutReason.Logout)

    const newMode = BCSCMode ? Mode.BCWallet : Mode.BCSC
    const newTheme = BCSCMode ? BCThemeNames.BCWallet : BCThemeNames.BCSC

    setTheme(newTheme)
    dispatch({
      type: BCDispatchAction.UPDATE_MODE,
      payload: [newMode],
    })
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
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
        <IASEnvironment shouldDismissModal={shouldDismissModal} />
      </SafeAreaModal>
      <ScrollView style={styles.container}>
        <SectionRow
          title={t('Developer.DeveloperMode')}
          accessibilityLabel={t('Developer.Toggle')}
          testID={testIdWithKey('ToggleDeveloper')}
        >
          <Switch
            trackColor={{ false: ColorPalette.grayscale.lightGrey, true: ColorPalette.brand.primaryDisabled }}
            thumbColor={devMode ? ColorPalette.brand.primary : ColorPalette.grayscale.mediumGrey}
            ios_backgroundColor={ColorPalette.grayscale.lightGrey}
            onValueChange={toggleSwitch}
            value={devMode}
          />
        </SectionRow>
        <View style={styles.sectionSeparator}></View>
        <SectionHeader icon={'apartment'} title={'IAS'} />
        <SectionRow
          title={t('Developer.Environment')}
          accessibilityLabel={t('Developer.Environment')}
          testID={testIdWithKey(t('Developer.Environment').toLowerCase())}
          onPress={() => {
            setEnvironmentModalVisible(true)
          }}
        >
          <Text style={[TextTheme.headingFour, { fontWeight: 'normal', color: ColorPalette.brand.link }]}>
            {store.developer.environment.name}
          </Text>
        </SectionRow>
        <View style={styles.sectionSeparator}></View>
        <SectionRow
          title={'Remote Logging'}
          accessibilityLabel={'Remote Logging'}
          testID={testIdWithKey('ToggleRemoteLoggingSwitch')}
          subContent={
            remoteLoggingEnabled ? (
              <Text style={[styles.rowTitle, { marginTop: 10 }]}>
                {`${t('RemoteLogging.SessionID')}: `}
                <Text style={[styles.rowTitle, { fontWeight: 'bold' }]}>{logger.sessionId.toString()}</Text>
              </Text>
            ) : (
              <></>
            )
          }
        >
          <Switch
            trackColor={{ false: ColorPalette.grayscale.lightGrey, true: ColorPalette.brand.primaryDisabled }}
            thumbColor={remoteLoggingEnabled ? ColorPalette.brand.primary : ColorPalette.grayscale.mediumGrey}
            ios_backgroundColor={ColorPalette.grayscale.lightGrey}
            onValueChange={toggleRemoteLoggingSwitch}
            value={remoteLoggingEnabled}
          />
        </SectionRow>
        <SectionRow
          title={t('Developer.EnableProxy')}
          accessibilityLabel={t('Developer.EnableProxy')}
          testID={testIdWithKey('ToggleEnableProxy')}
        >
          <Switch
            trackColor={{ false: ColorPalette.grayscale.lightGrey, true: ColorPalette.brand.primaryDisabled }}
            thumbColor={enableProxy ? ColorPalette.brand.primary : ColorPalette.grayscale.mediumGrey}
            ios_backgroundColor={ColorPalette.grayscale.lightGrey}
            onValueChange={toggleEnableProxySwitch}
            value={enableProxy}
          />
        </SectionRow>

        <SectionRow
          title={t('Developer.SwitchTheme')}
          accessibilityLabel={t('Developer.SwitchTheme')}
          testID={testIdWithKey('ToggleTheme')}
        >
          <Switch
            trackColor={{ false: ColorPalette.grayscale.lightGrey, true: ColorPalette.brand.primaryDisabled }}
            thumbColor={
              themeName === BCThemeNames.BCSC ? ColorPalette.brand.primary : ColorPalette.grayscale.mediumGrey
            }
            ios_backgroundColor={ColorPalette.grayscale.lightGrey}
            onValueChange={toggleTheme}
            value={themeName === BCThemeNames.BCSC}
          />
        </SectionRow>

        <SectionRow
          title={t('Developer.SwitchMode')}
          accessibilityLabel={t('Developer.SwitchMode')}
          testID={testIdWithKey('ToggleMode')}
        >
          <Switch
            trackColor={{ false: ColorPalette.grayscale.lightGrey, true: ColorPalette.brand.primaryDisabled }}
            thumbColor={!BCSCMode ? ColorPalette.grayscale.mediumGrey : ColorPalette.brand.primary}
            ios_backgroundColor={ColorPalette.grayscale.lightGrey}
            onValueChange={toggleMode}
            value={BCSCMode}
          />
        </SectionRow>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Developer
