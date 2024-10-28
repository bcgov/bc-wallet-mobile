import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import CardButton from '../../components/CardButton'
import { testIdWithKey } from '@hyperledger/aries-bifold-core'

describe('CardButton Component', () => {
  const onPress = jest.fn()
  const actionText = 'Action text'
  const description =
    'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quasi et consectetur iusto error aliquam'
  const testIDKey = 'CardButton'
  const accessibilityLabel = 'Card'

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <CardButton
        onPress={onPress}
        actionText={actionText}
        description={description}
        testIDKey={testIDKey}
        accessibilityLabel={accessibilityLabel}
      />
    )
    expect(tree).toMatchSnapshot()
  })

  test('test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <CardButton
        onPress={onPress}
        actionText={actionText}
        description={description}
        testIDKey={testIDKey}
        accessibilityLabel={accessibilityLabel}
      />
    )

    const cardButton = getByTestId(testIdWithKey(testIDKey))
    expect(cardButton).toBeDefined()
    fireEvent(cardButton, 'press')
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
