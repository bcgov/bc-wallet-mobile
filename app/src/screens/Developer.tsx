import { useTheme, useStore, testIdWithKey, DispatchAction } from 'aries-bifold'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, SectionList, StyleSheet, Switch, Text, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import { BCState } from '../store'

import IASEnvironment from './IASEnvironment'

interface Setting {
  title: string
  value?: string
  onPress?: () => void
  accessibilityLabel?: string
  testID?: string
}

interface SettingSection {
  header: {
    title: string
    icon: string
  }
  data: Setting[]
}

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { SettingsTheme, TextTheme, ColorPallet } = useTheme()
  const [environmentModalVisible, setEnvironmentModalVisible] = useState<boolean>(false)
  const [devMode, setDevMode] = useState<boolean>(true)
  const [useVerifierCapability, setUseVerifierCapability] = useState<boolean>(!!store.preferences.useVerifierCapability)
  const [useConnectionInviterCapability, setConnectionInviterCapability] = useState(
    !!store.preferences.useConnectionInviterCapability
  )
  const [useDevVerifierTemplates, setDevVerifierTemplates] = useState(!!store.preferences.useDevVerifierTemplates)

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.primaryBackground,
      width: '100%',
    },
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      paddingHorizontal: 25,
      paddingVertical: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 0,
      marginBottom: -11,
    },
    sectionSeparator: {
      marginBottom: 10,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.primaryBackground,
      marginHorizontal: 25,
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

  const settingsSections: SettingSection[] = [
    {
      header: {
        icon: 'apartment',
        title: 'IAS',
      },
      data: [
        {
          title: t('Developer.Environment'),
          value: store.developer.environment.name,
          accessibilityLabel: t('Developer.Environment'),
          testID: testIdWithKey('Environment'),
          onPress: () => {
            setEnvironmentModalVisible(true)
          },
        },
      ],
    },
  ]

  if (store.preferences.developerModeEnabled) {
    const section = settingsSections.find((item) => item.header.title === t('Settings.AppSettings'))
    if (section) {
      section.data = [
        ...section.data,
        {
          title: t('Settings.Developer'),
          accessibilityLabel: t('Settings.Developer'),
          testID: testIdWithKey('Developer'),
          onPress: () => {
            return
          },
        },
      ]
    }
  }

  const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
    <View style={[styles.section, styles.sectionHeader]}>
      <Icon name={icon} size={24} style={{ marginRight: 10, color: TextTheme.normal.color }} />
      <Text style={[TextTheme.headingThree, { flexShrink: 1 }]}>{title}</Text>
    </View>
  )

  const SectionRow: React.FC<{
    title: string
    accessibilityLabel?: string
    testID?: string
    onPress?: () => void
  }> = ({ title, accessibilityLabel, testID, onPress, children }) => (
    <View style={[styles.section, { flexDirection: 'row' }]}>
      <Text style={[TextTheme.headingFour, { flexGrow: 1, fontWeight: 'normal' }]}>{title}</Text>
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

  const toggleConnectionInviterCapabilitySwitch = () => {
    dispatch({
      type: DispatchAction.USE_CONNECTION_INVITER_CAPABILITY,
      payload: [!useConnectionInviterCapability],
    })
    setConnectionInviterCapability((previousState) => !previousState)
  }

  const toggleDevVerifierTemplatesSwitch = () => {
    // if we switch on dev templates we can assume the user also wants to enable the verifier capability
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
      <View style={styles.container}>
        <SectionRow
          title={t('Developer.DeveloperMode')}
          accessibilityLabel={t('Developer.Toggle')}
          testID={testIdWithKey('ToggleDeveloper')}
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
        <SectionList
          renderItem={({ item: { title, value, onPress } }) => (
            <SectionRow
              title={title}
              accessibilityLabel={title}
              testID={testIdWithKey(title.toLowerCase())}
              onPress={onPress}
            >
              <Text style={[TextTheme.headingFour, { fontWeight: 'normal', color: ColorPallet.brand.link }]}>
                {value}
              </Text>
            </SectionRow>
          )}
          renderSectionHeader={({
            section: {
              header: { title, icon },
            },
          }) => <SectionHeader icon={icon} title={title} />}
          ItemSeparatorComponent={() => (
            <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
              <View style={[styles.itemSeparator]}></View>
            </View>
          )}
          SectionSeparatorComponent={() => <View style={[styles.sectionSeparator]}></View>}
          sections={settingsSections}
          stickySectionHeadersEnabled={false}
        />
        <SectionRow
          title={t('Verifier.UseVerifierCapability')}
          accessibilityLabel={t('Verifier.Toggle')}
          testID={testIdWithKey('ToggleVerifierCapability')}
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
          title={t('Connection.UseConnectionInviterCapability')}
          accessibilityLabel={t('Connection.Toggle')}
          testID={testIdWithKey('ToggleConnectionInviterCapabilitySwitch')}
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
        >
          <Switch
            trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
            thumbColor={useDevVerifierTemplates ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
            ios_backgroundColor={ColorPallet.grayscale.lightGrey}
            onValueChange={toggleDevVerifierTemplatesSwitch}
            value={useDevVerifierTemplates}
          />
        </SectionRow>
      </View>
    </SafeAreaView>
  )
}

export default Settings
