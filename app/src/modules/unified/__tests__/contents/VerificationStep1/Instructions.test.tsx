import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import InstructionsContent from '../../../contents/VerificationStep1/Instructions'
import { testIdWithKey } from '@hyperledger/aries-bifold-core'

describe('InstructionsContent Component', () => {
  const goToScan = jest.fn()
  const goToManualSerial = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(<InstructionsContent goToScan={goToScan} goToManualSerial={goToManualSerial} />)
    expect(tree).toMatchSnapshot()
  })

  test('ScanBarcode test ID is present and press handler works', () => {
    const { getByTestId } = render(<InstructionsContent goToScan={goToScan} goToManualSerial={goToManualSerial} />)

    const continueButton = getByTestId(testIdWithKey('ScanBarcode'))
    expect(continueButton).toBeDefined()
    fireEvent(continueButton, 'press')
    expect(goToScan).toHaveBeenCalledTimes(1)
  })

  test('EnterManually test ID is present and press handler works', () => {
    const { getByTestId } = render(<InstructionsContent goToScan={goToScan} goToManualSerial={goToManualSerial} />)

    const continueButton = getByTestId(testIdWithKey('EnterManually'))
    expect(continueButton).toBeDefined()
    fireEvent(continueButton, 'press')
    expect(goToManualSerial).toHaveBeenCalledTimes(1)
  })
})
