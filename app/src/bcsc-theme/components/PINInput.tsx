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
  /** Test ID key for e2e (e.g. 'PINInput1'). Used for input and VisibilityButton (key + 'VisibilityButton'). */
  testIDKey?: string
  ref?: React.Ref<TextInput>
}

export const PINInput = ({
  onPINChange,
  onPINComplete,
  errorMessage,
  autoFocus = false,
  testIDKey,
  ref,
}: PINInputProps) => {
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
      borderWidth: 2,
      borderColor: isFocused ? PINInputTheme.focussedCell.borderColor : PINInputTheme.cell.backgroundColor,
      borderRadius: Spacing.xs,
      backgroundColor: PINInputTheme.cell.backgroundColor,
    },
    input: {
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
    <View style={styles.pinInputContainer}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={ref}
          testID={testIDKey ? testIdWithKey(testIDKey) : undefined}
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
          testID={testIDKey ? testIdWithKey(`${testIDKey}VisibilityButton`) : testIdWithKey('VisibilityButton')}
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
