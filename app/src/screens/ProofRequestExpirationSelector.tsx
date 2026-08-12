import {
  Button,
  ButtonType,
  ProofRequestExpirationTime,
  testIdWithKey,
  usePreventDoublePress,
  useTheme,
} from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface ProofRequestExpirationSelectorProps {
  currentValueMs: number
  onSelect: (valueMs: number) => void
  onCancel: () => void
}

type ProofRequestExpirationOption = {
  labelKey: string
  valueMs: (typeof ProofRequestExpirationTime)[keyof typeof ProofRequestExpirationTime]
}

const OPTIONS: ProofRequestExpirationOption[] = [
  { labelKey: 'Developer.ProofRequestExpirationTimes.TwoMinutes', valueMs: ProofRequestExpirationTime.TwoMinutes },
  { labelKey: 'Developer.ProofRequestExpirationTimes.OneHour', valueMs: ProofRequestExpirationTime.OneHour },
  {
    labelKey: 'Developer.ProofRequestExpirationTimes.FortyEightHours',
    valueMs: ProofRequestExpirationTime.FortyEightHours,
  },
  { labelKey: 'Developer.ProofRequestExpirationTimes.SevenDays', valueMs: ProofRequestExpirationTime.SevenDays },
  { labelKey: 'Developer.ProofRequestExpirationTimes.Never', valueMs: ProofRequestExpirationTime.Never },
]

const ProofRequestExpirationSelector: React.FC<ProofRequestExpirationSelectorProps> = ({
  currentValueMs,
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation()
  const { ColorPalette, TextTheme, SettingsTheme } = useTheme()
  const { preventDoublePress } = usePreventDoublePress()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      width: '100%',
      flex: 1,
    },
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      paddingHorizontal: 25,
      paddingVertical: 16,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.brand.primaryBackground,
      marginHorizontal: 25,
    },
  })

  const handlePress = (valueMs: number) => {
    onSelect(valueMs)
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={OPTIONS}
        renderItem={({ item }) => (
          <View style={[styles.section, styles.sectionRow]}>
            <Text style={TextTheme.title}>{t(item.labelKey)}</Text>
            <BouncyCheckbox
              accessibilityLabel={t(item.labelKey)}
              disableText
              fillColor={ColorPalette.brand.secondaryBackground}
              unfillColor={ColorPalette.brand.secondaryBackground}
              size={36}
              innerIconStyle={{ borderColor: ColorPalette.brand.primary, borderWidth: 2 }}
              ImageComponent={() => <Icon name="circle" size={18} color={ColorPalette.brand.primary}></Icon>}
              onPress={preventDoublePress(() => handlePress(item.valueMs))}
              isChecked={item.valueMs === currentValueMs}
              disableBuiltInState
              testID={testIdWithKey(`proof-request-expiration-${item.valueMs}`)}
            />
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
            <View style={styles.itemSeparator}></View>
          </View>
        )}
      />
      <View style={{ marginTop: 30, marginHorizontal: 20 }}>
        <Button
          title={t('Global.Cancel')}
          accessibilityLabel={t('Global.Cancel')}
          testID={testIdWithKey('Cancel')}
          onPress={onCancel}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </SafeAreaView>
  )
}

export default ProofRequestExpirationSelector
