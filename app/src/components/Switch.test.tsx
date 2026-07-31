import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Switch } from './Switch'

describe('Switch Component', () => {
  const defaultProps = {
    value: false,
    onValueChange: jest.fn(),
    accessibilityLabel: 'Test switch',
    testID: 'test-switch',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders correctly when off', () => {
    const tree = render(
      <BasicAppContext>
        <Switch {...defaultProps} />
      </BasicAppContext>
    )

    expect(tree.toJSON()).toMatchSnapshot()
  })

  test('renders correctly when on', () => {
    const tree = render(
      <BasicAppContext>
        <Switch {...defaultProps} value={true} />
      </BasicAppContext>
    )

    expect(tree.toJSON()).toMatchSnapshot()
  })

  test('calls onValueChange with the inverted value when pressed', () => {
    const onValueChange = jest.fn()
    const { getByTestId } = render(
      <BasicAppContext>
        <Switch {...defaultProps} onValueChange={onValueChange} />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId('test-switch'))

    expect(onValueChange).toHaveBeenCalledWith(true)
  })

  test('does not call onValueChange when disabled', () => {
    const onValueChange = jest.fn()
    const { getByTestId } = render(
      <BasicAppContext>
        <Switch {...defaultProps} onValueChange={onValueChange} disabled />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId('test-switch'))

    expect(onValueChange).not.toHaveBeenCalled()
  })

  test('exposes switch role and checked state', () => {
    const { getByRole } = render(
      <BasicAppContext>
        <Switch {...defaultProps} value={true} />
      </BasicAppContext>
    )

    const control = getByRole('switch')
    expect(control.props.accessibilityState.checked).toBe(true)
    expect(control.props.accessibilityLabel).toBe('Test switch')
  })
})
