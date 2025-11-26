import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/@react-navigation/native'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { BCSCScreens } from '../../src/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '../../src/constants'
import TransferQRInformationScreen from '../../src/bcsc-theme/features/account-transfer/TransferQRInformationScreen'
import { act } from 'react-test-renderer'

describe('TransferQRInformationScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  describe('Render tests', () => {

    it('render matches snapshot', () => {
      const tree = render(
        <BasicAppContext>
          <TransferQRInformationScreen />
        </BasicAppContext>
      )
      expect(tree).toMatchSnapshot()
    })
  })

  describe('Navigation tests', () => {

    it('Get QR Code navigates', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <TransferQRInformationScreen />
        </BasicAppContext>
      )
      const getQRCodeButton = getByTestId('GetQRCodeButton')
      act(() => {
        fireEvent.press(getQRCodeButton)
      })
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountQRDisplay)
    })

    it('Help centre button navigates', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <TransferQRInformationScreen />
        </BasicAppContext>
      )
      const learnMoreButton = getByTestId('LearnMoreButton')
      act(() => {
        fireEvent.press(learnMoreButton)
      })
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainWebView, {
        url: HelpCentreUrl.QUICK_SETUP_OF_ADDITIONAL_DEVICES,
        title: 'HelpCentre.Title',
      })
    })
  })
})
