import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { HelpCentreUrl } from '../../../../constants'
import { BCSCScreens } from '../../../types/navigators'
import TransferQRInformationScreen from './TransferQRInformationScreen'

describe('TransferQRInformationScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
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
