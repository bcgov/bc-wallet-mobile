import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useRef, useState } from 'react'
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
  const { Inputs, ColorPalette, Spacing } = useTheme()
  const inputRef = useRef<TextInput>(null)
  const [isFocused, setIsFocused] = useState(false)

  const styles = StyleSheet.create({
    label: {
      marginBottom: Spacing.sm,
    },
    inputContainer: {
      ...Inputs.textInput,
      shadowColor: Inputs.inputSelected.shadowColor,
      shadowOffset: Inputs.inputSelected.shadowOffset,
      shadowRadius: Inputs.inputSelected.shadowRadius,
      shadowOpacity: 0,
      elevation: 0,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 1, // Offset border width to prevent layout shift
    },
    input: {
      flex: 1,
      padding: Inputs.textInput.padding,
      paddingHorizontal: Inputs.textInput.paddingHorizontal,
      color: props.error ? ColorPalette.semantic.error : Inputs.textInput.color,
      fontSize: Inputs.textInput.fontSize,
    },
    inputFocused: {
      ...Inputs.inputSelected,
      padding: 0,
    },
    inputError: {
      ...Inputs.inputSelected,
      borderColor: ColorPalette.semantic.error,
      shadowColor: ColorPalette.semantic.error,
      padding: 0,
    },
    inputErrorIcon: {
      marginRight: Spacing.sm,
    },
    subtext: {
      marginTop: Spacing.sm,
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

      <View style={[styles.inputContainer, isFocused && styles.inputFocused, props.error && styles.inputError]}>
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
            size={Spacing.lg}
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
