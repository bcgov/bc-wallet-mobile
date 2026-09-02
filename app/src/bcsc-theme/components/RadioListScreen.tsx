import { ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import Icon from 'react-native-vector-icons/MaterialIcons'

export interface RadioListOption {
  title: string
  value: number
  testID: string
}

interface RadioListRowProps extends RadioListOption {
  selected: boolean
  onPress: (value: number) => void
}

function RadioListRow({ title, value, selected, testID, onPress }: RadioListRowProps) {
  const { ColorPalette, SettingsTheme, Spacing } = useTheme()

  const styles = StyleSheet.create({
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
    checkboxContainer: {
      justifyContent: 'center',
    },
  })

  return (
    <View style={[styles.section, styles.sectionRow]}>
      <ThemedText variant="title">{title}</ThemedText>
      <Pressable
        style={styles.checkboxContainer}
        accessibilityLabel={title}
        accessibilityRole={'checkbox'}
        testID={testIdWithKey(testID)}
      >
        <BouncyCheckbox
          accessibilityLabel={String(value)}
          disableText
          fillColor={ColorPalette.brand.secondaryBackground}
          unfillColor={ColorPalette.brand.secondaryBackground}
          size={36}
          innerIconStyle={{ borderColor: ColorPalette.brand.primary, borderWidth: 2 }}
          ImageComponent={<Icon name="circle" size={18} color={ColorPalette.brand.primary} />}
          onPress={() => onPress(value)}
          isChecked={selected}
          disableBuiltInState
        />
      </Pressable>
    </View>
  )
}

const ItemSeparator: React.FC = () => {
  const { ColorPalette, SettingsTheme, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: SettingsTheme.groupBackground,
    },
    separator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.brand.primaryBackground,
      marginHorizontal: Spacing.lg,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.separator} />
    </View>
  )
}

export interface RadioListScreenProps {
  options: RadioListOption[]
  currentValue: number
  onSelect: (value: number) => void
}

/**
 * Full-screen "pick one of N" settings screen: a list of radio-style rows, selection
 * dispatched immediately on tap. Used for value pickers like auto-lock timeout or proof
 * request expiration — callers only need to supply the option list and current value.
 */
export function RadioListScreen({ options, currentValue, onSelect }: RadioListScreenProps) {
  return (
    <ScreenWrapper scrollable={false} edges={['bottom']}>
      <FlatList
        data={options}
        keyExtractor={(item) => item.testID}
        renderItem={({ item }) => (
          <RadioListRow
            title={item.title}
            value={item.value}
            testID={item.testID}
            selected={item.value === currentValue}
            onPress={onSelect}
          />
        )}
        ItemSeparatorComponent={ItemSeparator}
      />
    </ScreenWrapper>
  )
}
