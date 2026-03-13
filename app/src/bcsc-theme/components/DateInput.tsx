import { useCallback, useEffect, useState } from 'react'
import { LayoutChangeEvent } from 'react-native'
import { InputWithValidation } from './InputWithValidation'

interface DateInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onLayout?: (e: LayoutChangeEvent) => void
  error?: string
  subtext?: string
}

const DATE_TEMPLATE = 'YYYY/MM/DD'
// Expecting 10 characters in the formatted date (8 digits + 2 '/')
const DATE_DIGIT_POSITIONS = [0, 1, 2, 3, 5, 6, 8, 9]

const getDigits = (text: string): string =>
  text
    .split('')
    .filter((character) => character >= '0' && character <= '9')
    .slice(0, 8)
    .join('')

// Builds the date to display
const dateToDisplay = (date: string): string => {
  const digits = getDigits(date)

  const displayCharacters = DATE_TEMPLATE.split('')
  digits.split('').forEach((digit, index) => {
    const displayPosition = DATE_DIGIT_POSITIONS[index]
    if (displayPosition !== undefined) {
      displayCharacters[displayPosition] = digit
    }
  })

  return displayCharacters.join('')
}

// Placing cursor at the next available digit in the input
// for example the cursor | : 199|Y/MM/DD
// so now when the user inputs another digit, it becomes 1999|/MM/DD
const nextCursorPosition = (date: string): number => {
  const digitCount = getDigits(date).length
  const nextPosition = DATE_DIGIT_POSITIONS[digitCount]

  if (nextPosition === undefined) {
    return DATE_TEMPLATE.length
  }

  return nextPosition
}

// Creates a selection range of 1 character so the user replaces each character as they type
// this fixes a flicker if the cursor is simply positioned in the input
// for example the cursor | : 199|Y|/MM/DD
// so now when the user inputs another digit, it becomes 1999/|M|M/DD
const getSelectionRange = (displayValue: string, cursorPosition: number) => {
  if (!displayValue || cursorPosition >= DATE_TEMPLATE.length) {
    return { start: cursorPosition, end: cursorPosition }
  }

  const nextCharacter = DATE_TEMPLATE[cursorPosition]
  if (nextCharacter === '/') {
    return { start: cursorPosition + 1, end: cursorPosition + 1 }
  }

  return { start: cursorPosition, end: cursorPosition + 1 }
}

const DateInput = ({ id, label, value, onChange, error, subtext, onLayout }: DateInputProps) => {
  // Display date and actual value are held separately to allow date formatting: 199Y/MM/DD
  // while also allowing the user to delete digits without having to remove the extra format characters
  const [displayValue, setDisplayValue] = useState(dateToDisplay(value))
  const [cursorPosition, setCursorPosition] = useState(nextCursorPosition(value))

  useEffect(() => {
    const nextDisplay = dateToDisplay(value)
    setDisplayValue(nextDisplay)
    setCursorPosition(nextCursorPosition(value))
  }, [value])

  // Masks the input as the user types so they don't have to worry about date format
  const maskDate = useCallback(
    (text: string) => {
      const previousDigits = getDigits(value)
      const incomingDigits = getDigits(text)
      const displayValue = dateToDisplay(value)
      // New text is smaller than old display, we must be deleting something
      const isDeleting = text.length < displayValue.length

      let nextDigits = incomingDigits
      if (isDeleting && incomingDigits === previousDigits && previousDigits.length > 0) {
        nextDigits = previousDigits.slice(0, -1)
      }

      if (nextDigits.length <= 4) {
        return nextDigits
      }
      // Once the year is auto filled in
      if (nextDigits.length <= 6) {
        return `${nextDigits.slice(0, 4)}/${nextDigits.slice(4)}`
      }
      // While not expressly needed, keeping the / at this point makes validating the date much easier
      return `${nextDigits.slice(0, 4)}/${nextDigits.slice(4, 6)}/${nextDigits.slice(6)}`
    },
    [value]
  )

  const handleChangeText = useCallback(
    (rawText: string) => {
      const maskedValue = maskDate(rawText) // canonical value for parent
      const nextDisplay = dateToDisplay(maskedValue)

      setDisplayValue(nextDisplay)
      setCursorPosition(nextCursorPosition(maskedValue))
      onChange(maskedValue)
    },
    [onChange, maskDate]
  )

  const selection = getSelectionRange(displayValue, cursorPosition)

  return (
    <InputWithValidation
      id={id}
      label={label}
      value={displayValue}
      onChangeText={handleChangeText}
      error={error}
      subtext={subtext}
      onLayout={onLayout}
      textInputProps={{
        placeholder: DATE_TEMPLATE,
        placeholderTextColor: '#000000', // can be moved to theme if needed
        keyboardType: 'number-pad', // user will only be entering numbers
        selection,
      }}
    />
  )
}

export default DateInput
