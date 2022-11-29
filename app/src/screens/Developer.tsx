import { useTheme, useStore, testIdWithKey } from 'aries-bifold'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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
  const [store] = useStore<BCState>()
  const { SettingsTheme, TextTheme, ColorPallet } = useTheme()
  const [environmentModalVisible, setEnvironmentModalVisible] = useState<boolean>(false)

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
          testID: testIdWithKey('environment'),
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
          testID: testIdWithKey('developer'),
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
    value?: string
    accessibilityLabel?: string
    testID?: string
    onPress?: () => void
  }> = ({ title, value, accessibilityLabel, testID, onPress }) => (
    <View style={[styles.section]}>
      <TouchableOpacity
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={styles.sectionRow}
        onPress={onPress}
      >
        <Text style={[TextTheme.headingFour, { fontWeight: 'normal' }]}>{title}</Text>
        <Text style={[TextTheme.headingFour, { fontWeight: 'normal', color: ColorPallet.brand.link }]}>{value}</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']}>
      <Modal
        visible={environmentModalVisible}
        transparent={true}
        animationType={'slide'}
        onRequestClose={() => {
          return
        }}
      >
        <IASEnvironment shouldDismissModal={shouldDismissModal} />
      </Modal>
      <View style={styles.container}>
        <SectionList
          renderItem={({ item: { title, value, onPress } }) => (
            <SectionRow
              title={title}
              accessibilityLabel={title}
              testID={testIdWithKey(title.toLowerCase())}
              value={value}
              onPress={onPress}
            />
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
        ></SectionList>
      </View>
    </SafeAreaView>
  )
}

export default Settings
