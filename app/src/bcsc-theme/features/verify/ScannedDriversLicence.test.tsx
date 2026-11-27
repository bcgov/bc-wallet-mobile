import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import ScannedDriversLicence from './ScannedDriversLicence'

const mockHandleContinueWithLicence = jest.fn()
const mockHandleScanServicesCard = jest.fn()
jest.mock('./useScannedDriversLicenceViewModel', () => ({
  useScannedDriversLicenceViewModel: () => ({
    handleContinueWithLicence: mockHandleContinueWithLicence,
    handleScanServicesCard: mockHandleScanServicesCard,
  }),
}))

describe('ScannedDriversLicence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <ScannedDriversLicence navigation={{} as never} />
      </BasicAppContext>
    )

  it('renders the copy and both buttons', () => {
    const screen = renderScreen()

    expect(screen.getByText('BCSC.ScannedDriversLicence.Heading')).toBeTruthy()
    expect(screen.getByText('BCSC.ScannedDriversLicence.Description')).toBeTruthy()
    expect(screen.getByTestId(testIdWithKey(TestIds.verify.scannedDriversLicence.continueWithLicence))).toBeTruthy()
    expect(screen.getByTestId(testIdWithKey(TestIds.verify.scannedDriversLicence.scanBcsc))).toBeTruthy()
  })

  it('continues with the licence', () => {
    const screen = renderScreen()

    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.verify.scannedDriversLicence.continueWithLicence)))

    expect(mockHandleContinueWithLicence).toHaveBeenCalledTimes(1)
    expect(mockHandleScanServicesCard).not.toHaveBeenCalled()
  })

  it('goes back to scan a BC Services Card', () => {
    const screen = renderScreen()

    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.verify.scannedDriversLicence.scanBcsc)))

    expect(mockHandleScanServicesCard).toHaveBeenCalledTimes(1)
    expect(mockHandleContinueWithLicence).not.toHaveBeenCalled()
  })
})
