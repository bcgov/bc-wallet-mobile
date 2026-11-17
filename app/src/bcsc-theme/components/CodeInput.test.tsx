import { PAIRING_CODE_LENGTH } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import CodeInput from './CodeInput'

describe('CodeInput', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('truncates input to the cell count when sanitized length exceeds it', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <CodeInput value="" onChange={mockOnChange} textInputProps={{ testID: testIdWithKey('CodeInput') }} />
      </BasicAppContext>
    )

    const input = getByTestId(testIdWithKey('CodeInput'))

    fireEvent.changeText(input, '1 2 3 4 5 6 7')

    expect(mockOnChange).toHaveBeenCalledWith('123456')
  })

  it('keeps the fixed-size cells and the separator at 1x font scale, like PINInput', () => {
    const { UNSAFE_getAllByType } = render(
      <BasicAppContext>
        <CodeInput value="123" onChange={mockOnChange} separator />
      </BasicAppContext>
    )

    const fixedSizeTexts = UNSAFE_getAllByType(Text).filter((text) => text.props.maxFontSizeMultiplier === 1)

    expect(fixedSizeTexts).toHaveLength(PAIRING_CODE_LENGTH + 1)
  })
})
