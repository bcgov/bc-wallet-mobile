import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { CardButton } from './CardButton'

describe('CardButton Component', () => {
  const onPress = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders correctly with title only', () => {
    const tree = render(
      <BasicAppContext>
        <CardButton title="Card Title" onPress={onPress} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('renders correctly with subtext and end icon', () => {
    const tree = render(
      <BasicAppContext>
        <CardButton title="Card Title" subtext="This is a subtext" endIcon="arrow-forward" onPress={onPress} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('renders correctly when disabled', () => {
    const tree = render(
      <BasicAppContext>
        <CardButton title="Card Title" subtext="Disabled card" onPress={onPress} disabled />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('calls onPress when pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <CardButton title="Card Title" onPress={onPress} />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('CardButton-Card Title')))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('does not call onPress when disabled', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <CardButton title="Card Title" onPress={onPress} disabled />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('CardButton-Card Title')))
    expect(onPress).not.toHaveBeenCalled()
  })
})
