import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { createHeaderRightMoreButton, HeaderRightMoreButton } from './HeaderRightMoreButton'

describe('HeaderRightMoreButton Component', () => {
  const defaultProps = {
    accessibilityLabel: 'More options',
    testID: 'HeaderRightMoreButton',
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <HeaderRightMoreButton {...defaultProps} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('createHeaderRightMoreButton renders correctly', () => {
    const tree = render(<BasicAppContext>{createHeaderRightMoreButton(defaultProps)}</BasicAppContext>)

    expect(tree).toMatchSnapshot()
  })

  test('invokes onPress when pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <HeaderRightMoreButton {...defaultProps} />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId('HeaderRightMoreButton'))
    expect(defaultProps.onPress).toHaveBeenCalledTimes(1)
  })
})
