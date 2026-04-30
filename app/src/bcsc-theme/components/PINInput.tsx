import { PIN_LENGTH } from '@/constants'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { a11yLabel } from '@utils/accessibility'

interface PINInputProps {
  onPINChange?: (pin: string) => void
  onPINComplete?: (pin: string) => void
  errorMessage?: string
  autoFocus?: boolean
  /** Accessibility label for the PIN input field */
  accessibilityLabel?: string
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
  accessibilityLabel,
}: PINInputProps) => {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const { ColorPalette, Spacing, PINInputTheme, TextTheme } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const styles = StyleSheet.create({
    pinInputContainer: {
      gap: Spacing.sm,
    },
    inputContainer: {
      flexDirection: 'row',
      borderWidth: 2,
      borderColor: isFocused ? PINInputTheme.focussedCell.borderColor : PINInputTheme.cell.borderColor,
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
          accessibilityLabel={a11yLabel(accessibilityLabel ?? pin.split('').join(' '))}
          accessibilityHint="Enter your 6-digit PIN"
        />
        <TouchableOpacity
          style={styles.visibilityButton}
          onPress={toggleVisibility}
          testID={testIDKey ? testIdWithKey(`${testIDKey}VisibilityButton`) : testIdWithKey('VisibilityButton')}
          accessibilityLabel={a11yLabel(isVisible ? t('PINCreate.Hide') : t('PINCreate.Show'))}
          accessibilityRole="button"
        >
          <Icon name={isVisible ? 'eye' : 'eye-off'} size={32} color={TextTheme.headingFour.color} />
        </TouchableOpacity>
      </View>
      {errorMessage && <ThemedText variant={'inlineErrorText'}>{errorMessage}</ThemedText>}
    </View>
  )
}

PINInput.displayName = 'PINInput'
