import { testIdWithKey, useTheme } from '@bifold/core'
import { ThemedText } from '@bifold/core'
import { StyleProp, TextInput, TextStyle, View } from 'react-native'

// NOTE (MD): This is a first pass at this component, I assume eventually we will need to modify this to
// accept number inputs as well.

type InputWithValidationProps = {
  id: string // unique input identifier
  value: string
  onChange: (value: string) => void
  label: string
  subtext?: string
  error?: string
  labelProps?: StyleProp<TextStyle>
  inputProps?: StyleProp<TextStyle>
  subtextProps?: StyleProp<TextStyle>
  errorProps?: StyleProp<TextStyle>
}

/**
 * An input component which includes a label, input, subtext and error props.
 *
 * Note: This also includes the equivalent styling props for each section for customization.
 *
 * @param {InputWithValidationProps} props - Input props
 * @returns {*} {JSX.Element}
 */
export const InputWithValidation: React.FC<InputWithValidationProps> = (props: InputWithValidationProps) => {
  const { Inputs, ColorPalette } = useTheme()

  return (
    <View>
      <ThemedText
        variant={'labelTitle'}
        style={[{ marginBottom: 8 }, props.labelProps]}
        testID={testIdWithKey(`${props.id}-label`)}
      >
        {props.label}
      </ThemedText>

      <TextInput
        style={[
          {
            ...Inputs.textInput,
            borderColor: props.error ? ColorPalette.semantic.error : Inputs.textInput.borderColor,
          },
          props.inputProps,
        ]}
        value={props.value}
        onChange={(e) => {
          props.onChange(e.nativeEvent.text)
        }}
        testID={testIdWithKey(`${props.id}-input`)}
      />

      {props.error ? (
        <ThemedText
          style={[
            {
              marginTop: 4,
              color: ColorPalette.semantic.error,
              fontSize: 12,
            },
            props.errorProps,
          ]}
          testID={testIdWithKey(`${props.id}-error`)}
        >
          {props.error}
        </ThemedText>
      ) : null}

      {props.subtext && !props.error ? (
        <ThemedText
          style={[{ marginTop: 8 }, props.subtextProps]}
          variant={'labelSubtitle'}
          testID={testIdWithKey(`${props.id}-subtext`)}
        >
          {props.subtext}
        </ThemedText>
      ) : null}
    </View>
  )
}
