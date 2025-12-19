import {
  AutoLockTime,
  DispatchAction,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useStore,
  useTheme,
} from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import Icon from 'react-native-vector-icons/MaterialIcons'

type AutoLockListItem = {
  title: string
  value: (typeof AutoLockTime)[keyof typeof AutoLockTime]
  testID: string
  onPress: (val: (typeof AutoLockTime)[keyof typeof AutoLockTime]) => void
}

type LockoutRowProps = AutoLockListItem & {
  selected: boolean
}

export const AutoLockScreen: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const { ColorPalette, SettingsTheme, Spacing } = useTheme()
  const currentLockoutTime = store.preferences.autoLockTime ?? AutoLockTime.FiveMinutes

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      width: '100%',
    },
    section: {
      backgroundColor: SettingsTheme.groupBackground,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.brand.primaryBackground,
      marginHorizontal: Spacing.lg,
    },
    checkboxContainer: {
      justifyContent: 'center',
    },
  })

  const handleTimeoutChange = (time: (typeof AutoLockTime)[keyof typeof AutoLockTime]) => {
    dispatch({
      type: DispatchAction.AUTO_LOCK_TIME,
      payload: [time],
    })
  }

  const LockoutRow: React.FC<LockoutRowProps> = ({ title, value, selected, testID, onPress }) => (
    <View style={[styles.section, styles.sectionRow]}>
      <ThemedText variant="title">{title}</ThemedText>
      <Pressable
        style={styles.checkboxContainer}
        accessibilityLabel={title}
        accessibilityRole={'checkbox'}
        testID={testIdWithKey('ToggleAutoLockSwitch')}
      >
        <BouncyCheckbox
          accessibilityLabel={String(value)}
          disableText
          fillColor={ColorPalette.brand.secondaryBackground}
          unfillColor={ColorPalette.brand.secondaryBackground}
          size={36}
          innerIconStyle={{ borderColor: ColorPalette.brand.primary, borderWidth: 2 }}
          ImageComponent={() => <Icon name="circle" size={18} color={ColorPalette.brand.primary} />}
          onPress={() => onPress(value)}
          isChecked={selected}
          disableBuiltInState
          testID={testIdWithKey(testID)}
        />
      </Pressable>
    </View>
  )

  return (
    <ScreenWrapper scrollable={false} edges={['bottom']}>
      <FlatList
        data={[
          {
            title: t('AutoLockTimes.FiveMinutes'),
            value: AutoLockTime.FiveMinutes,
            testID: `auto-lock-time-${AutoLockTime.FiveMinutes}`,
            onPress: handleTimeoutChange,
          },
          {
            title: t('AutoLockTimes.ThreeMinutes'),
            value: AutoLockTime.ThreeMinutes,
            testID: `auto-lock-time-${AutoLockTime.ThreeMinutes}`,
            onPress: handleTimeoutChange,
          },
          {
            title: t('AutoLockTimes.OneMinute'),
            value: AutoLockTime.OneMinute,
            testID: `auto-lock-time-${AutoLockTime.OneMinute}`,
            onPress: handleTimeoutChange,
          },
        ]}
        renderItem={({ item }) => {
          const data: AutoLockListItem = item
          return (
            <LockoutRow
              title={data.title}
              selected={currentLockoutTime === data.value}
              value={data.value}
              testID={data.testID}
              onPress={data.onPress}
            />
          )
        }}
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: SettingsTheme.groupBackground }}>
            <View style={styles.itemSeparator} />
          </View>
        )}
      />
    </ScreenWrapper>
  )
}
