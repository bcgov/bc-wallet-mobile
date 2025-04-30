import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import InstructionsContent from '../../../contents/EvidenceCollectionStep/Instructions'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '../../../../../../__mocks__/helpers/app'

describe('InstructionsContent Component', () => {
  const goToScan = jest.fn()
  const goToManualSerial = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <InstructionsContent goToScan={goToScan} goToManualSerial={goToManualSerial} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  test('ScanBarcode test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <InstructionsContent goToScan={goToScan} goToManualSerial={goToManualSerial} />
      </BasicAppContext>
    )
    const continueButton = getByTestId(testIdWithKey('ScanBarcode'))
    expect(continueButton).toBeDefined()
    fireEvent(continueButton, 'press')
    expect(goToScan).toHaveBeenCalledTimes(1)
  })

  test('EnterManually test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <InstructionsContent goToScan={goToScan} goToManualSerial={goToManualSerial} />
      </BasicAppContext>
    )
    const continueButton = getByTestId(testIdWithKey('EnterManually'))
    expect(continueButton).toBeDefined()
    fireEvent(continueButton, 'press')
    expect(goToManualSerial).toHaveBeenCalledTimes(1)
  })
})
