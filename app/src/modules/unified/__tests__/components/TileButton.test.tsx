import { testIdWithKey } from '@hyperledger/aries-bifold-core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import TileButton from '../../components/TileButton'

describe('TileButton Component', () => {
  const onPress = jest.fn()
  const actionText = 'Action text'
  const description =
    'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quasi et consectetur iusto error aliquam'
  const testIDKey = 'TileButton'
  const accessibilityLabel = 'Card'

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <TileButton
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
      <TileButton
        onPress={onPress}
        actionText={actionText}
        description={description}
        testIDKey={testIDKey}
        accessibilityLabel={accessibilityLabel}
      />
    )

    const tileButton = getByTestId(testIdWithKey(testIDKey))
    expect(tileButton).toBeDefined()
    fireEvent(tileButton, 'press')
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
