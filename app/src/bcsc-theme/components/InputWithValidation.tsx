import { testIdWithKey, useTheme } from '@bifold/core'
import { ThemedText } from '@bifold/core/src/components/texts/ThemedText'
import { StyleProp, TextInput, TextStyle, View } from 'react-native'

// NOTE (MD): This is a first pass at this component, I assume eventually we will need to modify this to
// accept number inputs as well.

type InputWithValidationProps = {
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
 * A stateless input component with, labels, subtext and validation enabled.
 *
 * @param {InputWithValidationProps} props - Input props
 * @returns {*} {JSX.Element}
 */
export const InputWithValidation: React.FC<InputWithValidationProps> = (props: InputWithValidationProps) => {
  const { Inputs, ColorPalette } = useTheme()

  return (
    <View>
      <ThemedText variant={'labelTitle'} style={[{ marginBottom: 8 }, props.labelProps]}>
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
        accessibilityLabel={props.label}
        testID={testIdWithKey(props.label)}
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
        >
          {props.error}
        </ThemedText>
      ) : null}

      {props.subtext && !props.error ? (
        <ThemedText style={[{ marginTop: 8 }, props.errorProps]} variant={'labelSubtitle'}>
          {props.subtext}
        </ThemedText>
      ) : null}
    </View>
  )
}
