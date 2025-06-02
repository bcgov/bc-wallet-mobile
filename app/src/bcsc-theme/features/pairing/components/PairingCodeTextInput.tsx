import React, { useState } from 'react'
import { View, StyleSheet, TextInput, TextInputProps } from 'react-native'
import { useTheme } from '@bifold/core'

import { splitSplice } from '@utils/splitSplice'

interface Props extends TextInputProps {
  handleChangeCode: (text: string) => void
}

const PairingCodeTextInput: React.FC<Props> = ({ handleChangeCode, ...textInputProps }) => {
  const [focused, setFocused] = useState(false)
  const { Inputs, maxFontSizeMultiplier, Spacing } = useTheme()
  const [value, setValue] = useState('')

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.sm,
      width: '100%',
    },
  })

  // Capitalize and add a separator midway through the input
  const onChangeText = (text: string) => {
    // Clean and normalize the input (uppercase and remove spaces)
    const normalized = text.toUpperCase().replace(/\s/g, "");
    
    // Check if user is deleting characters by comparing length with previous value
    const isDeleting = normalized.length < value.replace(/\s/g, "").length;
    
    // Format the display value (add space after first 3 characters for readability)
    // Only format when not deleting or when we still have 4 or more characters
    let formatted = normalized;
    if (!isDeleting || normalized.length >= 4) {
      if (normalized.length >= 3) {
        formatted = splitSplice(normalized, 3, 0, ' ');
      }
    }
    
    // Update the displayed value
    setValue(formatted);
    
    // Always pass the clean version (without spaces) to the parent
    handleChangeCode(normalized);
  }

  return (
    <View style={styles.container}>
      <TextInput
        maxLength={7}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[Inputs.textInput, focused && Inputs.inputSelected, { textAlign: 'center' }]}
        selectionColor={Inputs.inputSelected.borderColor}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={value}
        onChangeText={onChangeText}
        {...textInputProps}
      />
    </View>
  )
}

export default PairingCodeTextInput