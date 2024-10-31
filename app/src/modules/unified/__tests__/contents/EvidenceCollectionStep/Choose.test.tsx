import { testIdWithKey, StoreProvider } from '@hyperledger/aries-bifold-core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { initialState, reducer } from '../../../../../store'
import ChooseContent from '../../../contents/EvidenceCollectionStep/Choose'

describe('ChooseContent Component', () => {
  const goToInstructions = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <ChooseContent goToInstructions={goToInstructions} />
      </StoreProvider>
    )
    expect(tree).toMatchSnapshot()
  })

  test('CombinedCard test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <ChooseContent goToInstructions={goToInstructions} />
      </StoreProvider>
    )

    const combinedCardTileButton = getByTestId(testIdWithKey('CombinedCard'))
    expect(combinedCardTileButton).toBeDefined()
    fireEvent(combinedCardTileButton, 'press')
    expect(goToInstructions).toHaveBeenCalledTimes(1)
  })
})
