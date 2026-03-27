import { useTheme } from '@bifold/core'
import { useCallback, useState } from 'react'
import { LayoutChangeEvent, Platform, Text } from 'react-native'
import { InputWithValidation } from './InputWithValidation'

interface DateInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onLayout?: (e: LayoutChangeEvent) => void
  error?: string | null
  subtext?: string
}

const DATE_TEMPLATE = 'YYYY/MM/DD'

const getDigits = (text: string): string =>
  text
    .split('')
    .filter((character) => character >= '0' && character <= '9')
    .slice(0, 8)
    .join('')

// Progressively formats digits with slashes as the user types
// e.g. "1990" → "1990/", "199001" → "1990/01/", "19900115" → "1990/01/15"
const formatDigits = (digits: string): string => {
  if (digits.length < 4) {
    return digits
  }
  if (digits.length === 4) {
    return `${digits}/`
  }
  if (digits.length < 6) {
    return `${digits.slice(0, 4)}/${digits.slice(4)}`
  }
  if (digits.length === 6) {
    return `${digits.slice(0, 4)}/${digits.slice(4)}/`
  }
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`
}

const DateInput = ({ id, label, value, onChange, error, subtext, onLayout }: DateInputProps) => {
  const { Inputs, ColorPalette } = useTheme()
  const [displayValue, setDisplayValue] = useState(formatDigits(getDigits(value)))

  const remainingTemplate = DATE_TEMPLATE.slice(displayValue.length)

  const templateOverlay = (
    <Text
      style={{
        marginBottom: Platform.OS === 'ios' ? Inputs.textInput.margin : 0,
        fontSize: Inputs.textInput.fontSize,
        fontFamily: Inputs.textInput.fontFamily,
      }}
    >
      <Text style={{ color: 'transparent' }}>{displayValue}</Text>
      <Text style={{ color: ColorPalette.grayscale.mediumGrey }}>{remainingTemplate}</Text>
    </Text>
  )

  const handleChangeText = useCallback(
    (rawText: string) => {
      const previousDigits = getDigits(value)
      const incomingDigits = getDigits(rawText)
      const isDeleting = rawText.length < formatDigits(previousDigits).length

      let nextDigits = incomingDigits
      if (isDeleting && incomingDigits === previousDigits && previousDigits.length > 0) {
        nextDigits = previousDigits.slice(0, -1)
      }

      const formatted = formatDigits(nextDigits)
      setDisplayValue(formatted)
      onChange(formatted)
    },
    [onChange, value]
  )

  return (
    <InputWithValidation
      id={id}
      label={label}
      value={displayValue}
      onChangeText={handleChangeText}
      error={error}
      subtext={subtext}
      onLayout={onLayout}
      inputOverlay={templateOverlay}
      textInputProps={{
        keyboardType: 'number-pad',
      }}
    />
  )
}

export default DateInput
