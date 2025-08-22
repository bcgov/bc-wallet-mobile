import { ThemedText } from '@bifold/core/src/components/texts/ThemedText'
import { ColorPalette, Inputs } from '@bifold/core/src/theme'
import { StyleProp, TextInput, TextStyle, View } from 'react-native'

// TODO (MD): Support number inputs and other types of inputs
// TODO (MD): Add testIds and accessability labels

type InputWIthValidationProps = {
  value: string
  onChange: (value: string) => void
  inputLabel: string
  inputLabelProps?: StyleProp<TextStyle>
  inputSubtext?: string
  inputSubtextProps?: StyleProp<TextStyle>
  inputValidationError?: string
  inputValidationErrorProps?: StyleProp<TextStyle>
  inputProps?: StyleProp<TextStyle>
}

export const InputWithValidation: React.FC<InputWIthValidationProps> = (props: InputWIthValidationProps) => {
  return (
    <View>
      <ThemedText variant={'labelTitle'} style={[{ marginBottom: 8 }, props.inputLabelProps]}>
        {props.inputLabel}
      </ThemedText>
      <TextInput
        style={[
          {
            ...Inputs.textInput,
            borderColor: props.inputValidationError ? ColorPalette.semantic.error : Inputs.textInput.borderColor,
          },
          props.inputProps,
        ]}
        value={props.value}
        onChange={(e) => {
          props.onChange(e.nativeEvent.text)
        }}
      />

      {props.inputValidationError ? (
        <ThemedText
          style={[
            {
              marginTop: 4,
              color: ColorPalette.semantic.error,
              fontSize: 12,
            },
            props.inputValidationErrorProps,
          ]}
        >
          {props.inputValidationError}
        </ThemedText>
      ) : null}

      {props.inputSubtext ? (
        <ThemedText style={{ marginTop: 8 }} variant={'labelSubtitle'}>
          {props.inputSubtext}
        </ThemedText>
      ) : null}
    </View>
  )
}
