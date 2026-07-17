import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import PairingCodeCard from './PairingCodeCard'

describe('PairingCodeCard', () => {
  const renderCard = (onPress: () => void = jest.fn()) =>
    render(
      <BasicAppContext>
        <PairingCodeCard
          title="Log in from another device"
          description="Log in to a service using a pairing code"
          onPress={onPress}
          testID="pairing-card"
        />
      </BasicAppContext>
    )

  it('renders the title and description', () => {
    const { getByText } = renderCard()

    expect(getByText('Log in from another device')).toBeTruthy()
    expect(getByText('Log in to a service using a pairing code')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = renderCard(onPress)

    fireEvent.press(getByTestId('pairing-card'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
