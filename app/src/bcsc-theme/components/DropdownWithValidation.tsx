import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useState } from 'react'
import { FlatList, Modal, Pressable, SafeAreaView, StyleProp, StyleSheet, TextStyle, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

export type DropdownOption<T> = {
  label: string
  value: T
}

type DropdownWithValidationProps<T> = {
  id: string
  value: T | null
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  label: string
  placeholder?: string
  subtext?: string
  error?: string
  labelProps?: StyleProp<TextStyle>
  subtextProps?: StyleProp<TextStyle>
  errorProps?: StyleProp<TextStyle>
}

/**
 * A unified dropdown component with label, selectable options list, subtext and error display.
 * Uses a modal with a scrollable list for consistent behavior on both iOS and Android.
 *
 * @param {DropdownWithValidationProps} props - Dropdown props
 * @returns {*} {React.ReactElement}
 */
export const DropdownWithValidation = <T extends string | number>({
  id,
  value,
  options,
  onChange,
  label,
  placeholder = 'Select an option',
  subtext,
  error,
  labelProps,
  subtextProps,
  errorProps,
}: DropdownWithValidationProps<T>) => {
  const { Inputs, ColorPalette, Spacing } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  const styles = StyleSheet.create({
    dropdownButton: {
      ...Inputs.textInput,
      borderColor: error ? ColorPalette.semantic.error : Inputs.textInput.borderColor,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
    },
    dropdownText: {
      fontSize: 16,
      flex: 1,
    },
    dropdownTextSelected: {
      color: Inputs.textInput.color,
    },
    dropdownTextPlaceholder: {
      color: ColorPalette.grayscale.mediumGrey,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      maxHeight: '100%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: ColorPalette.brand.secondary,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: Spacing.xs,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
    },
    optionItemSelected: {
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    optionText: {
      fontSize: 16,
      color: ColorPalette.brand.secondary,
    },
    optionTextSelected: {
      fontWeight: '600',
      color: ColorPalette.brand.primary,
    },
  })

  const handleSelect = (selectedValue: T) => {
    onChange(selectedValue)
    setIsOpen(false)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const renderOption = ({ item, index }: { item: DropdownOption<T>; index: number }) => {
    const isSelected = item.value === value
    const isLastItem = index === options.length - 1
    return (
      <Pressable
        style={[styles.optionItem, isSelected && styles.optionItemSelected, isLastItem && { borderBottomWidth: 0 }]}
        onPress={() => handleSelect(item.value)}
        testID={testIdWithKey(`${id}-option-${item.value}`)}
        accessibilityRole="menuitem"
        accessibilityState={{ selected: isSelected }}
      >
        <ThemedText style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item.label}</ThemedText>
        {isSelected && <Icon name="check" size={20} color={ColorPalette.brand.primary} />}
      </Pressable>
    )
  }

  return (
    <View>
      <ThemedText
        variant={'labelTitle'}
        style={[{ marginBottom: 8 }, labelProps]}
        testID={testIdWithKey(`${id}-label`)}
      >
        {label}
      </ThemedText>

      <Pressable
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
        testID={testIdWithKey(`${id}-input`)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${label}, ${selectedOption?.label || placeholder}`}
      >
        <ThemedText
          style={[styles.dropdownText, selectedOption ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder]}
        >
          {selectedOption?.label || placeholder}
        </ThemedText>
        <Icon name="keyboard-arrow-down" size={24} color={ColorPalette.grayscale.mediumGrey} />
      </Pressable>

      {error ? (
        <ThemedText
          style={[{ marginTop: 4, color: ColorPalette.semantic.error, fontSize: 12 }, errorProps]}
          testID={testIdWithKey(`${id}-error`)}
        >
          {error}
        </ThemedText>
      ) : null}

      {subtext && !error ? (
        <ThemedText
          style={[{ marginTop: 8 }, subtextProps]}
          variant={'labelSubtitle'}
          testID={testIdWithKey(`${id}-subtext`)}
        >
          {subtext}
        </ThemedText>
      ) : null}

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <SafeAreaView>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
              testID={testIdWithKey(`${id}-modal-content`)}
            >
              <View style={styles.modalHeader}>
                <View style={{ width: 32 }} />
                <ThemedText style={styles.modalTitle}>{subtext}</ThemedText>
                <Pressable
                  style={styles.closeButton}
                  onPress={handleClose}
                  testID={testIdWithKey(`${id}-close`)}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Icon name="close" size={24} color={ColorPalette.brand.secondary} />
                </Pressable>
              </View>
              <FlatList
                data={options}
                renderItem={renderOption}
                keyExtractor={(item) => String(item.value)}
                accessibilityRole="menu"
              />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  )
}
