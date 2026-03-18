import { hitSlop } from '@/constants'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useRef, useState } from 'react'
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from 'react-native'
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
    },
    input: {
      flex: 1,
      color: props.error ? ColorPalette.semantic.error : Inputs.textInput.color,
      fontSize: Inputs.textInput.fontSize,
    },
    inputFocused: {
      ...Inputs.inputSelected,
    },
    inputError: {
      ...Inputs.inputSelected,
      borderColor: ColorPalette.semantic.error,
      shadowColor: ColorPalette.semantic.error,
    },
    inputErrorIcon: {
      marginRight: Spacing.sm,
      // Note: Reserve space for the error icon (prevents layout shift on error)
      opacity: props.error ? 1 : 0,
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

      <Pressable
        style={[styles.inputContainer, isFocused && styles.inputFocused, props.error && styles.inputError]}
        onPress={() => {
          inputRef.current?.focus()
        }}
        hitSlop={hitSlop}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, props.inputProps]}
          value={props.value}
          onChangeText={props.onChangeText}
          onChange={(e) => props.onChange?.(e.nativeEvent.text)}
          onPressIn={props.onPressIn}
          accessibilityLabel={props.label}
          testID={testIdWithKey(`${props.id}-input`)}
          keyboardType={props.keyboardType}
          {...props.textInputProps}
          onFocus={(event) => {
            setIsFocused(true)
            props.onFocus?.()
            props.textInputProps?.onFocus?.(event)
          }}
          onBlur={(event) => {
            setIsFocused(false)
            props.textInputProps?.onBlur?.(event)
          }}
        />

        <Icon
          name={'alert-circle'}
          style={styles.inputErrorIcon}
          size={Spacing.lg}
          color={ColorPalette.semantic.error}
        />
      </Pressable>

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
