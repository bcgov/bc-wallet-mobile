import { useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native'

interface Props extends TextInputProps {
  handleChangeEmail: (text: string) => void
}

const EmailTextInput: React.FC<Props> = ({ handleChangeEmail, ...textInputProps }) => {
  const [focused, setFocused] = useState(false)
  const { Inputs, maxFontSizeMultiplier, Spacing } = useTheme()
  const [value, setValue] = useState('')

  const onChangeText = (text: string) => {
    setValue(text)
    handleChangeEmail(text)
  }

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.sm,
      width: '100%',
    },
  })

  return (
    <View style={styles.container}>
      <TextInput
        maxLength={50}
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

export default EmailTextInput
