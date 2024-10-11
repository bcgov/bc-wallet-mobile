import { useTheme, useStore, testIdWithKey, DispatchAction } from '@hyperledger/aries-bifold-core'
import { i18n, Locales } from '@hyperledger/aries-bifold-core/App/localization'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { getVersion } from 'react-native-device-info'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'

import { Screens, SettingStackParams, Stacks } from '../navigators/navigators'
import { BCState } from '../store'

import Developer from './Developer'

type SettingsProps = StackScreenProps<SettingStackParams>

const Settings: React.FC<SettingsProps> = ({ navigation }) => {
  const { SettingsTheme, TextTheme, ColorPallet } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const currentLanguage = i18n.t('Language.code', { context: i18n.language as Locales })
  const developerOptionCount = useRef(0)
  const { t } = useTranslation()

  const touchCountToEnableBiometrics = 9
  const iconSize = 30
  const nbNotifDays = 30

  const incrementDeveloperMenuCounter = () => {
    if (developerOptionCount.current >= touchCountToEnableBiometrics) {
      developerOptionCount.current = 0
      dispatch({
        type: DispatchAction.ENABLE_DEVELOPER_MODE,
        payload: [true],
      })

      return
    }

    developerOptionCount.current = developerOptionCount.current + 1
  }

  const styles = StyleSheet.create({
    container: {
      flex: 2,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    mainSection: {
      flex: 5,
    },
    textHeaderTitle: {
      ...TextTheme.headingThree,
      flexShrink: 1,
      color: TextTheme.headingThree.color,
      paddingTop: 8,
      paddingBottom: 8,
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
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 20,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    rowTitle: {
      ...TextTheme.headingFour,
      flex: 1,
      fontWeight: 'normal',
      flexWrap: 'wrap',
    },
    sectionSeparator: {
      marginBottom: 10,
    },
    rowSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.secondary,
      marginTop: 10,
    },
  })
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
    rowIcon?: JSX.Element
  }
  const SectionRow = ({
    title,
    accessibilityLabel,
    testID,
    onPress,
    children,
    showRowSeparator,
    subContent,
    rowIcon,
  }: SectionRowProps) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} testID={testID} onPress={onPress}>
      <View style={[styles.section]}>
        <View style={styles.sectionRow}>
          <Text style={styles.rowTitle}>{title}</Text>
          {children}
          {rowIcon}
        </View>
        {subContent}
      </View>
      {showRowSeparator && (
        <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
          <View style={[styles.rowSeparator]}></View>
        </View>
      )}
    </TouchableOpacity>
  )
  const arrowIcon = <MaterialIcon name={'keyboard-arrow-right'} size={iconSize} />
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader title={t('Settings.Preference')} />
        <SectionRow
          title={t('Settings.Language')}
          accessibilityLabel={t('Settings.Language')}
          testID={testIdWithKey(t('Settings.Language').toLowerCase())}
          onPress={() => navigation.navigate(Screens.Language)}
          showRowSeparator
          rowIcon={arrowIcon}
        >
          <Text style={[TextTheme.headingFour, { fontWeight: 'normal' }]}>{currentLanguage}</Text>
        </SectionRow>
        <View style={[styles.sectionSeparator]}></View>
        <SectionRow
          title={t('Settings.History')}
          accessibilityLabel={t('Settings.History')}
          testID={testIdWithKey(t('Settings.History').toLowerCase())}
          onPress={() => navigation.navigate(Screens.HistoryPage)}
          rowIcon={arrowIcon}
        >
          <Text style={[TextTheme.headingFour, { fontWeight: 'normal' }]}>
            {` ${nbNotifDays} ${t('Settings.Days')}`}
          </Text>
        </SectionRow>
        <SectionHeader title={t('Settings.Security')} />
        <SectionRow
          title={t('Settings.MyPin')}
          accessibilityLabel={t('Settings.MyPin')}
          testID={testIdWithKey(t('Settings.MyPin').toLowerCase())}
          onPress={() =>
            navigation
              .getParent()
              ?.navigate(Stacks.SettingsStack, { screen: Screens.CreatePIN, params: { updatePin: true } })
          }
          showRowSeparator
          rowIcon={arrowIcon}
        >
          <Text style={[TextTheme.headingFour, { fontWeight: 'normal' }]}>{t('Settings.ChangePin')}</Text>
        </SectionRow>
        <View style={[styles.sectionSeparator]}></View>
        <SectionRow
          title={t('Settings.Biometrics')}
          accessibilityLabel={t('Settings.Biometrics')}
          testID={testIdWithKey(t('Settings.Biometrics').toLowerCase())}
          onPress={() => navigation.navigate(Screens.UseBiometry)}
          showRowSeparator
          rowIcon={arrowIcon}
        >
          <Text style={[TextTheme.headingFour, { fontWeight: 'normal' }]}>
            {store.preferences.useBiometry ? t('Settings.BiometricActive') : t('Settings.BiometricDisabled')}
          </Text>
        </SectionRow>
        <View style={[styles.sectionSeparator]}></View>
        <SectionRow
          title={t('Settings.Version')}
          accessibilityLabel={t('Settings.Version')}
          testID={testIdWithKey(t('Settings.Version').toLowerCase())}
          onPress={() => {
            incrementDeveloperMenuCounter()
          }}
        >
          <Text style={[TextTheme.headingFour, { fontWeight: 'normal' }]}>{getVersion()} </Text>
        </SectionRow>

        {store.preferences.developerModeEnabled && <Developer />}
      </ScrollView>
    </SafeAreaView>
  )
}

export default Settings
