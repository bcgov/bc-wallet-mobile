import { PAIRING_CODE_LENGTH } from '@/constants'
import { useTheme } from '@bifold/core'
import { splitSplice } from '@utils/splitSplice'
import React, { useState } from 'react'
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native'

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
    const normalized = text.toUpperCase().replace(/\s/g, '')

    // Limit to 6 characters max
    const limitedNormalized = normalized.slice(0, PAIRING_CODE_LENGTH)

    // Format the display value (add space after first 3 characters for readability)
    let formatted = limitedNormalized
    if (limitedNormalized.length > PAIRING_CODE_LENGTH / 2) {
      formatted = splitSplice(limitedNormalized, PAIRING_CODE_LENGTH / 2, 0, ' ')
    }

    // Update the displayed value
    setValue(formatted)

    // Always pass the clean version (without spaces) to the parent
    handleChangeCode(limitedNormalized)
  }

  return (
    <View style={styles.container}>
      <TextInput
        maxLength={PAIRING_CODE_LENGTH + 1} // +1 for the space
        autoCapitalize={'characters'}
        autoComplete={'off'}
        autoCorrect={false}
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
