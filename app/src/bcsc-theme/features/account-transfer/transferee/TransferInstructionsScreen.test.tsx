import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCScreens } from '../../../types/navigators'
import TransferInstructionsScreen from './TransferInstructionsScreen'

describe('TransferInstructionsScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <TransferInstructionsScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('navigates to QR scan screen when Scan QR Code button is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <TransferInstructionsScreen />
      </BasicAppContext>
    )

    const scanButton = getByTestId(testIdWithKey('ScanQRCode'))
    act(() => {
      fireEvent.press(scanButton)
    })
    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountQRScan)
  })
})
