import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import NotificationActionCard from './NotificationActionCard'

describe('NotificationActionCard', () => {
  const baseProps = {
    title: 'Action title',
    description: 'Action description',
    buttonTitle: 'Take action',
    onPress: jest.fn(),
  }

  const renderCard = (props = {}) =>
    render(
      <BasicAppContext>
        <NotificationActionCard {...baseProps} {...props} />
      </BasicAppContext>
    )

  beforeEach(() => jest.clearAllMocks())

  it('renders the title and description', () => {
    const { getByTestId } = renderCard()

    expect(getByTestId(testIdWithKey('HeaderText'))).toBeTruthy()
    expect(getByTestId(testIdWithKey('BodyText'))).toBeTruthy()
  })

  it('calls onPress when the action button is pressed', () => {
    const { getByTestId } = renderCard()

    fireEvent.press(getByTestId(testIdWithKey('ViewNotification')))

    expect(baseProps.onPress).toHaveBeenCalledTimes(1)
  })

  it('shows the dismiss button when onClose is provided', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderCard({ onClose })

    expect(getByTestId(testIdWithKey('DismissNotification'))).toBeTruthy()
  })

  it('does not show the dismiss button when onClose is omitted', () => {
    const { queryByTestId } = renderCard()

    expect(queryByTestId(testIdWithKey('DismissNotification'))).toBeNull()
  })

  it('calls onClose when the dismiss button is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderCard({ onClose })

    fireEvent.press(getByTestId(testIdWithKey('DismissNotification')))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders correctly', () => {
    const tree = renderCard()

    expect(tree).toMatchSnapshot()
  })
})
