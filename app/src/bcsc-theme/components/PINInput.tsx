import { PIN_LENGTH } from '@/constants'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface PINInputProps {
  onPINChange?: (pin: string) => void
  onPINComplete?: (pin: string) => void
  errorMessage?: string
  autoFocus?: boolean
  ref?: React.Ref<TextInput>
}

export const PINInput = ({ onPINChange, onPINComplete, errorMessage, autoFocus = false, ref }: PINInputProps) => {
  const [pin, setPin] = useState('')
  const { ColorPalette, Spacing, PINInputTheme } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const styles = StyleSheet.create({
    pinInputContainer: {
      gap: Spacing.sm,
    },
    inputContainer: {
      flexDirection: 'row',
<<<<<<< Updated upstream
      borderWidth: 2,
      borderColor: isFocused ? PINInputTheme.focussedCell.borderColor : PINInputTheme.cell.backgroundColor,
=======
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingRight: Spacing.sm,
      borderWidth: 1,
      borderColor: isFocused ? ColorPalette.brand.primary : PINInputTheme.cell.backgroundColor,
>>>>>>> Stashed changes
      borderRadius: Spacing.xs,
      backgroundColor: PINInputTheme.cell.backgroundColor,
    },
    input: {
<<<<<<< Updated upstream
      ...PINInputTheme.cellText,
      flex: 1,
      paddingHorizontal: Spacing.sm,
      minHeight: 50,
      fontSize: 24,
      fontWeight: 'bold',
      letterSpacing: Spacing.sm,
    },
    visibilityButton: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.sm,
=======
      // ...TextTheme.headingThree,
      // ...PINInputTheme.cellText,
      flex: 1,
      paddingVertical: Spacing.sm,
      paddingHorizontal: 12,
      letterSpacing: Spacing.sm,
      lineHeight: 32,
      fontSize: 24,
    },
    eyeIcon: {
      padding: 5,
    },
    pinInput: {
      gap: Spacing.sm,
>>>>>>> Stashed changes
    },
  })

  const handlePINChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = String(value.replaceAll(/\D/g, '')).slice(0, PIN_LENGTH)
    setPin(numericValue)
    onPINChange?.(numericValue)

    if (numericValue.length === PIN_LENGTH) {
      onPINComplete?.(numericValue)
    }
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  return (
<<<<<<< Updated upstream
    <View style={styles.pinInputContainer}>
=======
    <View style={styles.pinInput}>
>>>>>>> Stashed changes
      <View style={styles.inputContainer}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={pin}
          onChangeText={handlePINChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="number-pad"
          secureTextEntry={!isVisible}
          maxLength={PIN_LENGTH}
          autoFocus={autoFocus}
          maxFontSizeMultiplier={1}
          cursorColor={ColorPalette.grayscale.darkGrey}
          textContentType={'password'}
          accessibilityLabel={pin.split('').join(' ')}
          accessibilityHint="Enter your 6-digit PIN"
        />
        <TouchableOpacity
          style={styles.visibilityButton}
          onPress={toggleVisibility}
          testID={testIdWithKey('VisibilityButton')}
          accessibilityLabel={isVisible ? 'Hide PIN' : 'Show PIN'}
        >
          <Icon name={isVisible ? 'eye' : 'eye-off'} size={32} color={ColorPalette.grayscale.darkGrey} />
        </TouchableOpacity>
      </View>
      {errorMessage && <ThemedText variant={'inlineErrorText'}>{errorMessage}</ThemedText>}
    </View>
  )
}

PINInput.displayName = 'PINInput'
