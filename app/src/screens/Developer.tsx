import { StackScreenProps } from '@react-navigation/stack'
import { useConfiguration, useTheme, useStore } from 'aries-bifold'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, SectionList, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

// import { useConfiguration } from '../contexts/configuration'
// import { DispatchAction } from '../contexts/reducers/store'
// import { useStore } from '../contexts/store'
// import { useTheme } from '../contexts/theme'
// import { Locales } from '../localization'
// import { GenericFn } from '../types/fn'
// import { Screens, SettingStackParams, Stacks } from '../types/navigators'
// import { SettingSection } from '../types/settings'
// import { testIdWithKey } from '../utils/testable'

// type SettingsProps = StackScreenProps<SettingStackParams>
interface DeveloperProps {
  navigation: any
}

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

const Settings: React.FC<DeveloperProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const { SettingsTheme, TextTheme, ColorPallet } = useTheme()
  // const { settings } = useConfiguration()

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

  const settingsSections: SettingSection[] = [
    {
      header: {
        icon: 'apartment',
        title: 'IAS',
      },
      data: [
        {
          title: 'Environment',
          accessibilityLabel: 'Environment',
          testID: 'xxx',
          onPress: () => {
            return
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
          testID: 'xxxx',
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
    <SafeAreaView>
      <Modal
        visible={true}
        transparent={true}
        animationType={'slide'}
        onRequestClose={() => {
          return
        }}
      >
        <View style={{ backgroundColor: 'red', flex: 1 }} />
      </Modal>
      <View style={styles.container}>
        <SectionList
          renderItem={({ item: { title, value, onPress } }) => (
            <SectionRow
              title={title}
              accessibilityLabel={title}
              // testID={testIdWithKey(title)}
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
        ></SectionList>
      </View>
    </SafeAreaView>
  )
}

export default Settings
