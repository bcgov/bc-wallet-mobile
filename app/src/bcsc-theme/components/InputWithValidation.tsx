import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useCallback, useRef, useState } from 'react'
import { LayoutChangeEvent, StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type InputWithValidationProps = {
  id: string // unique input identifier
  value: string
  onChange?: (value: string) => void
  onChangeText?: (value: string) => void
  onLayout?: (e: LayoutChangeEvent) => void
  label: string
  onFocus?: () => void
  onPressIn?: () => void
  subtext?: string
  error?: string
  labelProps?: StyleProp<TextStyle>
  inputProps?: StyleProp<TextStyle>
  subtextProps?: StyleProp<TextStyle>
  errorProps?: StyleProp<TextStyle>
  textInputProps?: TextInputProps
  keyboardType?: TextInputProps['keyboardType']
}

/**
 * An input component which includes a label, input, subtext and error props.
 *
 * Note: This also includes the equivalent styling props for each section for customization.
 *
 * @param {InputWithValidationProps} props - Input props
 * @returns {*} {React.ReactElement}
 */
export const InputWithValidation: React.FC<InputWithValidationProps> = (props: InputWithValidationProps) => {
  const { Inputs, ColorPalette } = useTheme()
  const inputRef = useRef<TextInput>(null)
  const [isFocused, setIsFocused] = useState(false)

  const getInputAccentColour = useCallback(
    (error: string | undefined, isFocused: boolean) => {
      if (error) {
        return ColorPalette.semantic.error
      }

      if (isFocused) {
        return '#7090E4'
      }

      return ColorPalette.grayscale.white
    },
    [ColorPalette]
  )

  const styles = StyleSheet.create({
    label: {
      marginBottom: 8,
    },
    inputContainer: {
      ...Inputs.textInput,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      borderWidth: 2,
      borderColor: getInputAccentColour(props.error, isFocused),
      shadowColor: getInputAccentColour(props.error, isFocused),
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isFocused ? 0.5 : 0,
      shadowRadius: isFocused ? 4 : 0,
      elevation: isFocused ? 4 : 0,
      padding: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    input: {
      flex: 1,
      padding: Inputs.textInput.padding,
      paddingHorizontal: Inputs.textInput.paddingHorizontal,
      paddingVertical: Inputs.textInput.paddingVertical,
      color: props.error ? ColorPalette.semantic.error : Inputs.textInput.color,
    },
    inputErrorIcon: {
      marginRight: 8,
    },
    subtext: {
      marginTop: 8,
    },
  })

  return (
    <View onLayout={props.onLayout}>
      <ThemedText
        variant={'labelTitle'}
        style={[styles.label, props.labelProps]}
        testID={testIdWithKey(`${props.id}-label`)}
      >
        {props.label}
      </ThemedText>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, props.inputProps]}
          value={props.value}
          onChangeText={props.onChangeText}
          onChange={(e) => props.onChange?.(e.nativeEvent.text)}
          onFocus={() => {
            setIsFocused(true)
            props.onFocus?.()
          }}
          onBlur={() => {
            setIsFocused(false)
          }}
          onPressIn={props.onPressIn}
          accessibilityLabel={props.label}
          testID={testIdWithKey(`${props.id}-input`)}
          keyboardType={props.keyboardType}
          {...props.textInputProps}
        />

        {props.error ? (
          <Icon
            name={'alert-circle'}
            style={styles.inputErrorIcon}
            size={24}
            color={ColorPalette.semantic.error}
            onPress={() => {
              inputRef.current?.focus()
            }}
          />
        ) : null}
      </View>

      <ThemedText
        style={[styles.subtext, props.subtextProps]}
        variant={'labelSubtitle'}
        testID={testIdWithKey(`${props.id}-subtext`)}
      >
        {props.error ? props.error : props.subtext}
      </ThemedText>
    </View>
  )
}
