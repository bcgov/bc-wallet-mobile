import { testIdWithKey, StoreProvider } from '@hyperledger/aries-bifold-core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { initialState, reducer } from '../../../../../store'
import ManualSerialContent from '../../../contents/EvidenceCollectionStep/ManualSerial'

describe('ManualSerialContent Component', () => {
  const goToBirthdate = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <ManualSerialContent goToBirthdate={goToBirthdate} />
      </StoreProvider>
    )
    expect(tree).toMatchSnapshot()
  })

  test('Continue test ID is present and goToBirthdate isnt called when there is no input entered', () => {
    const { getByTestId } = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <ManualSerialContent goToBirthdate={goToBirthdate} />
      </StoreProvider>
    )

    const continueButton = getByTestId(testIdWithKey('Continue'))
    expect(continueButton).toBeDefined()
    fireEvent(continueButton, 'press')
    expect(goToBirthdate).not.toHaveBeenCalled()
  })

  test('Input test ID and Continue test ID is present and goToBirthdate is called when there is input entered', () => {
    const { getByTestId } = render(
      <StoreProvider initialState={initialState} reducer={reducer}>
        <ManualSerialContent goToBirthdate={goToBirthdate} />
      </StoreProvider>
    )

    const serialInput = getByTestId(testIdWithKey('SerialInput'))
    fireEvent.changeText(serialInput, 'A123')
    const continueButton = getByTestId(testIdWithKey('Continue'))
    expect(continueButton).toBeDefined()
    fireEvent(continueButton, 'press')
    expect(goToBirthdate).toHaveBeenCalledTimes(1)
  })
})
