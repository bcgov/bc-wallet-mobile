import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../../../../../__mocks__/helpers/app'
import ChooseContent from '../../../contents/EvidenceCollectionStep/Choose'

describe('ChooseContent Component', () => {
  const goToInstructions = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ChooseContent goToInstructions={goToInstructions} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  test('CombinedCard test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <ChooseContent goToInstructions={goToInstructions} />
      </BasicAppContext>
    )

    const combinedCardTileButton = getByTestId(testIdWithKey('CombinedCard'))
    expect(combinedCardTileButton).toBeDefined()
    fireEvent(combinedCardTileButton, 'press')
    expect(goToInstructions).toHaveBeenCalledTimes(1)
  })
})
