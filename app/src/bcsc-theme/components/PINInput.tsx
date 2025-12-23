import { PIN_LENGTH } from '@/constants'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React, { forwardRef, useState } from 'react'
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface PINInputProps {
  onPINChange?: (pin: string) => void
  onPINComplete?: (pin: string) => void
  errorMessage?: string
  autoFocus?: boolean
}

export const PINInput = forwardRef<TextInput, PINInputProps>(
  ({ onPINChange, onPINComplete, errorMessage, autoFocus = false }, ref) => {
    const [pin, setPin] = useState('')
    const { ColorPalette, Spacing, TextTheme, PINInputTheme } = useTheme()
    const [isVisible, setIsVisible] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const styles = StyleSheet.create({
      inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: isFocused ? ColorPalette.brand.primary : PINInputTheme.cell.backgroundColor,
        borderRadius: Spacing.xs,
        backgroundColor: PINInputTheme.cell.backgroundColor,
        padding: Spacing.sm,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
      },
      input: {
        height: PINInputTheme.cell.height,
        ...TextTheme.headingThree,
        ...PINInputTheme.cellText,
        flex: 1,
        letterSpacing: Spacing.sm,
        textAlignVertical: 'center',
      },
      eyeIcon: {
        padding: 5,
      },
      errorContainer: {
        minHeight: 20,
        justifyContent: 'flex-start',
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
      <>
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
            style={styles.eyeIcon}
            onPress={toggleVisibility}
            testID={testIdWithKey('VisibilityButton')}
            accessibilityLabel={isVisible ? 'Hide PIN' : 'Show PIN'}
          >
            <Icon name={isVisible ? 'eye' : 'eye-off'} size={32} color={ColorPalette.grayscale.darkGrey} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          {errorMessage && <ThemedText variant={'inlineErrorText'}>{errorMessage}</ThemedText>}
        </View>
      </>
    )
  }
)

PINInput.displayName = 'PINInput'
