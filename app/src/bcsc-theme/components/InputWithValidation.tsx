import { useTheme } from '@bifold/core'
import { ThemedText } from '@bifold/core/src/components/texts/ThemedText'
import { StyleProp, TextInput, TextStyle, View } from 'react-native'

// TODO (MD): Support number inputs and other types of inputs
// TODO (MD): Add testIds and accessability labels

type InputWIthValidationProps = {
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

export const InputWithValidation: React.FC<InputWIthValidationProps> = (props: InputWIthValidationProps) => {
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

      {props.subtext ? (
        <ThemedText style={[{ marginTop: 8 }, props.errorProps]} variant={'labelSubtitle'}>
          {props.subtext}
        </ThemedText>
      ) : null}
    </View>
  )
}
